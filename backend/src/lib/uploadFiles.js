import fs from 'fs';
import path from 'path';
import ProductModel from '../models/product.model.js';
import CategoryModel from '../models/category.model.js';
import HeaderModel from '../models/header.model.js';
import ReviewModel from '../models/review.model.js';
import { LandingPage } from '../models/landingPage.model.js';
import { SiteSettings } from '../models/siteSettings.model.js';
import { Footer } from '../models/footer.model.js';
import { Page } from '../models/page.model.js';
import { NavMenuItem } from '../models/navMenu.model.js';
import { logger } from './logger.js';

// Everything in this file exists so that removing an uploaded image from the
// server disk can never remove the wrong file. Three layers, each of which fails
// on the side of "keep the file":
//   1. a stored string is only treated as ours if it matches UPLOAD_URL_RE
//      exactly (so external URLs, legacy paths and anything odd are never touched),
//   2. the resolved path must stay inside UPLOAD_DIR (path.relative, not a
//      string-prefix test) and must be a regular file,
//   3. the file is only unlinked when no live document still references it, and
//      a failing lookup counts as "referenced".
// Nothing here throws into a request: callers run it AFTER their own DB write
// succeeded, and a failed cleanup must never turn that success into an error.

// Where uploaded media lives on disk. Defined here (not in the upload
// middleware) so this module has no dependency on multer/sharp and the
// middleware can import it without an import cycle. middlewares/uploadImage.js
// re-exports it, which is where server.js and the review route import it from.
// Resolved once so an env-supplied relative path still yields absolute targets.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

// Every file the backend writes is <UPLOAD_DIR>/[reviews/]<yyyy>/<mm>/<uuid>.<ext>
// (saveUploadBuffer in the upload middleware). Admin uploads are always webp
// (sharp output) or svg. Only the anonymous review route can produce another
// extension: review videos take their extension from a map of known containers
// or from the client-declared mimetype subtype stripped to [a-z0-9], so that
// subdir alone is widened to any such extension. Without it those files could
// never be removed when the review is deleted.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const DATED = '\\d{4}/(?:0[1-9]|1[0-2])';
export const UPLOAD_URL_RE = new RegExp(
    `^/uploads/(?:${DATED}/${UUID}\\.(?:webp|svg)|reviews/${DATED}/${UUID}\\.[a-z0-9]{1,64})$`,
);

const URL_PREFIX = '/uploads/';

const asArray = (value) => (Array.isArray(value) ? value : []);
const fileNameOf = (url) => url.slice(url.lastIndexOf('/') + 1);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Map a stored upload URL to its absolute path on disk, or null when the value
 * is not unmistakably one of our own uploads. Pure: touches neither the disk
 * nor the database.
 */
export function uploadUrlToDiskPath(url) {
    if (typeof url !== 'string') return null;
    // The regex already admits none of these; the explicit checks keep the
    // guarantee obvious (and intact if someone widens the regex later).
    if (url.includes('\\') || url.includes('\0') || url.includes('..')) return null;
    if (!UPLOAD_URL_RE.test(url)) return null;

    const abs = path.resolve(UPLOAD_DIR, url.slice(URL_PREFIX.length));
    // path.relative instead of startsWith: "/data/uploads-evil" starts with
    // "/data/uploads" but is not inside it.
    const rel = path.relative(UPLOAD_DIR, abs);
    if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
    return abs;
}

/**
 * Every image URL a product holds: cover, gallery and each variant's images.
 * Accepts a mongoose document or a lean object. Strings only, blanks dropped,
 * de-duplicated, first-seen order. Values are returned exactly as stored.
 */
export function collectProductImageUrls(productLike) {
    if (!productLike) return [];
    const urls = new Set();
    const add = (value) => {
        if (typeof value === 'string' && value.trim() !== '') urls.add(value);
    };
    add(productLike.cover_image);
    asArray(productLike.gallery).forEach(add);
    // weights[].images is an untyped array in the schema, hence the string guard.
    asArray(productLike.weights).forEach((weight) => asArray(weight?.images).forEach(add));
    return [...urls];
}

// ── Reference check ─────────────────────────────────────────────────────────
// Fields with a known shape are looked up with one regex query per collection.
// The regex is on the uuid FILENAME rather than the whole URL on purpose: a
// field that holds the same file as an absolute URL ("https://shop.example/uploads/…")
// or with a stray query string still counts as a reference.
const STRUCTURED_OWNERS = [
    { model: ProductModel, paths: ['cover_image', 'gallery', 'weights.images'] },
    { model: CategoryModel, paths: ['category_image'] },
    { model: HeaderModel, paths: ['image'] },
    { model: ReviewModel, paths: ['media.url'] },
];

// Small collections whose URL-bearing fields are free-form or unvalidated:
// landing-page block.data is Mixed (hero/productHighlight image, testimonial
// avatars, order-form content, whatever the builder grows next) and its OG image,
// CMS page bodies are raw HTML, settings hold logo/favicon/og image, and
// footer/menu rows hold admin-typed links. Rather than hard-code today's keys,
// these are scanned as JSON text for the filename, so a new field is covered
// without touching this file.
const TEXT_SCANNED_OWNERS = [SiteSettings, LandingPage, Footer, Page, NavMenuItem];

// Order, cart, wishlist and checkout-lead rows are deliberately NOT owners: they
// snapshot a product image URL, and the product cascade handles those rows
// explicitly. Treating them as owners would make an ever-ordered product's
// images undeletable. Audit-log rows echo URLs as history and are ignored too.

// Names per regex query; keeps the alternation small for bulk callers.
const LOOKUP_CHUNK = 100;

