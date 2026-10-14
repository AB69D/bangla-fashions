import { getSettings } from './siteSettings.js';
import { CATALOG_DEFAULTS } from '../models/siteSettings.model.js';

// Stock visibility for everything the storefront can read.
//
// Admin setting Settings > Products > "Show stock to shoppers" (catalog.showStock).
// When it is off, shoppers must not be able to learn how many units are left,
// and hiding a number in the page is not enough: the same number sits in the
// JSON the browser downloads. So the public endpoints send each variant an
// `inStock` boolean (all the storefront needs to disable a sold-out size) and
// only include the `stock` count while the setting is on.

// Settings are read through `.lean()`, which skips schema defaults, so a document
// saved before this setting existed has no `showStock` key: that means "show".
export const isStockVisible = async () => {
    const settings = await getSettings();
    const value = settings?.catalog?.showStock;
    return value === undefined || value === null ? CATALOG_DEFAULTS.showStock : value !== false;
};

const redactWeight = (weight, showStock) => {
    const { stock, ...rest } = weight;
    const out = { ...rest, inStock: Number(stock) > 0 };
    if (showStock) out.stock = stock;
    return out;
};

// Accepts a mongoose document or a plain/lean object; returns a plain object.
export const toPublicProduct = (product, showStock) => {
    const plain = typeof product?.toJSON === 'function' ? product.toJSON() : { ...product };
    if (Array.isArray(plain.weights)) {
        plain.weights = plain.weights.map((w) => redactWeight(w, showStock));
    }
    return plain;
};
