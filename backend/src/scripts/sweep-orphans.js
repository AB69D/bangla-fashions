// ---------------------------------------------------------------------------
// One-off orphan sweep.
//
// Products deleted before the delete cascade existed left ghosts behind: cart
// and wishlist lines, reviews, landing-page order forms, order-line images and
// files nobody references any more. The cascade (services/productCascade.js)
// keeps things clean from now on; this script cleans up what is already there.
//
// It NEVER runs by itself and importing it does nothing: it only acts when it is
// executed directly. Run it inside the backend container, which already has
// MONGODB_URI and UPLOAD_DIR (it also loads the backend's normal env, so JWT_SECRET
// etc. must be present, exactly as for the server):
//
//   docker compose exec -T backend node src/scripts/sweep-orphans.js
//   docker compose exec -T backend node src/scripts/sweep-orphans.js --apply
//   docker compose exec -T backend node src/scripts/sweep-orphans.js --apply --delete-files
//
// DRY RUN IS THE DEFAULT. Without --apply it only reads: it prints what it would
// change and writes nothing (not even database indexes). Always do a dry run first.
//
// Flags
//   --apply              perform the database fixes listed below
//   --delete-files       with --apply: also delete unreferenced upload files
//                        (refused without --apply)
//   --keep-order-images  with --delete-files: spare files still shown in old
//                        orders (by default their order lines get productImage
//                        blanked, like the product-delete cascade does)
//   --help               print this text
// Unknown flags abort the run, so a typo can never change what it does.
//
// What it handles
//   1. cart lines whose product no longer exists (cart totals are recomputed)
//   2. wishlist lines whose product no longer exists
//   3. reviews of a product that no longer exists (deleted with their media files)
//   4. landing-page order forms pointing at a product that no longer exists
//      (blanked in place, pages stay published, their cache tag is busted)
//   5. products whose category no longer exists -> moved to the "Other" category
//   6. order lines whose productImage points at a file that is not on disk
//      -> productImage blanked (prices, quantities, costs and totals are never touched)
//   7. files under UPLOAD_DIR that no live record references AND are older than
//      48 hours -> reported; deleted only with --apply --delete-files
//
// Safety
//   - File deletion goes through lib/uploadFiles.js deleteUploadFiles(), which
//     re-checks that every path is one of our own uploads inside UPLOAD_DIR and
//     that no live record references it. This script never unlinks anything itself.
//   - Files younger than 48 h are never touched (a form can legitimately hold an
//     uploaded image for hours before it is saved).
//   - If UPLOAD_DIR is missing or empty (wrong path, volume not mounted), the two
//     disk-based steps are skipped, so a mis-pointed run cannot blank order images.
//   - Every write is idempotent: running it twice is harmless.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const MIN_FILE_AGE_MS = 48 * 60 * 60 * 1000;
const FLAGS = new Set(['--apply', '--delete-files', '--keep-order-images', '--help', '-h']);
const DELETE_BATCH = 100;
const REFERENCE_BATCH = 200;
const SAMPLE_SIZE = 10;

const USAGE = `Usage: node src/scripts/sweep-orphans.js [--apply] [--delete-files] [--keep-order-images] [--help]

  (no flags)           dry run: report what would change, write nothing
  --apply              perform the database fixes
  --delete-files       with --apply: delete unreferenced upload files older than 48 h
  --keep-order-images  with --delete-files: keep files still shown in old orders`;

export function parseArgs(argv) {
    return {
        help: argv.includes('--help') || argv.includes('-h'),
        unknown: argv.filter((a) => !FLAGS.has(a)),
        apply: argv.includes('--apply'),
        deleteFiles: argv.includes('--delete-files'),
        keepOrderImages: argv.includes('--keep-order-images'),
    };
}

const formatBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Every regular file under root that looks like one of our uploads. Symlinks are
// never followed. Files that do not match the upload URL shape (stray files,
// .gitkeep, anything the backend did not write) are counted but never listed as
// candidates. Throws if the root itself cannot be read.
async function listUploadFiles(root, uploadUrlToDiskPath) {
    const files = [];
    let unmanaged = 0;
    const stack = [root];
    while (stack.length > 0) {
        const dir = stack.pop();
        let entries;
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (err) {
            if (dir === root) throw err;
            continue;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory()) {
                stack.push(full);
                continue;
            }
            if (!entry.isFile()) continue;
            const url = `/uploads/${path.relative(root, full).split(path.sep).join('/')}`;
            if (uploadUrlToDiskPath(url) !== full) {
                unmanaged += 1;
                continue;
            }
            const stat = await fs.promises.lstat(full);
            files.push({ url, mtimeMs: stat.mtimeMs, size: stat.size });
        }
    }
    return { files, unmanaged };
}

