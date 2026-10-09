// ---------------------------------------------------------------
// Product delete cascade ("foreign key" behaviour for a Mongo store that has
// none).
//
// Nothing in the schema is an enforced reference: only Review.product is a real
// ObjectId ref, everything else holds the product id as a plain String or hides
// it inside a JSON block. So a bare `ProductModel.deleteOne` leaves ghosts in
// carts, wishlists, reviews and landing pages, and never frees the image files.
//
// What happens to each dependent when a product is deleted:
//   reviews            deleted, together with their photo/video files
//   carts, wishlists   the lines are pulled; cart `totalAmount` is recomputed
//   landing pages      orderForm blocks pointing at it are blanked, page stays
//                      published (the form already degrades to "offer isn't
//                      available"); the page's Next cache tag is busted
//   order lines        KEPT. They are accounting records (revenue, profit and
//                      COGS aggregate from them). Only `productImage` is blanked
//                      when its file is really removed from disk
//   stock ledger, checkout leads, audit log   KEPT (lead images blanked like orders)
//
// MongoDB runs standalone here, so there are no transactions. The product is
// therefore deleted FIRST: a failure half-way can never destroy data that
// belongs to a product that still exists, and every later step is idempotent and
// best-effort (a failure is logged and reported in `warnings`, never thrown, and
// `scripts/sweep-orphans.js` mops up whatever a failed step left behind).
//
// The helpers below are exported on purpose: the cart/wishlist GET self-heal and
// the orphan sweep script reuse them, so there is exactly one implementation of
// "remove a product from carts" (and of the cart total formula).
// ---------------------------------------------------------------
import mongoose from 'mongoose';
import ProductModel from '../models/product.model.js';
import ReviewModel from '../models/review.model.js';
import CartModel from '../models/cart.model.js';
import WishlistModel from '../models/wishlist.model.js';
import OrderModel from '../models/order.model.js';
import CheckoutLeadModel from '../models/checkoutLead.model.js';
import { LandingPage } from '../models/landingPage.model.js';
import { collectProductImageUrls, deleteUploadFiles } from '../lib/uploadFiles.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

// Strict 24-hex check. mongoose.isValidObjectId also accepts any 12-character
// string, which is not what a stored product id ever looks like.
export const isObjectIdString = (value) => typeof value === 'string' && OBJECT_ID_RE.test(value);

const chunk = (list, size) => {
    const parts = [];
    for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
    return parts;
};

// Distinct, string-typed ids. null/undefined become '' (a cart line with no
// product id is just as dead as one whose product is gone).
const toIdList = (ids) => [...new Set((Array.isArray(ids) ? ids : [ids]).map((v) => (v == null ? '' : String(v))))];

// Cart lines created before productId was mandatory hold null, and `$in: ['']`
// does not match null, so add it explicitly.
export const productIdMatchList = (ids) => {
    const list = toIdList(ids);
    return list.includes('') ? [...list, null] : list;
};

/**
 * Which of these product ids no longer resolve to a Product document?
 * Anything that is not a 24-hex id (empty, null, legacy junk) counts as missing.
 * Returns a Set of the ids exactly as they were passed in, so callers can feed
 * it straight back into a `$pull`/`$in` that must match the stored spelling.
 */
export async function findMissingProductIds(ids) {
    const wanted = toIdList(ids);
    const missing = new Set(wanted.filter((v) => !isObjectIdString(v)));
    const valid = wanted.filter(isObjectIdString);

    for (const part of chunk(valid, 1000)) {
        const found = await ProductModel.find({ _id: { $in: part } }).select('_id').lean();
        const live = new Set(found.map((p) => String(p._id)));
        // A hex id may be stored in upper case; ObjectId#toString is lower case.
        for (const id of part) if (!live.has(id.toLowerCase())) missing.add(id);
    }
    return missing;
}

// Cart total, evaluated by Mongo so the pull and the new total are ONE atomic
// per-document write (a read-modify-write from Node could clobber a concurrent
// add-to-cart). It mirrors the formula in routes/clientCart.route.js exactly:
//   sum( (price - price * discountPercent / 100) * quantity )
const CART_TOTAL_EXPR = {
    $reduce: {
        input: '$items',
        initialValue: 0,
        in: {
            $add: [
                '$$value',
                {
                    $multiply: [
                        {
                            $subtract: [
                                { $ifNull: ['$$this.price', 0] },
                                {
                                    $divide: [
                                        { $multiply: [{ $ifNull: ['$$this.price', 0] }, { $ifNull: ['$$this.discountPercent', 0] }] },
                                        100,
                                    ],
                                },
                            ],
                        },
                        { $ifNull: ['$$this.quantity', 0] },
                    ],
                },
            ],
        },
    },
};

const cartPullPipeline = (ids) => [
    {
        $set: {
            items: {
                $filter: {
                    input: { $ifNull: ['$items', []] },
                    as: 'line',
                    cond: {
                        $not: [{ $in: [{ $toString: { $ifNull: ['$$line.productId', ''] } }, { $literal: ids }] }],
                    },
                },
            },
        },
    },
    { $set: { totalAmount: CART_TOTAL_EXPR } },
];

