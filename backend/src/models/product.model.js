import mongoose from "mongoose";

const weightSchema = new mongoose.Schema({
    weight: {
        type: String,
        required: true
    },
    // Which of the product's `colors` this variant is in. A variant is one
    // size in one colour, so stock, price, SKU and barcode are all per colour.
    // Empty on products that have no colours (every legacy product).
    color: {
        type: String,
        default: '',
        trim: true
    },
    stock: {
        type: Number,
        default: 0,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // Cost price for this variant — used for profit / margin reporting (Phase 2).
    costPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    // Stock-keeping unit + scannable barcode (Phase 1). Both optional; a barcode
    // is auto-generated on save when left blank so every variant is scannable.
    sku: {
        type: String,
        default: '',
        trim: true
    },
    barcode: {
        type: String,
        default: '',
        trim: true
    },
    images: {
        type: Array,
        default: []
    }
}, { _id: false });

const colorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    hex: {
        type: String,
        default: '',
        trim: true
    }
}, { _id: false });

// How a variant reads in carts, orders, receipts, the POS and the stock ledger:
// "M" for a plain size, "M / Red" for a coloured one. Those places store the
// label as a snapshot string, so putting the colour in it shows the colour
// everywhere without each of them learning about a second field.
export const variantLabel = (w) => {
    const size = String(w?.weight ?? '').trim();
    const color = String(w?.color ?? '').trim();
    return color ? `${size} / ${color}` : size;
};

const qaSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    }
}, { _id: true });

// Same rule as `imageUrl` in validations/siteSettings.schema.js, kept local so
// the model does not depend on a zod schema file. A value is either an absolute
// http(s) URL or a site-relative path with exactly ONE leading slash (a
// protocol-relative `//host/x.png` would load from a third-party host). Empty
// strings, backslashes, control characters and `..` segments are refused so a
// stored path can never climb out of /uploads.
export const isValidImageLocation = (value) => {
    if (typeof value !== 'string' || value === '') return false;
    if (value.includes('\\') || /[\u0000-\u001f]/.test(value)) return false;
    if (/(?:^|\/)\.\.(?:\/|$)/.test(value)) return false;
    if (/^https?:\/\//i.test(value)) {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }
    return /^\/(?!\/)/.test(value);
};

const productSchema = new mongoose.Schema({
    cover_image: {
        type: String,
        default: ""
    },
    // Product-level photo gallery (store setting "Product gallery" mode): one
    // set of photos shown as the slider for every size. Absent on legacy
    // products, which keep using cover_image + weights[].images unchanged.
    gallery: {
        type: [String],
        default: [],
        validate: {
            validator: (urls) => Array.isArray(urls) && urls.every(isValidImageLocation),
            message: 'Each gallery image must be an http(s) URL or an uploaded path like /uploads/2026/09/image.webp'
        }
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        default: ""
    },
    category: {
        type: mongoose.Schema.ObjectId,
        ref: 'category',
        required: true
    },
    weights: [weightSchema],
    // Colours this product is sold in, chosen by the admin when creating it.
    // Each variant in `weights` points at one of these by name; `hex` is only
    // the swatch the storefront paints. Empty for products without colours.
    colors: {
        type: [colorSchema],
        default: []
    },
    description: {
        type: String,
        default: ""
    },
    qa: [qaSchema],
    // When false, the product is hidden from the public e-commerce storefront
    // but still sellable at the POS terminal. Defaults to true so existing
    // products (and the common case) stay visible online.
    showInEcommerce: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

productSchema.index({
    firstName: "text",
    lastName: "text",
    description: 'text'
});

// Fast scanner lookups by barcode / SKU (sparse-ish; blanks are filtered out
// at query time so empty strings don't all collide on a unique index).
productSchema.index({ 'weights.barcode': 1 });
productSchema.index({ 'weights.sku': 1 });

// Storefront browse paths, both of which sort newest-first:
//   - category page:  find({ category, showInEcommerce }).sort({ createdAt: -1 })
//   - default list:   find({ showInEcommerce }).sort({ createdAt: -1 })
// The compound index serves the category filter + sort together; the standalone
// createdAt index serves the unfiltered newest-first listing.
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 });

// Build a GS1 "internal use" (prefix 2) numeric barcode that any CODE128
// reader can scan. Kept self-contained so every variant is always scannable
// even if the admin never types one in.
const genBarcode = (index = 0) => {
    const ts = String(Date.now()).slice(-8);
    const rand = String(Math.floor(Math.random() * 90) + 10); // 2 digits
    const idx = String(index % 100).padStart(2, '0');
    return `2${ts}${rand}${idx}`; // 13 digits
};

const slug3 = (s = '') => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'PRD';

// Fill a single variant's blank barcode / SKU in place and return it. Shared
// by the pre('save') hook and the update controller (updateOne skips hooks),
// so a variant is guaranteed scannable however it was written.
const ensureVariantCodes = (w, index = 0, firstName = '') => {
    if (!w || typeof w !== 'object') return w;
    if (!w.barcode || !String(w.barcode).trim()) {
        w.barcode = genBarcode(index);
    }
    if (!w.sku || !String(w.sku).trim()) {
        const wt = String(w.weight || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const col = String(w.color || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
        w.sku = `${slug3(firstName)}-${wt || index + 1}${col ? `-${col}` : ''}-${String(w.barcode).slice(-4)}`;
    }
    return w;
};

// Auto-fill blank barcode / SKU before saving so the catalogue is scannable.
productSchema.pre('save', function autoCodes(next) {
    if (Array.isArray(this.weights)) {
        this.weights.forEach((w, i) => ensureVariantCodes(w, i, this.firstName));
    }
    next();
});

const ProductModel = mongoose.model('product', productSchema);

export { genBarcode, ensureVariantCodes };
export default ProductModel;