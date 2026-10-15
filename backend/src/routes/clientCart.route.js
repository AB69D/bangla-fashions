import { Router } from 'express';
import CartModel from '../models/cart.model.js';
import ProductModel, { lineLabel } from '../models/product.model.js';
import { isStockVisible } from '../lib/publicProduct.js';
import { resolveColorChoice } from '../lib/colorChoice.js';
import { findMissingProductIds, pruneCartsByProduct } from '../services/productCascade.js';
import { logger } from '../lib/logger.js';

const clientCartRouter = Router();

const getGuestId = (req) => {
    return req.headers['guest-id'] || null;
};

// Why a quantity was refused. While stock is hidden from shoppers the message
// must not carry the count either, or it would leak what the product page hides.
const shortStockMessage = (showStock, available) => {
    if (available <= 0) return 'This item is out of stock';
    return showStock
        ? `Only ${available} items available in stock`
        : 'Sorry, that quantity is not available right now';
};

// Units of one size already in the cart, across every colour. Stock is kept per
// size (colour does not split it), so two colours of the same size draw from the
// same pool and the quantity limit has to be checked on the sum.
const sizeQuantityInCart = (cart, productId, weightIndex, exceptItemId = null) =>
    cart.items
        .filter((it) => it.productId === productId && it.weightIndex === weightIndex
            && (exceptItemId === null || String(it._id) !== exceptItemId))
        .reduce((sum, it) => sum + it.quantity, 0);

// Self-heal on read. Deleting a product pulls it from every cart, but a cart can
// still hold a line for a product that is gone (deleted before the cascade
// existed, or written by a stale tab afterwards). Such a line can never be
// bought: checkout would fail with a misleading "just sold out". Drop it and
// recompute the stored total (checkout trusts it) in one atomic write, then
// re-read. Never fail the cart fetch over it: on error serve the cart as stored.
const healCart = async (cart, guestId) => {
    try {
        const missing = await findMissingProductIds(cart.items.map((item) => item.productId));
        if (missing.size === 0) return cart;
        await pruneCartsByProduct([...missing], { guestId });
        return (await CartModel.findOne({ guestId })) || cart;
    } catch (err) {
        logger.error({ err, guestId }, 'Cart self-heal failed');
        return cart;
    }
};

clientCartRouter.get('/get', async (req, res) => {
    try {
        let guestId = getGuestId(req);
        if (!guestId) {
            guestId = `guest_${Date.now()}`;
        }

        let cart = await CartModel.findOne({ guestId });

        if (!cart) {
            cart = new CartModel({
                guestId: guestId,
                items: [],
                totalAmount: 0
            });
            await cart.save();
        } else if (cart.items.length > 0) {
            cart = await healCart(cart, guestId);
        }

        res.setHeader('guest-id', guestId);
        
        res.json({
            message: "Cart data",
            data: cart,
            error: false,
            success: true
        });
    } catch (error) {
        console.error('Cart get error:', error);
        res.status(500).json({
            message: error.message,
            error: true,
            success: false
        });
    }
});

