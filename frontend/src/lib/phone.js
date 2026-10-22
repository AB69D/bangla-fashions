// `contactPhone` is one admin free-text field that may hold several numbers,
// separated by commas, slashes, semicolons, bars or new lines
// ("+880 1911-700793, +880 1601-383683" or "+880 1911-700793/+880 1643-480565"). These two helpers are
// the only place the storefront turns that field into something dialable, so
// every tel: link on the site comes out the same shape.

// Split the field into individual numbers, dropping blanks left by a stray
// comma. The first entry is the number the "Call to Order" buttons ring.
export const splitPhones = (value) =>
    String(value || "")
        .split(/[,/;|\n]+/)
        .map((p) => p.trim())
        .filter(Boolean);

// Phone dialers only accept digits and a leading "+"; spaces and dashes make
// the link dead on most handsets. Returns "" when there is nothing to dial so
// callers can hide the button instead of rendering a broken link.
export const telHref = (phone) => {
    const raw = String(phone || "").trim();
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
};
