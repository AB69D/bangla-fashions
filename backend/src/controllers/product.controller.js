import ProductModel, { ensureVariantCodes, isValidImageLocation } from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import OrderModel from "../models/order.model.js";
import mongoose from "mongoose";
import { ApiError } from "../lib/ApiError.js";
import { logger } from "../lib/logger.js";
import { collectProductImageUrls, deleteUploadFiles } from "../lib/uploadFiles.js";
import { deleteProductCascade, blankOrderLineImages } from "../services/productCascade.js";

// Matches productUpload's per-field maxCount in product.route.js.
const MAX_IMAGES_PER_LIST = 10;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

// ApiError and mongoose validation/cast failures are the caller's fault (400);
// everything else is a genuine 500. Keeps the { message, error, success } shape
// every handler in this file already uses.
const sendError = (response, error) => {
    let status = 500;
    if (error instanceof ApiError) status = error.statusCode;
    else if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) status = 400;
    return response.status(status).json({
        message: error.message || error,
        error: true,
        success: false
    });
};

// multer's req.files is an object keyed by field name for .fields() uploads;
// JSON requests (and .array() uploads) have no such object.
const uploadedFiles = (request) =>
    request.files && !Array.isArray(request.files) ? request.files : {};

// URLs processAndUploadImages wrote for one multipart field, in the order the
// client sent the files. Position matters ({ new: i } indexes into this list),
// so a file with no URL stays as '' instead of being filtered out.
const uploadedUrls = (files, field) => {
    const list = files[field];
    if (!list) return [];
    return (Array.isArray(list) ? list : [list]).map((f) => (typeof f?.path === 'string' ? f.path : ''));
};

const allUploadedUrls = (files) =>
    Object.keys(files).flatMap((field) => uploadedUrls(files, field)).filter(Boolean);

// Multipart bodies can only carry strings, so weights/qa/gallery arrive as JSON
// text; JSON requests already hold the parsed value.
const parseJsonField = (value, label) => {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        throw ApiError.badRequest(`Invalid ${label} format`);
    }
};

const parseBoolean = (value) =>
    value === true || value === 'true' || value === 1 || value === '1';

const toNumber = (value, label, { fallback, min, max } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (fallback === undefined) throw ApiError.badRequest(`${label} is required`);
        return fallback;
    }
    const n = typeof value === 'number' ? value : (typeof value === 'string' ? Number(value) : NaN);
    if (!Number.isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
        throw ApiError.badRequest(`${label} is invalid`);
    }
    return n;
};

// Turn a client-supplied image list into final URLs. Each item is either
//   - a string: a URL the product already owns (`allowed` = its current image
//     set). Anything else is refused, so a request can never attach a file that
//     belongs to another product or an arbitrary path, and
//   - { new: <int> }: the n-th file uploaded in this request for this list.
// The caller later deletes every file that drops out of the product, so this
// check is what keeps a bad request from deleting or adopting the wrong file.
const resolveImageItems = (items, { label, uploaded, allowed }) => {
    if (!Array.isArray(items)) throw ApiError.badRequest(`${label} must be an array`);
    if (items.length > MAX_IMAGES_PER_LIST) {
        throw ApiError.badRequest(`${label}: at most ${MAX_IMAGES_PER_LIST} images are allowed`);
    }
    const urls = [];
    for (const item of items) {
        let url;
        if (typeof item === 'string') {
            if (!allowed.has(item)) {
                throw ApiError.badRequest(`${label}: "${item.slice(0, 200)}" is not an image of this product`);
            }
            url = item;
        } else if (item && typeof item === 'object' && !Array.isArray(item) && Number.isInteger(item.new) && item.new >= 0) {
            url = uploaded[item.new];
            if (!url) throw ApiError.badRequest(`${label}: no uploaded file at position ${item.new}`);
        } else {
            throw ApiError.badRequest(`${label}: each image must be a URL string or { "new": <file index> }`);
        }
        if (!urls.includes(url)) urls.push(url);
    }
    return urls;
};

