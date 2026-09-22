import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import sharp from "sharp";
import { ApiError } from "../lib/ApiError.js";

// Where uploaded media lives on disk. In Docker this is /app/uploads, backed by
// the named volume `uploads-data` so a rebuild can't wipe the product images;
// locally it is ./uploads next to the backend. server.js serves this directory
// at /uploads and the review route writes into it too, so both import this
// const rather than recomputing the path.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

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
// The name is historical: four route files import this default export as
// `cloudinary_upload`. It is now a plain multer instance — nothing here talks
// to Cloudinary any more, everything is written to the VPS disk.
const cloudinary_upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES, files: 12 },
    fileFilter: (req, file, cb) => {
        if (IMAGE_MIME.test(file.mimetype)) cb(null, true);
        else cb(ApiError.badRequest(`Unsupported file type "${file.mimetype}". Please upload an image (JPEG, PNG, WebP, GIF, AVIF, SVG).`));
    },
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
    await fs.promises.writeFile(path.join(UPLOAD_DIR, relativeDir, filename), buffer);

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

// 2. Upload middleware
export const processAndUploadImages = async (req, res, next) => {
    try {
        const processFile = async (file) => {
            // Mutate the file object so the controllers can continue cleanly.
            // They expect 'file.path' to contain the image URL — now the
            // relative /uploads/... path instead of a remote one.
            file.path = await saveUploadImage(file.buffer, file.mimetype);
            return file;
        };

        if (req.file) {
            await processFile(req.file);
        } else if (req.files) {
            // Handle object format from cloudinary_upload.fields()
            if (Array.isArray(req.files)) {
                await Promise.all(req.files.map(file => processFile(file)));
            } else {
                // Handle object with field names as keys
                const fileArrays = Object.values(req.files);
                const allFiles = fileArrays.flat();
                await Promise.all(allFiles.map(file => processFile(file)));
            }
        }

        next();
    } catch (error) {
        console.error("Image Processing Error:", error);
        return res.status(500).json({
            message: "Failed to upload image",
            error: true,
            success: false
        });
    }
};

export default cloudinary_upload;
