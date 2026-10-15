// Variant and colour helpers shared by the storefront, quick view and admin
// screens. Free of React and browser APIs so server components can import it.
//
// A product's `weights` array is its list of sizes ("variants"): each has its own
// price and stock, and the cart, orders and stock history all address one by its
// index in that array. Colours are a separate, independent list on the product
// (`colors`): the shopper picks any colour with any size, and stock is kept per
// size only.

export const MAX_UNKNOWN_STOCK_QTY = 50;

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

// The product's colours as the storefront needs them: [{ name, hex, available }].
// `available` is false for a colour the admin marked sold out. [] when the
// product has no colours.
export function getColors(product) {
    return (product?.colors || [])
        .filter((c) => c && String(c.name ?? "").trim())
        .map((c) => ({ name: String(c.name).trim(), hex: c.hex || "", available: c.available !== false }));
}

export const hasColors = (product) => getColors(product).length > 0;

// The colour a shopper should land on: the first one that can be bought. "" for
// a product without colours (or one whose colours are all sold out).
export const firstAvailableColor = (product) => getColors(product).find((c) => c.available)?.name ?? "";

// A coloured product can only be bought while at least one colour is available.
export const colorsSellable = (product) => !hasColors(product) || getColors(product).some((c) => c.available);

// Which size to land on first: the earliest one that can be bought.
export function firstAvailableIndex(product) {
    const index = (product?.weights || []).findIndex(variantInStock);
    return index === -1 ? 0 : index;
}

// The line label carts and orders show: "M" or "M / Red". Mirrors lineLabel() in
// the backend product model.
export const lineLabel = (size, color) => {
    const s = String(size ?? "").trim();
    const c = String(color ?? "").trim();
    return c ? `${s} / ${c}` : s;
};