// One edited size/variant -> the document stored in product.weights. Images
// are only touched when the client sent them; a variant without an `images`
// key keeps whatever the variant at the same index already had.
const normalizeWeight = (raw, index, { existing, files, allowed }) => {
    const n = index + 1;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw ApiError.badRequest(`Variant ${n} is invalid`);
    }
    const weight = raw.weight === undefined || raw.weight === null ? '' : String(raw.weight);
    if (!weight.trim()) throw ApiError.badRequest(`Variant ${n}: size / weight label is required`);

    let images;
    if (raw.images === undefined) {
        images = Array.isArray(existing?.images) ? [...existing.images] : [];
    } else {
        images = resolveImageItems(raw.images, {
            label: `Variant ${n} images`,
            uploaded: uploadedUrls(files, `weight_images_${index}`),
            allowed
        });
    }

    return {
        weight,
        stock: toNumber(raw.stock, `Variant ${n}: stock`, { fallback: 0 }),
        price: toNumber(raw.price, `Variant ${n}: price`, { min: 0 }),
        discountPercent: toNumber(raw.discountPercent, `Variant ${n}: discount`, { fallback: 0, min: 0, max: 100 }),
        costPrice: toNumber(raw.costPrice, `Variant ${n}: cost price`, { fallback: 0, min: 0 }),
        sku: typeof raw.sku === 'string' ? raw.sku.trim() : '',
        barcode: typeof raw.barcode === 'string' ? raw.barcode.trim() : '',
        images
    };
};

const normalizeQa = (raw) => {
    const list = parseJsonField(raw, 'qa');
    if (!Array.isArray(list)) throw ApiError.badRequest('Invalid qa format');
    return list
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            // Keep an existing entry's id stable across edits.
            ...(OBJECT_ID_RE.test(String(item._id ?? '')) ? { _id: item._id } : {}),
            question: String(item.question ?? '').trim(),
            answer: String(item.answer ?? '').trim()
        }))
        // question and answer are both required by the schema; updateOne does
        // not validate, so drop half-filled rows here instead of storing them.
        .filter((item) => item.question && item.answer);
};

export const createProductController = async (request, response) => {
    try {
        const {
            firstName,
            lastName,
            category,
            weights,
            description,
            qa,
            showInEcommerce
        } = request.body || {};

        // Sent over multipart form-data, so it arrives as a string ("true"/"false").
        // Default to visible when the field is omitted.
        const showOnStorefront = showInEcommerce === undefined
            ? true
            : (showInEcommerce === true || showInEcommerce === 'true' || showInEcommerce === '1');

        const files = uploadedFiles(request);
        const gallery = uploadedUrls(files, 'gallery_images').filter(Boolean);
        // In "Product gallery" mode there is no separate cover input, so the
        // first gallery photo doubles as the cover shown on cards and lists.
        const cover_image = uploadedUrls(files, 'cover_image').find(Boolean) || gallery[0] || "";

        if (!firstName || !category || !weights) {
            return response.status(400).json({
                message: "Enter required fields (firstName, category, weights)",
                error: true,
                success: false
            });
        }

        if (gallery.length > MAX_IMAGES_PER_LIST) {
            return response.status(400).json({
                message: `A product can have at most ${MAX_IMAGES_PER_LIST} gallery images`,
                error: true,
                success: false
            });
        }

        if (typeof category !== 'string') {
            return response.status(400).json({
                message: "Invalid category",
                error: true,
                success: false
            });
        }

        let categoryId = category;
        if (OBJECT_ID_RE.test(category)) {
            if (!(await CategoryModel.exists({ _id: category }))) {
                return response.status(400).json({
                    message: `Category not found: ${category}`,
                    error: true,
                    success: false
                });
            }
        } else {
            const foundCat = await CategoryModel.findOne({ category_name: category });
            if (!foundCat) {
                return response.status(400).json({
                    message: `Category not found: ${category}`,
                    error: true,
                    success: false
                });
            }
            categoryId = foundCat._id;
        }

        let weightsArray = [];
        try {
            weightsArray = typeof weights === 'string' ? JSON.parse(weights) : weights;
        } catch (error) {
            return response.status(400).json({
                message: "Invalid weights format",
                error: true,
                success: false
            });
        }

        if (!Array.isArray(weightsArray) || weightsArray.some((w) => !w || typeof w !== 'object')) {
            return response.status(400).json({
                message: "Invalid weights format",
                error: true,
                success: false
            });
        }

        const processedWeights = weightsArray.map((weightObj, index) => ({
            weight: weightObj.weight,
            stock: weightObj.stock,
            price: weightObj.price,
            discountPercent: weightObj.discountPercent || 0,
            costPrice: weightObj.costPrice || 0,
            sku: weightObj.sku || '',
            barcode: weightObj.barcode || '',
            images: uploadedUrls(files, `weight_images_${index}`).filter(Boolean)
        }));

        let qaArray = [];
        try {
            qaArray = typeof qa === 'string' ? JSON.parse(qa) : (qa || []);
        } catch (error) {
            qaArray = [];
        }
        if (!Array.isArray(qaArray)) qaArray = [];

        const product = new ProductModel({
            cover_image,
            gallery,
            firstName,
            lastName: lastName || "",
            category: categoryId,
            weights: processedWeights,
            description: description || "",
            qa: qaArray,
            showInEcommerce: showOnStorefront
        });

        const saveProduct = await product.save();

        return response.json({
            message: "Product Created Successfully",
            data: saveProduct,
            error: false,
            success: true
        });

    } catch (error) {
        return sendError(response, error);
    }
};

