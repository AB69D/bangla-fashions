import { Router } from 'express';
import WishlistModel from '../models/wishlist.model.js';
import ProductModel from '../models/product.model.js';
import { findMissingProductIds, isObjectIdString, pruneWishlistsByProduct } from '../services/productCascade.js';
import { logger } from '../lib/logger.js';

// Public storefront wishlist. Like the cart, it is keyed by the anonymous
// `guest-id` header (no customer login required) and echoes that id back so a
// freshly-minted guest keeps the same identity for subsequent calls.
const clientWishlistRouter = Router();

const getGuestId = (req) => req.headers['guest-id'] || null;

const ensureWishlist = async (guestId) => {
    let wishlist = await WishlistModel.findOne({ guestId });
    if (!wishlist) wishlist = new WishlistModel({ guestId, items: [] });
    return wishlist;
};

// Self-heal on read: the product delete cascade pulls a product from every
// wishlist, but older ghosts (deleted before the cascade existed) and rows a
// stale tab re-added would still link to a /product/<id> page that 404s. Drop
// them and persist the removal. Never fail the fetch over it.
const healWishlist = async (wishlist, guestId) => {
    try {
        const missing = await findMissingProductIds(wishlist.items.map((it) => it.productId));
        if (missing.size === 0) return wishlist;
        await pruneWishlistsByProduct([...missing], { guestId });
        return (await WishlistModel.findOne({ guestId })) || wishlist;
    } catch (err) {
        logger.error({ err, guestId }, 'Wishlist self-heal failed');
        return wishlist;
    }
};

// GET /get — fetch (and lazily create) the guest's wishlist.
clientWishlistRouter.get('/get', async (req, res) => {
    try {
        let guestId = getGuestId(req);
        if (!guestId) guestId = `guest_${Date.now()}`;

        let wishlist = await ensureWishlist(guestId);
        if (wishlist.isNew) await wishlist.save();
        else if (wishlist.items.length > 0) wishlist = await healWishlist(wishlist, guestId);

        res.setHeader('guest-id', guestId);
        res.json({ message: 'Wishlist data', data: wishlist, error: false, success: true });
    } catch (error) {
        console.error('Wishlist get error:', error);
        res.status(500).json({ message: error.message, error: true, success: false });
    }
});

// POST /toggle — add the product if absent, remove it if present. Returns the
// updated wishlist plus `added` so the client knows which way it went.
clientWishlistRouter.post('/toggle', async (req, res) => {
    try {
        const { productId, productName, productImage, category, price = 0, discountPercent = 0 } = req.body;
        let guestId = getGuestId(req);
        if (!guestId) guestId = `guest_${Date.now()}`;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required', error: true, success: false });
        }

        const wishlist = await ensureWishlist(guestId);
        const idx = wishlist.items.findIndex((it) => String(it.productId) === String(productId));

        let added;
        if (idx > -1) {
            // Removing is always allowed, so a ghost entry can still be cleared by hand.
            wishlist.items.splice(idx, 1);
            added = false;
        } else {
            // Adding must point at a real product: a stale tab would otherwise
            // re-add one that was just deleted.
            if (!isObjectIdString(String(productId))) {
                return res.status(400).json({ message: 'Invalid product id', error: true, success: false });
            }
            if (!(await ProductModel.exists({ _id: String(productId) }))) {
                return res.status(404).json({ message: 'Product not found', error: true, success: false });
            }
            wishlist.items.push({
                productId: String(productId),
                productName: productName || '',
                productImage: productImage || '',
                category: category || '',
                price: Number(price) || 0,
                discountPercent: Number(discountPercent) || 0,
                addedAt: new Date(),
            });
            added = true;
        }

        await wishlist.save();
        res.setHeader('guest-id', guestId);
        res.json({
            message: added ? 'Added to wishlist' : 'Removed from wishlist',
            data: wishlist,
            added,
            error: false,
            success: true,
        });
    } catch (error) {
        console.error('Wishlist toggle error:', error);
        res.status(500).json({ message: error.message, error: true, success: false });
    }
});

// DELETE /remove/:productId — drop a single product.
clientWishlistRouter.delete('/remove/:productId', async (req, res) => {
    try {
        const guestId = getGuestId(req);
        if (!guestId) {
            return res.status(400).json({ message: 'Guest ID required', error: true, success: false });
        }
        const wishlist = await WishlistModel.findOne({ guestId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found', error: true, success: false });
        }
        wishlist.items = wishlist.items.filter((it) => String(it.productId) !== String(req.params.productId));
        await wishlist.save();
        res.json({ message: 'Item removed', data: wishlist, error: false, success: true });
    } catch (error) {
        console.error('Wishlist remove error:', error);
        res.status(500).json({ message: error.message, error: true, success: false });
    }
});

// DELETE /clear — empty the wishlist.
clientWishlistRouter.delete('/clear', async (req, res) => {
    try {
        const guestId = getGuestId(req);
        if (!guestId) {
            return res.status(400).json({ message: 'Guest ID required', error: true, success: false });
        }
        const wishlist = await WishlistModel.findOne({ guestId });
        if (wishlist) {
            wishlist.items = [];
            await wishlist.save();
        }
        res.json({ message: 'Wishlist cleared', data: wishlist || { guestId, items: [] }, error: false, success: true });
    } catch (error) {
        console.error('Wishlist clear error:', error);
        res.status(500).json({ message: error.message, error: true, success: false });
    }
});

export default clientWishlistRouter;
