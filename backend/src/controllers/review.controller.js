import ReviewModel from "../models/review.model.js";
import { deleteUploadFiles } from "../lib/uploadFiles.js";
import { logger } from "../lib/logger.js";

export const createReview = async (request, response) => {
    try {
        const { name, rating, comment, media } = request.body;

        if (!name || !rating || !comment) {
            return response.status(400).json({
                message: "Name, rating, and comment are required",
                error: true,
                success: false
            });
        }

        if (rating < 1 || rating > 5) {
            return response.status(400).json({
                message: "Rating must be between 1 and 5",
                error: true,
                success: false
            });
        }

        const parsedMedia = media ? (typeof media === 'string' ? JSON.parse(media) : media) : [];
        const review = new ReviewModel({ name, rating, comment, media: parsedMedia });
        await review.save();

        return response.status(201).json({
            message: "Review created successfully",
            error: false,
            success: true,
            data: review
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const getAllReviews = async (request, response) => {
    try {
        const reviews = await ReviewModel.find()
            .populate('product', 'firstName lastName')
            .sort({ createdAt: -1 });

        return response.json({
            message: "Reviews fetched successfully",
            error: false,
            success: true,
            data: reviews
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const deleteReview = async (request, response) => {
    try {
        const { id } = request.params;

        const deletedReview = await ReviewModel.findByIdAndDelete(id);

        if (!deletedReview) {
            return response.status(404).json({
                message: "Review not found",
                error: true,
                success: false
            });
        }

        // The row is gone, so remove the photo/video files it owned. Best-effort:
        // a failed unlink must not turn a successful delete into an error, and
        // deleteUploadFiles keeps any file something else still references.
        try {
            const urls = (deletedReview.media || []).map((m) => m?.url).filter(Boolean);
            if (urls.length > 0) await deleteUploadFiles(urls);
        } catch (err) {
            logger.error({ err, reviewId: id }, "Failed to remove review media files");
        }

        return response.json({
            message: "Review deleted successfully",
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};