/**
 * Pull every cart line for these products and recompute the stored
 * `totalAmount` (checkout trusts it as the order subtotal and for the
 * free-delivery check, so a stale total would overcharge the next order).
 * Pass `guestId` to heal a single shopper's cart. Returns carts modified.
 */
export async function pruneCartsByProduct(productIds, { guestId } = {}) {
    const ids = toIdList(productIds);
    if (ids.length === 0) return 0;
    const filter = { 'items.productId': { $in: productIdMatchList(ids) } };
    if (guestId) filter.guestId = guestId;
    const res = await CartModel.updateMany(filter, cartPullPipeline(ids));
    return res.modifiedCount || 0;
}

/** Pull these products out of wishlists (no derived total to recompute). Returns wishlists modified. */
export async function pruneWishlistsByProduct(productIds, { guestId } = {}) {
    const ids = toIdList(productIds);
    if (ids.length === 0) return 0;
    const filter = { 'items.productId': { $in: ids } };
    if (guestId) filter.guestId = guestId;
    const res = await WishlistModel.updateMany(filter, { $pull: { items: { productId: { $in: ids } } } });
    return res.modifiedCount || 0;
}

/**
 * Bust Next's data cache for the given tags (e.g. `landing:<slug>`).
 * The tags are invalidated by the storefront's own /api/revalidate route, which
 * the admin panel calls from the browser after a save (frontend/src/lib/revalidate.js).
 * A backend-side change has no browser to do that, so call the same public,
 * tag-whitelisted route from here. Strictly best-effort: without FRONTEND_URL, or
 * if the call fails, the page's 60s ISR window still catches up.
 */