export const getProductController = async (request, response) => {
    try {
        let { page, limit, search } = request.body;

        if (!page) page = 1;
        if (!limit) limit = 10;

        const query = search ? {
            $or: [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const skip = (page - 1) * limit;

        const [data, totalCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category'),
            ProductModel.countDocuments(query)
        ]);

        return response.json({
            message: "Product data",
            error: false,
            success: true,
            totalCount: totalCount,
            totalNoPage: Math.ceil(totalCount / limit),
            data: data
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const getProductByCategory = async (request, response) => {
    try {
        const { id } = request.body;

        if (!id) {
            return response.status(400).json({
                message: "provide category id",
                error: true,
                success: false
            });
        }

        const product = await ProductModel.find({
            category: { $in: id }
        }).limit(15);

        return response.json({
            message: "category product list",
            data: product,
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

export const getProductDetails = async (request, response) => {
    try {
        const { productId } = request.body;

        const product = await ProductModel.findOne({ _id: productId }).populate('category');

        return response.json({
            message: "product details",
            data: product,
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

// PUT /api/admin/product/update-product-details  (multipart or JSON)
//
// Only whitelisted fields are ever written (never the raw body). A key that is
// absent from the request leaves that field untouched; a key that is present
// replaces it. Image files that drop out of the product are deleted from disk
// after the database write, so every image decision below is made against the
// product's CURRENT image set, never against client-supplied URLs alone.
export const updateProductDetails = async (request, response) => {
    try {
        const body = request.body || {};
        const { _id } = body;

        if (!_id) {
            return response.status(400).json({
                message: "provide product _id",
                error: true,
                success: false
            });
        }
        if (typeof _id !== 'string' || !OBJECT_ID_RE.test(_id)) {
            return response.status(400).json({
                message: "Invalid product _id",
                error: true,
                success: false
            });
        }

        const existing = await ProductModel.findById(_id).lean();
        if (!existing) {
            return response.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            });
        }

        const files = uploadedFiles(request);
        // The only URLs a request may keep or move around: what this product
        // already owns. New files come exclusively through the upload fields.
        const allowed = new Set(collectProductImageUrls(existing));
        const update = {};

        if (body.firstName !== undefined) {
            if (typeof body.firstName !== 'string' || !body.firstName.trim()) {
                throw ApiError.badRequest('firstName cannot be empty');
            }
            update.firstName = body.firstName.trim();
        }
        for (const field of ['lastName', 'description']) {
            if (body[field] === undefined) continue;
            if (body[field] !== null && typeof body[field] !== 'string') {
                throw ApiError.badRequest(`Invalid ${field}`);
            }
            update[field] = body[field] ?? '';
        }

        if (body.category !== undefined) {
            if (typeof body.category !== 'string' || !OBJECT_ID_RE.test(body.category)
                || !(await CategoryModel.exists({ _id: body.category }))) {
                throw ApiError.badRequest('Category not found');
            }
            update.category = body.category;
        }

        // Normalise the storefront visibility flag to a real boolean.
        if (body.showInEcommerce !== undefined) {
            update.showInEcommerce = parseBoolean(body.showInEcommerce);
        }

        if (body.qa !== undefined) update.qa = normalizeQa(body.qa);

        if (body.weights !== undefined) {
            const weightsInput = parseJsonField(body.weights, 'weights');
            if (!Array.isArray(weightsInput)) throw ApiError.badRequest('Invalid weights format');
            // SKU slug needs the product name; fall back to the stored doc.
            const nameSeed = update.firstName ?? existing.firstName ?? '';
            // updateOne()/findOneAndUpdate() do NOT run the model's pre('save')
            // hook, so back-fill any blank barcode / SKU here to keep every
            // variant scannable after an edit.
            update.weights = weightsInput.map((w, i) => ensureVariantCodes(
                normalizeWeight(w, i, { existing: existing.weights?.[i], files, allowed }),
                i,
                nameSeed
            ));
        }

        if (body.gallery !== undefined) {
            update.gallery = resolveImageItems(parseJsonField(body.gallery, 'gallery'), {
                label: 'Gallery',
                uploaded: uploadedUrls(files, 'gallery_images'),
                allowed
            });
            if (!update.gallery.every(isValidImageLocation)) {
                throw ApiError.badRequest('Gallery contains an invalid image location');
            }
        }

        // Cover image. An uploaded file wins, then an explicit text value (a URL
        // the product already owns, or '' to clear). With neither, the cover is
        // left alone unless the gallery changed: the cover then follows the first
        // gallery photo so lists and cards stay in step with the slider.
        let cover = existing.cover_image || '';
        const coverFile = uploadedUrls(files, 'cover_image').find(Boolean);
        if (coverFile) {
            cover = coverFile;
        } else if (body.cover_image !== undefined) {
            if (typeof body.cover_image !== 'string') throw ApiError.badRequest('Invalid cover_image');
            if (body.cover_image !== '' && !allowed.has(body.cover_image)) {
                throw ApiError.badRequest('cover_image is not an image of this product');
            }
            cover = body.cover_image;
        } else if (update.gallery !== undefined) {
            const oldFirst = Array.isArray(existing.gallery) ? existing.gallery[0] : undefined;
            if (update.gallery.length > 0) cover = update.gallery[0];
            else if (cover && cover === oldFirst) cover = '';
        }
        if (cover !== (existing.cover_image || '')) update.cover_image = cover;

        // Everything the product will reference after this write.
        const keepUrls = new Set(collectProductImageUrls({
            cover_image: cover,
            gallery: update.gallery ?? existing.gallery ?? [],
            weights: update.weights ?? existing.weights ?? []
        }));
        // Files uploaded in this request that nothing above ended up using
        // (a client that sends files without referencing them): they would
        // otherwise stay on disk forever because the request succeeds.
        const unusedUploads = allUploadedUrls(files).filter((url) => !keepUrls.has(url));

        // new:false hands back the document as it was immediately BEFORE this
        // write, so the removed-file diff below is exact even if another admin
        // edited the product after the read above.
        const before = await ProductModel.findOneAndUpdate({ _id }, { $set: update }, { new: false }).lean();
        if (!before) {
            // Deleted between the read and the write. The 404 makes the upload
            // middleware discard this request's new files.
            return response.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            });
        }

        // From here the product is committed: nothing below may turn this
        // request into a 4xx/5xx (the upload middleware would then try to
        // discard the files the product now references).
        const removed = collectProductImageUrls(before).filter((url) => !keepUrls.has(url));
        const removedSet = new Set(removed);
        let removedFiles = 0;
        let cleanup = null;
        const toDelete = [...new Set([...removed, ...unusedUploads])];
        if (toDelete.length) {
            try {
                cleanup = await deleteUploadFiles(toDelete);
                const deletedProductFiles = cleanup.deleted.filter((url) => removedSet.has(url));
                removedFiles = deletedProductFiles.length;
                if (cleanup.failed.length) {
                    logger.warn({ productId: _id, failed: cleanup.failed }, 'Some removed product images could not be deleted from disk');
                }
                try {
                    await blankOrderLineImages(deletedProductFiles);
                } catch (err) {
                    logger.error({ err, productId: _id }, 'Failed to blank deleted product images on order lines');
                }
            } catch (err) {
                logger.error({ err, productId: _id }, 'Failed to delete removed product images');
            }
        }
        // Record which product was edited (the route has no id in its path) and
        // which files left the disk, so an image removal is traceable.
        request.audit?.({
            action: 'product.update',
            resource: 'Product',
            resourceId: _id,
            meta: cleanup ? { deletedFiles: cleanup.deleted, keptReferenced: cleanup.keptReferenced } : undefined
        });

        let data = null;
        try {
            data = await ProductModel.findById(_id).populate('category');
        } catch (err) {
            logger.error({ err, productId: _id }, 'Failed to reload product after update');
        }

        return response.json({
            message: "updated successfully",
            data,
            removedFiles,
            error: false,
            success: true
        });

    } catch (error) {
        return sendError(response, error);
    }
};

// DELETE /api/admin/product/delete-product
// Hard delete: the cascade (reviews, cart/wishlist lines, landing-page order
// forms, image files) lives in services/productCascade.js so it can be reused
// by maintenance scripts.
export const deleteProductDetails = async (request, response) => {
    try {
        const { _id } = request.body || {};

        if (!_id) {
            return response.status(400).json({
                message: "provide _id ",
                error: true,
                success: false
            });
        }
        if (typeof _id !== 'string' || !OBJECT_ID_RE.test(_id)) {
            return response.status(400).json({
                message: "Invalid product _id",
                error: true,
                success: false
            });
        }

        const result = await deleteProductCascade(_id, { req: request });
        if (!result) {
            return response.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            });
        }

        return response.json({
            message: "Product deleted",
            error: false,
            success: true,
            data: result
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const updateProductDiscount = async (request, response) => {
    try {
        const { productId, weightIndex, discountPercent } = request.body;

        if (!productId) {
            return response.status(400).json({
                message: "provide productId",
                error: true,
                success: false
            });
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
            return response.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            });
        }

        if (weightIndex !== undefined && product.weights[weightIndex]) {
            product.weights[weightIndex].discountPercent = discountPercent || 0;
            await product.save();
        }

        return response.json({
            message: "Discount updated successfully",
            data: product,
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

export const searchProduct = async (request, response) => {
    try {
        let { search, page, limit } = request.body;

        if (!page) page = 1;
        if (!limit) limit = 10;

        const query = search ? {
            $or: [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const skip = (page - 1) * limit;

        const [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category'),
            ProductModel.countDocuments(query)
        ]);

        return response.json({
            message: "Product data",
            error: false,
            success: true,
            data: data,
            totalCount: dataCount,
            totalPage: Math.ceil(dataCount / limit),
            page: page,
            limit: limit
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

// POST /api/admin/product/backfill-codes
// One-time maintenance: give every existing variant a scannable barcode + SKU.
// Products created before the barcode feature have blank codes, so this walks
// the catalogue and saves any product with a missing code (firing the
// pre('save') hook to generate them). Idempotent — re-running is a no-op.
export const backfillProductCodes = async (request, response) => {
    try {
        const products = await ProductModel.find({
            $or: [
                { 'weights.barcode': { $in: ['', null] } },
                { 'weights.sku': { $in: ['', null] } },
                { 'weights.barcode': { $exists: false } },
                { 'weights.sku': { $exists: false } },
            ],
        });

        let updated = 0;
        for (const product of products) {
            const before = JSON.stringify(
                (product.weights || []).map((w) => [w.barcode, w.sku]),
            );
            // Touching the doc + save() runs the pre('save') hook which fills blanks.
            product.markModified('weights');
            await product.save();
            const after = JSON.stringify(
                (product.weights || []).map((w) => [w.barcode, w.sku]),
            );
            if (before !== after) updated += 1;
        }

        return response.json({
            message: `Generated codes for ${updated} product(s)`,
            error: false,
            success: true,
            data: { scanned: products.length, updated },
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};

export const getTopSellingProducts = async (request, response) => {
    try {
        const { limit } = request.query;
        const limitNum = limit ? parseInt(limit) : 20;

        const topSelling = await OrderModel.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: limitNum }
        ]);

        const productIds = topSelling.map(item => item._id);

        const products = await ProductModel.find({
            _id: { $in: productIds }
        }).populate('category');

        const productsWithSales = products.map(product => {
            const salesData = topSelling.find(item => item._id === product._id.toString());
            return {
                ...product.toObject(),
                totalSold: salesData ? salesData.totalSold : 0
            };
        });

        productsWithSales.sort((a, b) => b.totalSold - a.totalSold);

        return response.json({
            message: "Top selling products",
            error: false,
            success: true,
            data: productsWithSales
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};