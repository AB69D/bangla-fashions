// Checks the colour a shopper picked against the colours the product is sold in.
// Used wherever a line is created or re-checked (cart, checkout, order chatbot),
// so the rules live in one place.
//
// A colour is independent of the size: any listed, available colour goes with
// any size. A product with no colours takes none; a product with colours needs
// exactly one, so no order ever reaches the shop without saying which.

const sameName = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// Returns { ok: true, color } with the colour spelled as the product lists it
// ('' when the product has no colours), or { ok: false, message } for the shopper.
export const resolveColorChoice = (product, requested) => {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    if (colors.length === 0) return { ok: true, color: '' };

    if (!colors.some((c) => c.available !== false)) {
        return { ok: false, message: 'This product is out of stock' };
    }

    const wanted = String(requested ?? '').trim();
    if (!wanted) return { ok: false, message: 'Please choose a color' };

    const match = colors.find((c) => sameName(c.name, wanted));
    if (!match) return { ok: false, message: 'That color is not available for this product' };
    if (match.available === false) return { ok: false, message: `${match.name} is currently sold out` };
    return { ok: true, color: match.name };
};