export async function revalidateFrontendTags(tags) {
    const base = (env.FRONTEND_URL || '').replace(/\/$/, '');
    const list = (tags || []).filter(Boolean);
    if (!base || list.length === 0) return false;
    try {
        const res = await fetch(`${base}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: list }),
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) {
            logger.warn({ status: res.status, tags: list }, 'Storefront cache revalidation was rejected');
            return false;
        }
        return true;
    } catch (err) {
        logger.warn({ err: err?.message, tags: list }, 'Storefront cache revalidation failed');
        return false;
    }
}

/**
 * Landing-page `orderForm` blocks keep the product they sell as a plain string
 * inside the Mixed `data` field. Blank those fields in place (the admin's
 * campaign copy is worth keeping, and the form already shows "This offer isn't
 * available right now" for an empty productId), leave the page published, and
 * bust each touched page's cache tag. Returns { cleared, slugs }.
 *
 * Uses the native collection on purpose: the filter and the arrayFilters reach
 * into a Mixed field, where Mongoose casting adds nothing but ways to throw.
 */
export async function clearLandingOrderForms(productIds) {
    const ids = toIdList(productIds).filter(Boolean);
    if (ids.length === 0) return { cleared: 0, slugs: [] };

    // The builder stores a string, but tolerate an ObjectId written by hand.
    const wanted = [...ids, ...ids.filter(isObjectIdString).map((v) => new mongoose.Types.ObjectId(v))];
    const col = LandingPage.collection;

    const pages = await col
        .find({ blocks: { $elemMatch: { type: 'orderForm', 'data.productId': { $in: wanted } } } }, { projection: { slug: 1 } })
        .toArray();
    if (pages.length === 0) return { cleared: 0, slugs: [] };

    await col.updateMany(
        { _id: { $in: pages.map((p) => p._id) } },
        {
            $set: {
                'blocks.$[b].data.productId': '',
                'blocks.$[b].data.productName': '',
                'blocks.$[b].data.weightIndex': 0,
                updatedAt: new Date(),
            },
        },
        { arrayFilters: [{ 'b.type': 'orderForm', 'b.data.productId': { $in: wanted } }] },
    );

    const slugs = pages.map((p) => p.slug).filter(Boolean);
    await revalidateFrontendTags(slugs.map((s) => `landing:${s}`));
    return { cleared: pages.length, slugs };
}

/**
 * Blank `productImage` on order lines (and abandoned-checkout leads) that point
 * at files which have just been removed from disk, so order history shows its
 * placeholder instead of a broken image. Matches on the URL, not the product id:
 * any line showing a deleted file is broken, whichever product it belongs to.
 * Price, quantity, cost and totals are never touched, and `updatedAt` is left
 * alone (`timestamps: false`) because this is cosmetic, not an order change.
 * Returns the number of ORDERS modified (Mongo reports documents, not lines).
 */
export async function blankOrderLineImages(urls) {
    const list = [...new Set((urls || []).filter((u) => typeof u === 'string' && u))];
    let orders = 0;

    for (const part of chunk(list, 200)) {
        const res = await OrderModel.updateMany(
            { 'items.productImage': { $in: part } },
            { $set: { 'items.$[line].productImage': '' } },
            { arrayFilters: [{ 'line.productImage': { $in: part } }], timestamps: false },
        );
        orders += res.modifiedCount || 0;

        // The lead has no product id to match on, only the image path. Kept as a
        // separate try so a lead problem can never hide the order result.
        try {
            await CheckoutLeadModel.updateMany(
                { 'items.productImage': { $in: part } },
                { $set: { 'items.$[line].productImage': '' } },
                { arrayFilters: [{ 'line.productImage': { $in: part } }], timestamps: false },
            );
        } catch (err) {
            logger.error({ err }, 'Failed to blank checkout lead images');
        }

        // Live carts and wishlists keep their own copy of the photo URL too (guest
        // carts never expire), and the cart is copied into new orders at checkout.
        // Without this a shopper would see a broken thumbnail after an image edit.
        for (const Model of [CartModel, WishlistModel]) {
            try {
                await Model.updateMany(
                    { 'items.productImage': { $in: part } },
                    { $set: { 'items.$[line].productImage': '' } },
                    { arrayFilters: [{ 'line.productImage': { $in: part } }], timestamps: false },
                );
            } catch (err) {
                logger.error({ err }, 'Failed to blank cart/wishlist images');
            }
        }
    }
    return orders;
}

const emptyFiles = () => ({ deleted: [], keptReferenced: [], skipped: [], failed: [] });

/**
 * Delete a product and everything that hangs off it. See the header comment for
 * the policy and for why the order of steps is what it is.
 *
 * @returns null when the product does not exist (also for a malformed id), else
 *   { product:{_id,firstName}, reviewsDeleted, cartsPruned, wishlistsPruned,
 *     landingPagesCleared, orderLinesBlanked, files:{deleted,keptReferenced,skipped,failed},
 *     warnings:[] }
 *   `orderLinesBlanked` counts orders touched (Mongo cannot count array elements
 *   from updateMany). `warnings` names any best-effort step that failed.
 */
export async function deleteProductCascade(productId, { req } = {}) {
    const id = String(productId ?? '');
    if (!isObjectIdString(id)) return null;

    // 1. Load the product and remember its images: after step 2 they are gone.
    const product = await ProductModel.findById(id).lean();
    if (!product) return null;
    const productUrls = collectProductImageUrls(product);

    // 2. The one step that is allowed to throw. Nothing else has been touched.
    const removed = await ProductModel.deleteOne({ _id: product._id });
    // Lost a race with another delete of the same product; that request owns the cascade.
    if (!removed.deletedCount) return null;

    const warnings = [];
    const safely = async (label, fn, fallback) => {
        try {
            return await fn();
        } catch (err) {
            warnings.push(label);
            logger.error({ err, productId: id }, `Product cascade step failed: ${label}`);
            return fallback;
        }
    };

    // 3. Reviews. Their media URLs are only trusted once the rows are really gone.
    const reviewMediaUrls = [];
    const reviewsDeleted = await safely('reviews', async () => {
        const reviews = await ReviewModel.find({ product: product._id }).select('media.url').lean();
        const urls = reviews.flatMap((r) => (r.media || []).map((m) => m?.url).filter(Boolean));
        const res = await ReviewModel.deleteMany({ product: product._id });
        reviewMediaUrls.push(...urls);
        return res.deletedCount || 0;
    }, 0);

    // 4. Carts, wishlists, landing pages.
    let cartsPruned = await safely('carts', () => pruneCartsByProduct([id]), 0);
    let wishlistsPruned = await safely('wishlists', () => pruneWishlistsByProduct([id]), 0);
    const landing = await safely('landing-pages', () => clearLandingOrderForms([id]), { cleared: 0, slugs: [] });

    // 5. Files, only after every document that could still reference them is
    //    gone. deleteUploadFiles re-checks every live owner, so a URL that some
    //    other record still uses is kept rather than deleted.
    const urlsToDelete = [...new Set([...productUrls, ...reviewMediaUrls])];
    const files = urlsToDelete.length
        ? await safely('files', () => deleteUploadFiles(urlsToDelete), emptyFiles())
        : emptyFiles();

    // 6. Order history keeps its lines but must not show a file that is gone.
    const orderLinesBlanked = files.deleted?.length
        ? await safely('order-images', () => blankOrderLineImages(files.deleted), 0)
        : 0;

    // 7. A browser tab that was open before the delete may have written between
    //    steps 2 and 4. Run the pulls once more; both are idempotent.
    cartsPruned += await safely('carts-recheck', () => pruneCartsByProduct([id]), 0);
    wishlistsPruned += await safely('wishlists-recheck', () => pruneWishlistsByProduct([id]), 0);

    const result = {
        product: { _id: product._id, firstName: product.firstName },
        reviewsDeleted,
        cartsPruned,
        wishlistsPruned,
        landingPagesCleared: landing.cleared,
        orderLinesBlanked,
        files,
        warnings,
    };

    // 8. Audit trail: the before-snapshot is the only record of what was deleted.
    try {
        req?.audit?.({
            action: 'product.delete',
            resource: 'Product',
            resourceId: id,
            message: `Deleted product "${product.firstName}"`,
            before: product,
            meta: { ...result, files: { deleted: files.deleted, keptReferenced: files.keptReferenced, failed: files.failed } },
        });
    } catch (err) {
        logger.error({ err, productId: id }, 'Failed to attach audit data for product delete');
    }

    return result;
}