clientCartRouter.post('/add', async (req, res) => {
    try {
        const { productId, productName, productImage, quantity = 1, weightIndex = 0, color } = req.body;
        let guestId = getGuestId(req);

        // Ensure weightIndex is a number
        const weightIdx = Number(weightIndex) || 0;
        const qty = Number(quantity) || 1;

        if (!guestId) {
            guestId = `guest_${Date.now()}`;
        }

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required",
                error: true,
                success: false
            });
        }

        // Check stock before adding - convert productId to ObjectId if needed
        const product = await ProductModel.findById(productId);

        if (!product || !product.weights || !product.weights[weightIdx]) {
            return res.status(400).json({
                message: "Product or weight variant not found",
                error: true,
                success: false
            });
        }

        // Which colour, if the product has any. Checked against the product's own
        // list, never taken on trust.
        const choice = resolveColorChoice(product, color);
        if (!choice.ok) {
            return res.status(400).json({
                message: choice.message,
                error: true,
                success: false
            });
        }

        // Price and discount always come from the product record, never the
        // client — a client-supplied price here would flow straight through
        // to the order total at checkout.
        const price = product.weights[weightIdx].price;
        const discountPercent = product.weights[weightIdx].discountPercent || 0;

        const showStock = await isStockVisible();
        const availableStock = product.weights[weightIdx]?.stock || 0;
        if (availableStock < qty) {
            return res.status(400).json({
                message: shortStockMessage(showStock, availableStock),
                error: true,
                success: false
            });
        }

        let cart = await CartModel.findOne({ guestId });
        
        if (!cart) {
            cart = new CartModel({
                guestId: guestId,
                items: [],
                totalAmount: 0
            });
        }

        // Clean up old items - check if any item has old 'product' field
        const hasOldFormat = cart.items.some(item => item.product && !item.productId);
        if (hasOldFormat) {
            await CartModel.deleteOne({ guestId });
            cart = new CartModel({
                guestId: guestId,
                items: [],
                totalAmount: 0
            });
        }

        // The size's stock is shared by all its colours: what is already in the
        // cart under any colour counts against it.
        const inCartForSize = sizeQuantityInCart(cart, productId, weightIdx);
        if (inCartForSize + qty > availableStock) {
            return res.status(400).json({
                message: showStock
                    ? `Only ${availableStock} items available. You already have ${inCartForSize} in cart.`
                    : 'Sorry, you cannot add more of this item right now',
                error: true,
                success: false
            });
        }

        // Same product, size AND colour is the same line; another colour is a new one.
        const existingItemIndex = cart.items.findIndex(
            item => item.productId === productId && item.weightIndex === weightIdx
                && (item.color || '') === choice.color
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += qty;
            cart.items[existingItemIndex].price = price;
            cart.items[existingItemIndex].discountPercent = discountPercent || 0;
        } else {
            cart.items.push({
                productId: productId,
                // Fall back to the product record we already loaded above —
                // a caller that only sends productId (no display fields)
                // shouldn't end up with a nameless line item in the cart.
                productName: productName || product.firstName || '',
                productImage: productImage || product.cover_image || '',
                quantity: qty,
                // Built from the product record, never the client.
                weight: lineLabel(product.weights[weightIdx].weight, choice.color),
                color: choice.color,
                weightIndex: weightIdx,
                price: price,
                discountPercent: discountPercent || 0
            });
        }

        // Recalculate total - each item price * quantity (after discount)
        cart.totalAmount = cart.items.reduce((total, item) => {
            const discountedPrice = item.price - (item.price * (item.discountPercent || 0) / 100);
            return total + (discountedPrice * item.quantity);
        }, 0);

        await cart.save();

        res.setHeader('guest-id', guestId);

        res.json({
            message: "Product added to cart",
            data: cart,
            error: false,
            success: true
        });
    } catch (error) {
        console.error('Cart add error:', error);
        res.status(500).json({
            message: error.message,
            error: true,
            success: false
        });
    }
});

clientCartRouter.put('/update', async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const guestId = getGuestId(req);

        if (!guestId) {
            return res.status(400).json({
                message: "Guest ID required",
                error: true,
                success: false
            });
        }

        const cart = await CartModel.findOne({ guestId });
        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
                error: true,
                success: false
            });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex > -1) {
            const cartItem = cart.items[itemIndex];
            const newQty = Number(quantity) || 0;
            
            // Check stock availability when increasing quantity. The size's stock
            // is shared by its colours, so the other lines of that size count too.
            if (newQty > cartItem.quantity) {
                const product = await ProductModel.findById(cartItem.productId);
                if (product && product.weights && product.weights[cartItem.weightIndex] !== undefined) {
                    const availableStock = product.weights[cartItem.weightIndex]?.stock || 0;
                    const inOtherLines = sizeQuantityInCart(cart, cartItem.productId, cartItem.weightIndex, String(cartItem._id));
                    if (newQty + inOtherLines > availableStock) {
                        return res.status(400).json({
                            message: shortStockMessage(await isStockVisible(), availableStock),
                            error: true,
                            success: false
                        });
                    }
                }
            }
            
            if (newQty > 0) {
                cart.items[itemIndex].quantity = newQty;
            } else {
                cart.items.splice(itemIndex, 1);
            }
            cart.totalAmount = cart.items.reduce((total, item) => {
                const discountedPrice = item.price - (item.price * (item.discountPercent || 0) / 100);
                return total + (discountedPrice * item.quantity);
            }, 0);
            await cart.save();
        }

        res.json({
            message: "Cart updated",
            data: cart,
            error: false,
            success: true
        });
    } catch (error) {
        console.error('Cart update error:', error);
        res.status(500).json({
            message: error.message,
            error: true,
            success: false
        });
    }
});

clientCartRouter.delete('/remove/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const guestId = getGuestId(req);

        if (!guestId) {
            return res.status(400).json({
                message: "Guest ID required",
                error: true,
                success: false
            });
        }

        const cart = await CartModel.findOne({ guestId });
        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
                error: true,
                success: false
            });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        cart.totalAmount = cart.items.reduce((total, item) => {
            const discountedPrice = item.price - (item.price * (item.discountPercent || 0) / 100);
            return total + (discountedPrice * item.quantity);
        }, 0);
        await cart.save();

        res.json({
            message: "Item removed from cart",
            data: cart,
            error: false,
            success: true
        });
    } catch (error) {
        console.error('Cart remove error:', error);
        res.status(500).json({
            message: error.message,
            error: true,
            success: false
        });
    }
});

export default clientCartRouter;