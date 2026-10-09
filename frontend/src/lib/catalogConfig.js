// Storefront catalogue behaviour (siteSettings.catalog). Deliberately free of
// "use client" and of any browser API so server components (the product page's
// generateMetadata / SSR) and client components can both import it. Mirrored on
// the backend as CATALOG_DEFAULTS in models/siteSettings.model.js.
//
// A settings document saved before the `catalog` block existed has no such key
// at all, so every reader goes through normalizeCatalogConfig() rather than
// trusting the raw value.

export const DEFAULT_CATALOG_CONFIG = Object.freeze({
    productImageMode: "variant", // "variant" = photos per size, "product" = one gallery per product
    autoSlide: true,
    autoSlideSeconds: 4,
});

export const AUTO_SLIDE_MIN_SECONDS = 2;
export const AUTO_SLIDE_MAX_SECONDS = 15;

const clampSeconds = (value) => {
    // Number(null) and Number("") are 0, which would clamp up to the minimum
    // instead of meaning "not set" — treat those as missing first.
    if (value === undefined || value === null || value === "") return DEFAULT_CATALOG_CONFIG.autoSlideSeconds;
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_CATALOG_CONFIG.autoSlideSeconds;
    return Math.min(AUTO_SLIDE_MAX_SECONDS, Math.max(AUTO_SLIDE_MIN_SECONDS, Math.round(n)));
};

// `input` may be the whole settings object, its `.catalog`, or undefined/null.
// Always returns a fresh, fully-populated, clamped config:
//   - product mode only when the value is exactly "product" (anything else,
//     including typos, keeps today's per-size behaviour);
//   - autoSlide only turns off for an explicit boolean false;
//   - autoSlideSeconds is rounded and clamped to 2..15.
export function normalizeCatalogConfig(input) {
    const src = input && typeof input === "object" && "catalog" in input ? input.catalog : input;
    const c = src && typeof src === "object" ? src : {};
    return {
        productImageMode: c.productImageMode === "product" ? "product" : DEFAULT_CATALOG_CONFIG.productImageMode,
        autoSlide: typeof c.autoSlide === "boolean" ? c.autoSlide : DEFAULT_CATALOG_CONFIG.autoSlide,
        autoSlideSeconds: clampSeconds(c.autoSlideSeconds),
    };
}
