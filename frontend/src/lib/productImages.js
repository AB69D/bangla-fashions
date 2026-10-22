// Single place that decides which photos a product shows. Kept free of React
// and browser APIs so server components (metadata, JSON-LD) can import it too.
//
// Two store-wide modes (Settings > Product images):
//   "variant"  every size has its own photos; the gallery follows the picked size
//   "product"  one gallery for the whole product, shown for every size
// Each mode falls back to the other one's data, so flipping the setting never
// leaves a product without a picture.
//
// On top of either mode, a colour can have photos of its own (`colors[].images`).
// While the shopper has that colour picked, its photos are the slider; a colour
// without photos (or no colour picked) falls through to the mode's photos.

const isUrl = (v) => typeof v === "string" && v.trim() !== "";

// Non-string / blank entries are dropped so callers never render <img src="">.
const clean = (list) => (Array.isArray(list) ? list.filter(isUrl) : []);

const firstVariantImages = (product) => {
    for (const w of product?.weights || []) {
        const imgs = clean(w?.images);
        if (imgs.length) return imgs;
    }
    return [];
};

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// The photos of one colour, [] when the colour is unknown or has none.
export function getColorImages(product, colorName) {
    if (!product || !String(colorName ?? "").trim()) return [];
    const color = (product.colors || []).find((c) => c && sameName(c.name, colorName));
    return clean(color?.images);
}

const firstColorImages = (product) => {
    for (const c of product?.colors || []) {
        const imgs = clean(c?.images);
        if (imgs.length) return imgs;
    }
    return [];
};

export function getProductImages(product, { mode, weightIndex = 0, color = "" } = {}) {
    if (!product) return [];

    const colorOwn = getColorImages(product, color);
    if (colorOwn.length) return colorOwn;

    const gallery = clean(product.gallery);
    const cover = isUrl(product.cover_image) ? [product.cover_image] : [];

    if (mode === "product") {
        if (gallery.length) return gallery;
        // Legacy product: show the cover plus its size photos rather than just the cover.
        const fallback = [...new Set([...cover, ...firstVariantImages(product)])];
        return fallback.length ? fallback : firstColorImages(product);
    }

    // Anything that is not exactly "product" behaves like today's storefront.
    const own = clean(product.weights?.[weightIndex]?.images);
    if (own.length) return own;
    // Gallery-mode product viewed in per-size mode: its gallery beats a lone cover.
    if (gallery.length) return gallery;
    if (cover.length) return cover;
    const variant = firstVariantImages(product);
    return variant.length ? variant : firstColorImages(product);
}

// One representative image for cards, cart lines, metadata and JSON-LD.
export function getProductCover(product) {
    if (!product) return "";
    if (isUrl(product.cover_image)) return product.cover_image;
    const gallery = clean(product.gallery);
    if (gallery.length) return gallery[0];
    return firstVariantImages(product)[0] || firstColorImages(product)[0] || "";
}