export async function main(argv = process.argv.slice(2)) {
    const opts = parseArgs(argv);
    if (opts.help) {
        console.log(USAGE);
        return 0;
    }
    if (opts.unknown.length > 0) {
        console.error(`Unknown option(s): ${opts.unknown.join(' ')}\n\n${USAGE}`);
        return 2;
    }
    if (opts.deleteFiles && !opts.apply) {
        console.error('--delete-files only works together with --apply (dry run never deletes anything).');
        return 2;
    }
    const APPLY = opts.apply;

    // Dry run must not write anything, and by default Mongoose creates missing
    // collections and builds indexes the moment a model connects. Switch that off
    // before any model is imported; with --apply the backend's normal behaviour stays.
    mongoose.set('strictQuery', true);
    mongoose.set('autoIndex', APPLY);
    mongoose.set('autoCreate', APPLY);

    // Same env loading as the server (this also makes a local .env work).
    await import('dotenv/config');
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is not set in the environment. Aborting.');
        return 2;
    }

    // Imported only now, so that importing this file (or --help) never touches the
    // backend's env validation, the logger or any model.
    const uploadFiles = await import('../lib/uploadFiles.js');
    const { deleteUploadFiles, uploadUrlToDiskPath } = uploadFiles;
    const UPLOAD_DIR = path.resolve(uploadFiles.UPLOAD_DIR || (await import('../middlewares/uploadImage.js')).UPLOAD_DIR);
    const { getOrCreateOtherCategory } = await import('../lib/otherCategory.js');
    const cascade = await import('../services/productCascade.js');
    const {
        findMissingProductIds, productIdMatchList, pruneCartsByProduct, pruneWishlistsByProduct,
        clearLandingOrderForms, blankOrderLineImages,
    } = cascade;
    const CartModel = (await import('../models/cart.model.js')).default;
    const WishlistModel = (await import('../models/wishlist.model.js')).default;
    const ReviewModel = (await import('../models/review.model.js')).default;
    const OrderModel = (await import('../models/order.model.js')).default;
    const ProductModel = (await import('../models/product.model.js')).default;
    const CategoryModel = (await import('../models/category.model.js')).default;
    const { LandingPage } = await import('../models/landingPage.model.js');

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`Database : ${mongoose.connection.host}/${mongoose.connection.name}`);
    console.log(`Uploads  : ${UPLOAD_DIR}`);
    console.log(
        APPLY
            ? `Mode     : APPLY${opts.deleteFiles ? ' + DELETE FILES' : ''}`
            : 'Mode     : DRY RUN (nothing will be changed; add --apply to act)',
    );

    let failures = 0;
    const say = (msg) => console.log(`   ${msg}`);
    const section = async (title, fn) => {
        console.log(`\n== ${title}`);
        try {
            await fn();
        } catch (err) {
            failures += 1;
            console.error(`   ! this step failed and was skipped: ${err?.message || err}`);
        }
    };

    try {
        // 1 ------------------------------------------------------------------
        await section('Carts: lines for products that no longer exist', async () => {
            const missing = await findMissingProductIds(await CartModel.distinct('items.productId'));
            if (missing.size === 0) return say('nothing to do');
            const ids = [...missing];
            const carts = await CartModel.countDocuments({ 'items.productId': { $in: productIdMatchList(ids) } });
            say(`${carts} cart(s) hold lines for ${missing.size} missing product id(s)`);
            if (APPLY) say(`pruned ${await pruneCartsByProduct(ids)} cart(s), totals recomputed`);
        });

        // 2 ------------------------------------------------------------------
        await section('Wishlists: items for products that no longer exist', async () => {
            const missing = await findMissingProductIds(await WishlistModel.distinct('items.productId'));
            if (missing.size === 0) return say('nothing to do');
            const ids = [...missing];
            const lists = await WishlistModel.countDocuments({ 'items.productId': { $in: ids } });
            say(`${lists} wishlist(s) hold items for ${missing.size} missing product id(s)`);
            if (APPLY) say(`pruned ${await pruneWishlistsByProduct(ids)} wishlist(s)`);
        });

        // 3 ------------------------------------------------------------------
        await section('Reviews: reviews of products that no longer exist', async () => {
            const productIds = await ReviewModel.distinct('product', { product: { $ne: null } });
            const missing = await findMissingProductIds(productIds.map(String));
            if (missing.size === 0) return say('nothing to do');
            const reviews = await ReviewModel.find({ product: { $in: [...missing] } }).select('media.url').lean();
            const urls = [...new Set(reviews.flatMap((r) => (r.media || []).map((m) => m?.url).filter(Boolean)))];
            say(`${reviews.length} review(s) for ${missing.size} missing product(s), ${urls.length} media file(s)`);
            if (!APPLY) return;
            const res = await ReviewModel.deleteMany({ _id: { $in: reviews.map((r) => r._id) } });
            say(`deleted ${res.deletedCount || 0} review(s)`);
            if (urls.length > 0) {
                const files = await deleteUploadFiles(urls);
                say(`media files: ${files.deleted.length} deleted, ${files.keptReferenced.length} kept (still referenced), ${files.skipped.length} skipped, ${files.failed.length} failed`);
                if (files.deleted.length > 0) await blankOrderLineImages(files.deleted);
            }
        });

        // 4 ------------------------------------------------------------------
        await section('Landing pages: order forms for products that no longer exist', async () => {
            const pages = await LandingPage.collection
                .find({ 'blocks.type': 'orderForm' }, { projection: { slug: 1, blocks: 1 } })
                .toArray();
            const formProductId = (block) => (block?.type === 'orderForm' && block.data?.productId != null ? String(block.data.productId) : '');
            const used = new Set(pages.flatMap((p) => (p.blocks || []).map(formProductId)).filter(Boolean));
            const missing = await findMissingProductIds([...used]);
            if (missing.size === 0) return say('nothing to do');
            const hit = pages.filter((p) => (p.blocks || []).some((b) => missing.has(formProductId(b))));
            say(`${hit.length} page(s) have an order form for ${missing.size} missing product(s): ${hit.map((p) => p.slug).join(', ')}`);
            if (APPLY) {
                const { cleared } = await clearLandingOrderForms([...missing]);
                say(`blanked order forms on ${cleared} page(s); they stay published`);
            }
        });

        // 5 ------------------------------------------------------------------
        await section('Products: category no longer exists -> "Other"', async () => {
            const used = (await ProductModel.distinct('category')).filter(Boolean);
            const found = await CategoryModel.find({ _id: { $in: used } }).select('_id').lean();
            const live = new Set(found.map((c) => String(c._id)));
            const dead = used.filter((id) => !live.has(String(id)));
            const filter = { $or: [{ category: { $in: dead } }, { category: null }] };
            const count = await ProductModel.countDocuments(filter);
            if (count === 0) return say('nothing to do');
            say(`${count} product(s) point at ${dead.length} missing categor${dead.length === 1 ? 'y' : 'ies'} (or none)`);
            if (!APPLY) return;
            const other = await getOrCreateOtherCategory();
            const res = await ProductModel.updateMany(filter, { $set: { category: other._id } });
            say(`moved ${res.modifiedCount || 0} product(s) to "${other.category_name}"`);
        });

        // 6 + 7: both depend on what is really on disk ------------------------
        let disk = { files: [], unmanaged: 0 };
        let diskSkipReason = '';
        let orderImageUrls = new Set();
        try {
            disk = await listUploadFiles(UPLOAD_DIR, uploadUrlToDiskPath);
            orderImageUrls = new Set(
                (await OrderModel.distinct('items.productImage')).filter((u) => typeof u === 'string' && u),
            );
            if (disk.files.length === 0) {
                diskSkipReason = 'the uploads folder contains no upload files, so it looks like the wrong path or an unmounted volume';
            }
        } catch (err) {
            failures += 1;
            diskSkipReason = `could not scan the uploads folder (${err?.code || err?.message || err})`;
        }
        const diskTrusted = diskSkipReason === '';

        // 6 ------------------------------------------------------------------
        await section('Order lines: productImage pointing at a file that is gone', async () => {
            if (!diskTrusted) return say(`skipped: ${diskSkipReason}`);
            const onDisk = new Set(disk.files.map((f) => f.url));
            const gone = [];
            for (const url of orderImageUrls) {
                // External URLs and anything that is not one of our uploads map to null.
                const abs = uploadUrlToDiskPath(url);
                if (!abs || onDisk.has(url)) continue;
                try {
                    await fs.promises.access(abs);
                } catch (err) {
                    if (err.code === 'ENOENT') gone.push(url);
                }
            }
            if (gone.length === 0) return say('nothing to do');
            say(`${gone.length} distinct image path(s) used by order lines no longer exist on disk`);
            if (APPLY) say(`blanked productImage on ${await blankOrderLineImages(gone)} order(s)`);
        });

        // 7 ------------------------------------------------------------------
        await section('Files: uploads that nothing references (older than 48 h)', async () => {
            if (!diskTrusted) return say(`skipped: ${diskSkipReason}`);
            const now = Date.now();
            const old = disk.files.filter((f) => now - f.mtimeMs >= MIN_FILE_AGE_MS);
            say(`${disk.files.length} upload file(s) on disk, ${disk.files.length - old.length} newer than 48 h (left alone), ${disk.unmanaged} unrecognised file(s) (left alone)`);

            // Same reference rules as the delete cascade. Any failure means "assume
            // referenced": this step then deletes nothing.
            const referenced = new Set();
            for (let i = 0; i < old.length; i += REFERENCE_BATCH) {
                const batch = old.slice(i, i + REFERENCE_BATCH).map((f) => f.url);
                if (typeof uploadFiles.getReferencedUploadUrls === 'function') {
                    for (const url of await uploadFiles.getReferencedUploadUrls(batch)) referenced.add(url);
                } else {
                    for (const url of batch) if (await uploadFiles.isUploadReferenced(url)) referenced.add(url);
                }
            }

            const orphans = old.filter((f) => !referenced.has(f.url));
            const inHistory = orphans.filter((f) => orderImageUrls.has(f.url));
            const deletable = opts.keepOrderImages ? orphans.filter((f) => !orderImageUrls.has(f.url)) : orphans;
            const bytes = deletable.reduce((sum, f) => sum + f.size, 0);
            say(`${orphans.length} unreferenced file(s); ${inHistory.length} of them still appear in old orders`);
            if (deletable.length === 0) return;
            say(`${deletable.length} file(s), ${formatBytes(bytes)}, ${opts.keepOrderImages ? 'would be deleted (files shown in old orders are spared)' : 'would be deleted (their order lines get productImage blanked)'}`);
            for (const f of deletable.slice(0, SAMPLE_SIZE)) say(`  ${f.url}`);
            if (deletable.length > SAMPLE_SIZE) say(`  ... and ${deletable.length - SAMPLE_SIZE} more`);

            if (!(APPLY && opts.deleteFiles)) return say('not deleting: add --apply --delete-files to remove them');

            const totals = { deleted: 0, keptReferenced: 0, skipped: 0, failed: 0 };
            for (let i = 0; i < deletable.length; i += DELETE_BATCH) {
                const res = await deleteUploadFiles(deletable.slice(i, i + DELETE_BATCH).map((f) => f.url));
                totals.deleted += res.deleted.length;
                totals.keptReferenced += res.keptReferenced.length;
                totals.skipped += res.skipped.length;
                totals.failed += res.failed.length;
                if (res.deleted.length > 0) await blankOrderLineImages(res.deleted);
            }
            say(`deleted ${totals.deleted}, kept ${totals.keptReferenced} (referenced after all), skipped ${totals.skipped}, failed ${totals.failed}`);
        });
    } finally {
        await mongoose.disconnect().catch(() => {});
    }

    console.log(
        APPLY
            ? `\nDone${failures ? ` with ${failures} failed step(s)` : ''}.`
            : '\nDry run complete: nothing was changed. Re-run with --apply to perform the fixes above.',
    );
    return failures ? 1 : 0;
}

// Run only when executed directly (node src/scripts/sweep-orphans.js), never on import.
const isEntrypoint = (() => {
    try {
        return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
})();

if (isEntrypoint) {
    main()
        .then((code) => process.exit(code))
        .catch((err) => {
            console.error('Sweep failed:', err);
            process.exit(1);
        });
}
