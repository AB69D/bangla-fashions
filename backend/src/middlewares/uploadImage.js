import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import sharp from "sharp";
import { ApiError } from "../lib/ApiError.js";
import { logger } from "../lib/logger.js";
import { UPLOAD_DIR, deleteUploadFiles } from "../lib/uploadFiles.js";

// Where uploaded media lives on disk. In Docker this is /app/uploads, backed by
// the named volume `uploads-data` so a rebuild can't wipe the product images;
// locally it is ./uploads next to the backend. server.js serves this directory
// at /uploads and the review route writes into it too, so both import this
// const rather than recomputing the path. It is defined in lib/uploadFiles.js
// (which needs it to map URLs back to files) and re-exported here so existing
// imports keep working.
export { UPLOAD_DIR };

// 1. Configure multer to use memory storage instead of uploading directly.
//    Bound every upload: cap file size and count (memoryStorage buffers the
//    whole file in RAM, so unbounded uploads are a DoS vector) and reject any
//    non-image MIME type up front before it ever reaches the disk.
const storage = multer.memoryStorage();
// SVG is included deliberately — the branding UI invites vector logo uploads
// (crisp at any size), and saveUploadImage below stores SVGs natively instead
// of forcing the webp raster conversion applied to everything else.
const IMAGE_MIME = /^image\/(jpe?g|png|webp|gif|avif|heic|heif|svg\+xml)$/i;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file
const imageFileFilter = (req, file, cb) => {
    if (IMAGE_MIME.test(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest(`Unsupported file type "${file.mimetype}". Please upload an image (JPEG, PNG, WebP, GIF, AVIF, SVG).`));
};
// The name is historical: four route files import this default export as
// `cloudinary_upload`. It is now a plain multer instance — nothing here talks
// to Cloudinary any more, everything is written to the VPS disk.
const cloudinary_upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES, files: 12 },
    fileFilter: imageFileFilter,
});

// The product forms send a gallery (up to 10) plus per-size photos in one
// request, which the shared 12-file cap rejects. Only the product routes use
// this instance, so the global cap for settings/header/category stays at 12.
// The per-file size is unchanged; the extra files are the only added RAM
// (30 x 8 MB worst case).
export const productUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES, files: 30 },
    fileFilter: imageFileFilter,
});

/**
 * Write a buffer to <UPLOAD_DIR>/[subdir/]<yyyy>/<mm>/<uuid>.<ext> and return
 * the URL to store. Dated subdirs keep any single directory small enough to
 * list; the filename is always a fresh uuid, never anything derived from the
 * client-supplied originalname — a crafted name is a path-traversal write.
 */
export const saveUploadBuffer = async (buffer, ext, subdir = "") => {
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const relativeDir = path.posix.join(subdir, yyyy, mm);

    await fs.promises.mkdir(path.join(UPLOAD_DIR, relativeDir), { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    const target = path.join(UPLOAD_DIR, relativeDir, filename);
    try {
        await fs.promises.writeFile(target, buffer);
    } catch (err) {
        // A failed write (disk full) can leave a truncated file whose URL the
        // caller never receives, so nothing could ever clean it up later.
        await fs.promises.unlink(target).catch(() => {});
        throw err;
    }

    // Relative on purpose: the domain must never be baked into database rows,
    // otherwise every image breaks the day the site moves or gains a hostname.
    return `/uploads/${relativeDir}/${filename}`;
};

/**
 * Normalise one image buffer and drop it on disk, returning its relative URL.
 * Shared by processAndUploadImages and the review-photo route so both produce
 * byte-identical output.
 */
export const saveUploadImage = async (buffer, mimetype, subdir = "") => {
    // SVG is vector — forcing the usual webp conversion would rasterize it at
    // sharp's default density and lose the whole point of uploading a scalable
    // logo. Store it as-is instead.
    if (/^image\/svg\+xml$/i.test(mimetype)) {
        return saveUploadBuffer(buffer, "svg", subdir);
    }

    const webp = await sharp(buffer)
        // Apply EXIF orientation before sharp drops the metadata, otherwise
        // phone photos come out sideways.
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

    // The extension comes from the sniffed mimetype (webp for every raster,
    // svg above) — never from file.originalname.
    return saveUploadBuffer(webp, "webp", subdir);
};

// Sharp decodes in libuv's 4-thread pool, and every file already sits in RAM as
// a buffer. Starting up to 30 pipelines at once only queues them behind those
// threads while each holds its own working memory, so run a few at a time.
const UPLOAD_CONCURRENCY = 3;

// Run `worker` over `items` with at most `limit` in flight. After the first
// failure no new item is started, but the ones already running are awaited, so
// when this rejects nothing is still writing to disk (the caller can then
// safely delete what was written).
const runBounded = async (items, limit, worker) => {
    let cursor = 0;
    let failed = false;
    let firstError;
    const lane = async () => {
        while (!failed && cursor < items.length) {
            const item = items[cursor++];
            try {
                await worker(item);
            } catch (err) {
                if (!failed) {
                    failed = true;
                    firstError = err;
                }
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
    if (failed) throw firstError;
};

// 2. Upload middleware
export const processAndUploadImages = async (req, res, next) => {
    // Every URL this request writes, in completion order (use file.path to map a
    // URL back to its file). Also what the orphan guard below cleans up.
    if (!Array.isArray(req.uploadedUrls)) req.uploadedUrls = [];

    try {
        const processFile = async (file) => {
            // Mutate the file object so the controllers can continue cleanly.
            // They expect 'file.path' to contain the image URL — now the
            // relative /uploads/... path instead of a remote one.
            file.path = await saveUploadImage(file.buffer, file.mimetype);
            req.uploadedUrls.push(file.path);
        };

        let files = [];
        if (req.file) {
            files = [req.file];
        } else if (Array.isArray(req.files)) {
            files = req.files;
        } else if (req.files) {
            // Object format from cloudinary_upload.fields(): field name -> files.
            files = Object.values(req.files).flat();
        }

        await runBounded(files, UPLOAD_CONCURRENCY, processFile);
    } catch (error) {
        logger.error({ err: error }, "Image Processing Error");
        // One bad image must not strand its already-written siblings on disk.
        // No controller has run, so none of these can be referenced yet.
        await deleteUploadFiles(req.uploadedUrls);
        return res.status(500).json({
            message: "Failed to upload image",
            error: true,
            success: false
        });
    }

    // Orphan guard: files are written before the controller validates the form
    // or saves the document, so any 4xx/5xx would otherwise leave them behind.
    // The reference check inside deleteUploadFiles keeps this safe even for a
    // controller that saved the URL and then still answered with an error: such
    // a file is referenced, hence kept. Only 'finish' is used, never 'close':
    // a client that disconnects mid-request must not trigger a delete while the
    // controller may still be about to save the URL.
    if (req.uploadedUrls.length > 0) {
        res.once("finish", () => {
            if (res.statusCode < 400) return;
            deleteUploadFiles(req.uploadedUrls).catch(() => {});
        });
    }

    next();
};

export default cloudinary_upload;
