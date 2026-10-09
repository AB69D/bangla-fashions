import mongoose from "mongoose";
import HeaderModel from "../models/header.model.js";
import { deleteUploadFiles } from "../lib/uploadFiles.js";
import { logger } from "../lib/logger.js";

export const uploadHeaderImageController = async (req, res) => {
    try {
        const { url } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                message: "Please upload an image",
                error: true,
                success: false
            });
        }

        const newHeader = new HeaderModel({
            image: file.path, 
            url: url || ""
        });

        const saved = await newHeader.save();

        return res.json({
            message: "Header image uploaded successfully",
            data: saved,
            success: true,
            error: false
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
            success: false
        });
    }
};

export const getHeaderImagesController = async (req, res) => {
    try {
        const data = await HeaderModel.find().sort({ createdAt: -1 });

        return res.json({
            data: data,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const deleteHeaderImageController = async (req, res) => {
    try {
        const { _id } = req.body;

        if (typeof _id !== "string" || !mongoose.isValidObjectId(_id)) {
            return res.status(400).json({
                message: "Invalid header id",
                success: false,
                error: true
            });
        }

        // Atomic read-and-delete so we know exactly which image file to remove.
        // Deleting an id that is already gone stays a success (idempotent).
        const removed = await HeaderModel.findOneAndDelete({ _id: _id });

        // Only after the banner row is gone, so the file is no longer
        // referenced by it. A failure here must not fail the request: the
        // banner is already deleted.
        if (removed?.image) {
            try {
                const result = await deleteUploadFiles([removed.image]);
                if (result?.failed?.length) {
                    logger.warn({ headerId: String(_id), failed: result.failed }, "Could not delete header image file");
                }
            } catch (err) {
                logger.error({ err, headerId: String(_id) }, "Header image cleanup failed");
            }
        }

        return res.json({
            message: "Header image deleted successfully",
            data: { acknowledged: true, deletedCount: removed ? 1 : 0 },
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        });
    }
};
