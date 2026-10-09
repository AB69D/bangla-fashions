import { Router } from 'express';
import ProductModel from '../models/product.model.js';

const clientProductRouter = Router();

clientProductRouter.get('/products', async (req, res) => {
    try {
        const { page, limit, search, category } = req.query;

        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 10;

        const query = search ? {
            $or: [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ]
        } : {};

        if (category) {
            query.category = category;
        }

        // Storefront only: hide POS-only products ($ne:false also keeps legacy
        // products where the field was never set).
        query.showInEcommerce = { $ne: false };

        const skip = (pageNum - 1) * limitNum;

        const [data, totalCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('category'),
            ProductModel.countDocuments(query)
        ]);

        return res.json({
            message: "Product data",
            error: false,
            success: true,
            totalCount: totalCount,
            totalNoPage: Math.ceil(totalCount / limitNum),
            data: data
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
});

clientProductRouter.get('/product/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // A malformed id can never match; answer 404 instead of a CastError 500 so
        // the storefront (and crawlers) get a real not-found.
        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(404).json({ message: "Product not found", error: true, success: false });
        }

        // Storefront only: a POS-only product must 404 here even via direct link.
        const product = await ProductModel.findOne({
            _id: id,
            showInEcommerce: { $ne: false }
        }).populate('category');

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            });
        }

        return res.json({
            message: "Product details",
            data: product,
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
});

// POST /api/client/product/by-ids  { ids: string[] }
// Lets browser-held lists (recently viewed, wishlist ids) drop products that
// were deleted or hidden and refresh the ones that still exist. Public, so the
// projection is an allow-list that leaves out costPrice, sku and barcode.
const BY_IDS_LIMIT = 24;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

clientProductRouter.post('/by-ids', async (req, res) => {
    try {
        const { ids } = req.body || {};

        if (!Array.isArray(ids)) {
            return res.status(400).json({
                message: "ids must be an array",
                error: true,
                success: false
            });
        }

        // Invalid entries are skipped, not rejected: a stale localStorage list
        // may hold anything.
        const wanted = [...new Set(
            ids
                .filter((id) => typeof id === 'string' && OBJECT_ID_RE.test(id))
                .map((id) => id.toLowerCase())
        )].slice(0, BY_IDS_LIMIT);

        if (wanted.length === 0) {
            return res.json({
                message: "Product data",
                data: [],
                error: false,
                success: true
            });
        }

        const products = await ProductModel.find({
            _id: { $in: wanted },
            showInEcommerce: { $ne: false }
        })
            .select('firstName lastName cover_image gallery category weights.weight weights.price weights.discountPercent weights.stock weights.images')
            .lean();

        // $in does not preserve order; callers expect the order they sent.
        const position = new Map(wanted.map((id, i) => [id, i]));
        products.sort((a, b) => position.get(String(a._id)) - position.get(String(b._id)));

        return res.json({
            message: "Product data",
            data: products,
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
});

clientProductRouter.get('/top-selling', async (req, res) => {
    try {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit) : 20;

        const OrderModel = (await import('../models/order.model.js')).default;

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
            _id: { $in: productIds },
            showInEcommerce: { $ne: false }
        }).populate('category');

        const productsWithSales = products.map(product => {
            const salesData = topSelling.find(item => item._id === product._id.toString());
            return {
                ...product.toObject(),
                totalSold: salesData ? salesData.totalSold : 0
            };
        });

        productsWithSales.sort((a, b) => b.totalSold - a.totalSold);

        return res.json({
            message: "Top selling products",
            error: false,
            success: true,
            data: productsWithSales
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
});

export default clientProductRouter;