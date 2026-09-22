import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import ReviewModel from '../models/review.model.js';
import { isFeatureEnabled } from '../lib/siteSettings.js';
import { saveUploadBuffer, saveUploadImage } from '../middlewares/uploadImage.js';

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        // SVG is refused here even though the admin branding upload allows it:
        // review media is submitted anonymously and is now served from our own
        // domain rather than Cloudinary's, so a scripted SVG would be stored
        // XSS on the storefront origin. Customers upload photos and clips.
        if (file.mimetype.toLowerCase() === 'image/svg+xml') {
            cb(new Error('SVG files are not allowed'), false);
        } else if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    }
});

// Containers browsers can actually play back. Anything else falls back to the
// sanitised mimetype subtype below — the extension is never taken from the
// client-supplied originalname.
const VIDEO_EXT = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/3gpp': '3gp',
};

const videoExtension = (mimetype) => {
    const type = mimetype.toLowerCase();
    if (VIDEO_EXT[type]) return VIDEO_EXT[type];
    const subtype = type.split('/')[1]?.replace(/[^a-z0-9]/g, '');
    return subtype || 'bin';
};

// Review media lands on the VPS disk under /uploads/reviews/<yyyy>/<mm>/, the
// same contract as the product images: what we store is a RELATIVE url.
const storeReviewMedia = async (file) => {
    const isVideo = file.mimetype.startsWith('video/');

    if (isVideo) {
        // Stored exactly as uploaded. Cloudinary used to transcode review
        // clips to HLS (streaming_profile 'hd' -> m3u8) for adaptive playback;
        // that went with it, since this image has no ffmpeg and adding
        // transcoding was out of scope. Browsers play mp4/webm directly, which
        // is enough for short clips. To restore it: add ffmpeg to the backend
        // image and transcode out-of-band via a queue — never inline here, a
        // 50 MB transcode would hold the request open for minutes.
        const url = await saveUploadBuffer(file.buffer, videoExtension(file.mimetype), 'reviews');
        return { type: 'video', url };
    }

    const url = await saveUploadImage(file.buffer, file.mimetype, 'reviews');
    return { type: 'image', url };
};

const clientReviewRouter = Router();

clientReviewRouter.post('/create', upload.array('media', 5), async (req, res) => {
    try {
        // Honour the admin "Product reviews" feature toggle.
        if (!(await isFeatureEnabled('productReviews'))) {
            return res.status(403).json({
                message: "Reviews are currently disabled",
                error: true,
                success: false
            });
        }

        const { name, rating, comment, productId } = req.body;

        if (!name || !rating || !comment) {
            return res.status(400).json({
                message: "Name, rating, and comment are required",
                error: true,
                success: false
            });
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5",
                error: true,
                success: false
            });
        }

        // productId is optional; only attach it when it is a valid ObjectId so a
        // malformed value can never break review submission.
        let product = null;
        if (productId && mongoose.Types.ObjectId.isValid(productId)) {
            product = productId;
        }

        let media = [];
        if (req.files && req.files.length > 0) {
            const uploads = await Promise.all(req.files.map(storeReviewMedia));
            media = uploads;
        }

        const review = new ReviewModel({ name, rating: numericRating, comment, media, product });
        await review.save();

        return res.status(201).json({
            message: "Review submitted successfully",
            error: false,
            success: true,
            data: review
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
});

// Reviews + rating summary for a single product (used on the product detail page).
clientReviewRouter.get('/product/:productId', async (req, res) => {
    try {
        // When reviews are turned off, behave as if the product has none so the
        // storefront simply hides the section.
        if (!(await isFeatureEnabled('productReviews'))) {
            return res.json({
                message: "Reviews are disabled",
                error: false,
                success: true,
                data: { productId: req.params.productId, average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, reviews: [] }
            });
        }

        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product id",
                error: true,
                success: false
            });
        }

        const objectId = new mongoose.Types.ObjectId(productId);
        const reviews = await ReviewModel.find({ product: objectId }).sort({ createdAt: -1 });

        const count = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        const average = count > 0 ? sum / count : 0;
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            const k = Math.round(r.rating);
            if (distribution[k] !== undefined) distribution[k] += 1;
        });

        return res.json({
            message: "Product reviews fetched successfully",
            error: false,
            success: true,
            data: {
                productId,
                average: Math.round(average * 10) / 10,
                count,
                distribution,
                reviews
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
});

// Bulk rating summary for many products at once (used by product cards/grids).
// GET /summary?productIds=id1,id2,id3
clientReviewRouter.get('/summary', async (req, res) => {
    try {
        if (!(await isFeatureEnabled('productReviews'))) {
            return res.json({ message: "Reviews are disabled", error: false, success: true, data: {} });
        }

        const raw = (req.query.productIds || '').toString();
        const ids = raw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => mongoose.Types.ObjectId.isValid(s));

        if (ids.length === 0) {
            return res.json({
                message: "No valid product ids",
                error: false,
                success: true,
                data: {}
            });
        }

        const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
        const rows = await ReviewModel.aggregate([
            { $match: { product: { $in: objectIds } } },
            { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const summary = {};
        rows.forEach((row) => {
            summary[row._id.toString()] = {
                average: Math.round((row.average || 0) * 10) / 10,
                count: row.count
            };
        });

        return res.json({
            message: "Rating summary fetched successfully",
            error: false,
            success: true,
            data: summary
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
});

clientReviewRouter.get('/reviews', async (req, res) => {
    try {
        if (!(await isFeatureEnabled('productReviews'))) {
            return res.json({ message: "Reviews are disabled", error: false, success: true, data: [] });
        }

        // Public, anonymous endpoint feeding the homepage testimonials carousel.
        // Cap to the most recent 100 so an ever-growing reviews collection can't
        // turn every page-load into a full-collection scan + unbounded payload;
        // the carousel only rotates through a recent sample anyway.
        const reviews = await ReviewModel.find().sort({ createdAt: -1 }).limit(100).lean();

        return res.json({
            message: "Reviews fetched successfully",
            error: false,
            success: true,
            data: reviews
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
});

export default clientReviewRouter;