/**
 * Of the given URLs, return the Set that some live document still references.
 * Bulk form of isUploadReferenced for callers holding many URLs (the orphan
 * sweep). THROWS if any lookup fails: callers must treat that as "everything is
 * referenced". URLs that do not match UPLOAD_URL_RE are ignored.
 */
export async function getReferencedUploadUrls(urls) {
    const wanted = [...new Set(asArray(urls))].filter((u) => typeof u === 'string' && UPLOAD_URL_RE.test(u));
    const referenced = new Set();

    for (let i = 0; i < wanted.length; i += LOOKUP_CHUNK) {
        const remaining = new Set(wanted.slice(i, i + LOOKUP_CHUNK).map((url) => ({ url, name: fileNameOf(url) })));
        const markHits = (text) => {
            for (const entry of remaining) {
                if (text.includes(entry.name)) {
                    referenced.add(entry.url);
                    remaining.delete(entry);
                }
            }
        };
        const nameRe = new RegExp([...remaining].map((e) => escapeRegExp(e.name)).join('|'));

        await Promise.all(
            STRUCTURED_OWNERS.map(async ({ model, paths }) => {
                const docs = await model
                    .find({ $or: paths.map((p) => ({ [p]: nameRe })) })
                    .select(paths.join(' '))
                    .lean();
                // Only documents the database already matched, restricted to the
                // selected fields, so any hit in here is a genuine reference.
                markHits(JSON.stringify(docs));
            }),
        );

        for (const model of TEXT_SCANNED_OWNERS) {
            if (remaining.size === 0) break;
            // A cursor keeps memory flat; leaving the loop closes it.
            for await (const doc of model.find().lean().cursor()) {
                markHits(JSON.stringify(doc));
                if (remaining.size === 0) break;
            }
        }
    }
    return referenced;
}

/**
 * true when any live document still points at this upload. Fails SAFE: a value
 * that is not one of our upload URLs, or any lookup error, answers true, which
 * means "do not delete".
 */
export async function isUploadReferenced(url) {
    try {
        if (typeof url !== 'string' || !UPLOAD_URL_RE.test(url)) return true;
        return (await getReferencedUploadUrls([url])).has(url);
    } catch (err) {
        logger.error({ err }, 'Upload reference check failed; treating the file as referenced');
        return true;
    }
}

// ── Unlinking ───────────────────────────────────────────────────────────────
const GONE_CODES = new Set(['ENOENT', 'ENOTDIR']);

// 'removed' | 'gone' (it was already absent) | 'skipped' (refused to touch it).
// Throws on any other fs error so the caller can report it.
async function removeFile(abs) {
    let stat;
    try {
        stat = await fs.promises.lstat(abs);
    } catch (err) {
        if (GONE_CODES.has(err.code)) return 'gone';
        throw err;
    }
    // lstat does not follow links: a symlink or directory at this path is not a
    // file we wrote, so it is left alone. unlink only, never a recursive remove.
    if (!stat.isFile()) return 'skipped';

    // A symlinked dated directory (uploads/2026 -> /somewhere/else) would make
    // a lexically-inside path land outside the upload root.
    const [realRoot, realDir] = await Promise.all([
        fs.promises.realpath(UPLOAD_DIR),
        fs.promises.realpath(path.dirname(abs)),
    ]);
    const rel = path.relative(realRoot, realDir);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return 'skipped';

    try {
        await fs.promises.unlink(abs);
    } catch (err) {
        if (GONE_CODES.has(err.code)) return 'gone';
        throw err;
    }
    return 'removed';
}

/**
 * Delete uploaded files from disk, but only the ones that are ours and that no
 * live document references any more. Call it AFTER the database write that
 * dropped the reference has committed.
 *
 * Never throws. Result buckets (each URL lands in exactly one):
 *   deleted         unlinked now, or already absent (idempotent)
 *   keptReferenced  still referenced, or the reference check failed
 *   skipped         not one of our upload URLs (external, legacy, malformed), or
 *                   the path is not a plain file inside the upload root
 *   failed          unlink raised an error: [{ url, error }]
 */
export async function deleteUploadFiles(urls) {
    const result = { deleted: [], keptReferenced: [], skipped: [], failed: [] };
    try {
        const unique = [...new Set(asArray(urls))].filter((u) => typeof u === 'string' && u.trim() !== '');

        const candidates = [];
        for (const url of unique) {
            const abs = uploadUrlToDiskPath(url);
            if (abs) candidates.push({ url, abs });
            else result.skipped.push(url);
        }
        if (candidates.length === 0) return result;

        let referenced;
        try {
            referenced = await getReferencedUploadUrls(candidates.map((c) => c.url));
        } catch (err) {
            logger.error({ err }, 'Upload reference check failed; keeping every file');
            result.keptReferenced.push(...candidates.map((c) => c.url));
            return result;
        }

        for (const { url, abs } of candidates) {
            if (referenced.has(url)) {
                result.keptReferenced.push(url);
                continue;
            }
            try {
                const outcome = await removeFile(abs);
                if (outcome === 'skipped') result.skipped.push(url);
                else result.deleted.push(url);
            } catch (err) {
                result.failed.push({ url, error: String(err?.code || err?.message || err) });
            }
        }

        if (result.failed.length > 0) {
            logger.warn({ failed: result.failed }, 'Some uploaded files could not be deleted');
        }
        if (result.deleted.length > 0) {
            logger.info(
                { deleted: result.deleted.length, keptReferenced: result.keptReferenced.length },
                'Deleted uploaded files',
            );
        }
    } catch (err) {
        logger.error({ err }, 'deleteUploadFiles failed unexpectedly');
    }
    return result;
}
