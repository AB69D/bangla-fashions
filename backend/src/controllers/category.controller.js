import mongoose from "mongoose";
import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import { getOrCreateOtherCategory, isReservedCategoryName, OTHER_SYSTEM_KEY } from "../lib/otherCategory.js";
import { deleteUploadFiles } from "../lib/uploadFiles.js";
import { logger } from "../lib/logger.js";

// Best-effort removal of a category image from disk. The DB write it follows
// has already succeeded, so a failure here is logged and never surfaced to the
// admin (deleteUploadFiles itself does not throw; the catch is belt and braces).
const removeCategoryImage = async (url, categoryId) => {
    if (!url) return;
    try {
        const result = await deleteUploadFiles([url]);
        if (result?.failed?.length) {
            logger.warn({ categoryId: String(categoryId), failed: result.failed }, "Could not delete category image file");
        }
    } catch (err) {
        logger.error({ err, categoryId: String(categoryId) }, "Category image cleanup failed");
    }
};

export const AddCategoryController = async (req, res) => {
    try {

        const { category_name } = req.body;
        const file = req.file;
        console.log(`category_name: ${category_name}`)
        console.log(`file: ${file}`)

        const name = typeof category_name === "string" ? category_name.trim() : "";

        if (!name || !file) {
            return res.status(400).json({
                message: "Enter required fields",
                error: true,
                success: false
            });
        }

        // "Other" already exists as the system category (created on demand when
        // a category is deleted); a second one would be ambiguous.
        if (isReservedCategoryName(name)) {
            return res.status(400).json({
                message: "\"Other\" is a reserved category name",
                error: true,
                success: false
            });
        }

        const category = new CategoryModel({
            category_name: name,
            category_image: file.path
        });

        const saved = await category.save();

        return res.json({
            message: "Add Category Successfully",
            data: saved,
            success: true,
            error: false
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message || "Internal Server Error",
            error: true,
            success: false
        });
    }
};
export const getCategoryController = async (request, response) => {
    try {

        const data = await CategoryModel.find().sort({ createdAt: -1 })

        return response.json({
            data: data,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
};

// Storefront list. Same as the admin list, except the system "Other" category
// is hidden while it has no live products (an empty Other in the menu would be
// a dead end) and, once shown, is listed last.
export const getStorefrontCategoryController = async (request, response) => {
    try {

        const all = await CategoryModel.find().sort({ createdAt: -1 })
        const other = all.find((c) => c.systemKey === OTHER_SYSTEM_KEY)

        let data = all
        if (other) {
            data = all.filter((c) => c !== other)
            const hasProducts = await ProductModel.exists({
                category: other._id,
                showInEcommerce: { $ne: false }
            })
            if (hasProducts) data.push(other)
        }

        return response.json({
            data: data,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
};

export const updateCategoryController = async (request, response) => {
    try {
        const { _id, category_name, category_image } = request.body

        if (typeof _id !== "string" || !mongoose.isValidObjectId(_id)) {
            return response.status(400).json({
                message: "Invalid category id",
                success: false,
                error: true
            })
        }

        const existing = await CategoryModel.findById(_id)
        if (!existing) {
            return response.status(404).json({
                message: "Category not found",
                success: false,
                error: true
            })
        }

        let updateData = {};

        if (typeof category_name === "string" && category_name.trim()) {
            const name = category_name.trim();
            const currentName = String(existing.category_name || "").trim();

            if (existing.systemKey) {
                // Code relies on this category by key, but admins and the
                // storefront identify it by name, so the name stays fixed.
                // Re-sending the unchanged name (the edit form does) is fine.
                if (name !== currentName) {
                    return response.status(400).json({
                        message: "The \"Other\" category cannot be renamed",
                        success: false,
                        error: true
                    })
                }
            } else {
                if (isReservedCategoryName(name)) {
                    return response.status(400).json({
                        message: "\"Other\" is a reserved category name",
                        success: false,
                        error: true
                    })
                }
                if (name !== existing.category_name) updateData.category_name = name;
            }
        }

        const file = request.file;
        if (file) {
            updateData.category_image = file.path;
        } else if (typeof category_image === "string" && category_image.trim()) {
            updateData.category_image = category_image.trim();
        }

        const previousImage = existing.category_image;
        const imageChanged = updateData.category_image !== undefined
            && updateData.category_image !== previousImage;
        if (!imageChanged) delete updateData.category_image;

        let saved = existing;
        if (Object.keys(updateData).length > 0) {
            saved = await CategoryModel.findOneAndUpdate(
                { _id: existing._id },
                { $set: updateData },
                { new: true }
            )
            if (!saved) {
                // Deleted by someone else between the read and the write.
                return response.status(404).json({
                    message: "Category not found",
                    success: false,
                    error: true
                })
            }
        }

        // Only after the new image is saved on the category: the old file is
        // no longer referenced by it and can be removed from disk.
        if (imageChanged) await removeCategoryImage(previousImage, existing._id);

        return response.json({
            message: "Updated Category Successfully",
            success: true,
            error: false,
            data: saved
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
};

export const deleteCategoryController = async (request, response) => {
    try {
        const { _id } = request.body

        if (typeof _id !== "string" || !mongoose.isValidObjectId(_id)) {
            return response.status(400).json({
                message: "Invalid category id",
                success: false,
                error: true
            })
        }

        const category = await CategoryModel.findById(_id)
        if (!category) {
            return response.status(404).json({
                message: "Category not found",
                success: false,
                error: true
            })
        }

        // A legacy category literally named "Other" (no systemKey stamped yet) is
        // adopted by getOrCreateOtherCategory, so deleting it would leave its
        // products pointing at a category that no longer exists.
        if (category.systemKey || isReservedCategoryName(category.category_name)) {
            return response.status(400).json({
                message: "The \"Other\" category cannot be deleted",
                success: false,
                error: true
            })
        }

        // Mongo runs standalone (no transactions), so the order is what keeps
        // this safe: products are re-homed first, and only then is the category
        // removed. If the process dies in between, deleting again finishes the
        // job and no product is ever left pointing at a missing category.
        let other = null
        let movedProducts = 0

        const moveProducts = async () => {
            if (!(await ProductModel.exists({ category: category._id }))) return 0
            other = other || await getOrCreateOtherCategory()
            const moved = await ProductModel.updateMany(
                { category: category._id },
                { $set: { category: other._id } }
            )
            return moved.modifiedCount || 0
        }

        movedProducts += await moveProducts()

        await CategoryModel.deleteOne({ _id: category._id })

        // Second pass for a product created or edited (from a stale admin tab)
        // between the first pass and the delete.
        movedProducts += await moveProducts()

        await removeCategoryImage(category.category_image, category._id)

        if (!other) {
            // Nothing was moved, so don't create Other just to report it.
            other = await CategoryModel.findOne({ systemKey: OTHER_SYSTEM_KEY }).select("_id")
        }

        const message = movedProducts > 0
            ? `Category deleted. ${movedProducts} product${movedProducts === 1 ? "" : "s"} moved to "Other".`
            : "Category deleted"

        request.audit?.({
            action: "category.delete",
            resource: "Category",
            resourceId: category._id,
            message,
            before: { category_name: category.category_name, category_image: category.category_image },
            meta: { movedProducts, otherCategoryId: other ? String(other._id) : null }
        })

        return response.json({
            message,
            data: {
                movedProducts,
                otherCategoryId: other ? String(other._id) : null
            },
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
};
