// Variant helpers shared by the storefront, quick view and admin screens.
// Free of React and browser APIs so server components can import it too.
//
// A product's `weights` array is its list of variants. Each is one size and, on
// products sold in colours, one colour: `{ weight: "M", color: "Red", ... }`.
// The cart, orders and stock all address a variant by its index in that array,
// so everything here hands back indexes into `product.weights`.

export const MAX_UNKNOWN_STOCK_QTY = 50;

// "M" for a plain size, "M / Red" for a coloured one. Mirrors variantLabel() in
// the backend product model.
export const variantLabel = (w) => {
    const size = String(w?.weight ?? "").trim();
    const color = String(w?.color ?? "").trim();
    return color ? `${size} / ${color}` : size;
};

// The public API sends `inStock` always and `stock` only while the store shows
// stock to shoppers; the admin API sends `stock` only. Accept either.
export const variantInStock = (w) =>
    typeof w?.inStock === "boolean" ? w.inStock : Number(w?.stock) > 0;

// Units the shopper may be told about. null while the count is hidden.
export const variantStockCount = (w) =>
    typeof w?.stock === "number" && Number.isFinite(w.stock) ? w.stock : null;

// The most a shopper can pick in the quantity stepper: the real count when the
// store shows it, otherwise a fixed ceiling (the server refuses anything over).
export const maxQuantity = (w) => {
    const count = variantStockCount(w);
    return count === null ? MAX_UNKNOWN_STOCK_QTY : Math.max(1, count);
};

const sameColor = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

// Colours the product is sold in, in the order they first appear among its
// variants, each with the variant indexes that carry it. A colour with no
// variant can't be bought, so it is not offered. `hex` comes from the product's
// colour list ("" when none was set). [] for a product without colours.
export function getColorOptions(product) {
    const weights = product?.weights || [];
    const options = [];
    weights.forEach((w, index) => {
        const name = String(w?.color ?? "").trim();
        if (!name) return;
        let option = options.find((o) => sameColor(o.name, name));
        if (!option) {
            const listed = (product.colors || []).find((c) => sameColor(c.name, name));
            option = { name, hex: listed?.hex || "", indexes: [] };
            options.push(option);
        }
        option.indexes.push(index);
    });
    return options.map((o) => ({ ...o, inStock: o.indexes.some((i) => variantInStock(weights[i])) }));
}

export const hasColors = (product) => getColorOptions(product).length > 0;

// Which variant to land on first: the earliest one that can be bought.
export function firstAvailableIndex(product) {
    const index = (product?.weights || []).findIndex(variantInStock);
    return index === -1 ? 0 : index;
}

// The variant to select when the shopper picks a colour. Keeps the size they
// already chose when that colour comes in it and it is in stock, otherwise the
// first size of that colour that can be bought.
export function indexForColor(product, colorName, currentIndex = 0) {
    const weights = product?.weights || [];
    const candidates = weights.map((w, i) => i).filter((i) => sameColor(weights[i].color, colorName));
    if (!candidates.length) return currentIndex;
    const size = weights[currentIndex]?.weight;
    const sameSize = candidates.find((i) => weights[i].weight === size && variantInStock(weights[i]));
    if (sameSize !== undefined) return sameSize;
    const buyable = candidates.find((i) => variantInStock(weights[i]));
    return buyable !== undefined ? buyable : candidates[0];
}
