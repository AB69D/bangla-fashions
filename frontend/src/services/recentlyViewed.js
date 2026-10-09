import { getProductCover } from "@/lib/productImages.js";

// Same convention as services/wishlist.js: localStorage cache + a window
// event so every mounted <RecentlyViewed> stays in sync within the tab.
const LS_KEY = "recentlyViewed";
const EVENT = "recently-viewed-updated";
const MAX_ITEMS = 12;
// Don't re-validate on every product page the shopper flips through.
const REFRESH_MIN_GAP_MS = 30 * 1000;

const read = () => {
    if (typeof window === "undefined") return [];
    try {
        const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        // Anything that isn't a list of entries with an id is corrupt: start over.
        return Array.isArray(list) ? list.filter((p) => p && typeof p._id === "string") : [];
    } catch {
        return [];
    }
};

const write = (list) => {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch {
        // Private mode / quota: the history is a nicety, never worth an error.
        return;
    }
    window.dispatchEvent(new Event(EVENT));
};

const snapshotOf = (product, viewedAt) => ({
    _id: product._id,
    firstName: product.firstName,
    cover_image: getProductCover(product),
    price: product.weights?.[0]?.price || 0,
    discountPercent: product.weights?.[0]?.discountPercent || 0,
    viewedAt,
});

// Call once a product's real detail has loaded (so the snapshot has an
// accurate price/image), not from a card hover — this tracks actual views.
export function recordView(product) {
    if (!product?._id) return;
    const list = read().filter((p) => p._id !== product._id);
    list.unshift(snapshotOf(product, Date.now()));
    write(list.slice(0, MAX_ITEMS));
}

// Forget one product (it was deleted or is no longer sold online).
export function removeView(id) {
    if (!id) return;
    const list = read();
    const next = list.filter((p) => p._id !== id);
    if (next.length !== list.length) write(next);
}

export function getRecentlyViewed(excludeId) {
    return read().filter((p) => p._id !== excludeId);
}

export function subscribeRecentlyViewed(callback) {
    const handler = () => callback(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener(EVENT, handler);
        window.removeEventListener("storage", handler);
    };
}

let inflight = null;
let lastRefreshAt = 0;

// The stored snapshots go stale: a product can be deleted, hidden, renamed,
// repriced or lose the photo we saved. Ask the server which of our ids are
// still on sale and rebuild each snapshot from the live product. An id the
// server doesn't return is gone and is dropped; a failed lookup never prunes.
export function refreshRecentlyViewed() {
    if (typeof window === "undefined") return Promise.resolve();
    if (inflight) return inflight;
    if (Date.now() - lastRefreshAt < REFRESH_MIN_GAP_MS) return Promise.resolve();

    const sent = read().map((p) => p._id);
    if (sent.length === 0) return Promise.resolve();

    const run = async () => {
        try {
            const res = await fetch("/api/client/product/by-ids", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: sent }),
            });
            const json = await res.json();
            if (!res.ok || !json?.success || !Array.isArray(json.data)) return;
            lastRefreshAt = Date.now();

            const live = new Map(json.data.map((p) => [String(p._id), p]));
            const asked = new Set(sent);
            let changed = false;
            const next = [];
            // Re-read: the shopper may have opened another product while we waited.
            // Entries we never asked about are kept as they are.
            for (const entry of read()) {
                if (!asked.has(entry._id)) {
                    next.push(entry);
                    continue;
                }
                const product = live.get(entry._id);
                if (!product) {
                    changed = true;
                    continue;
                }
                const fresh = snapshotOf(product, entry.viewedAt);
                if (
                    fresh.firstName !== entry.firstName ||
                    fresh.cover_image !== entry.cover_image ||
                    fresh.price !== entry.price ||
                    fresh.discountPercent !== entry.discountPercent
                ) {
                    changed = true;
                }
                next.push(fresh);
            }
            if (changed) write(next);
        } catch {
            // Offline or the server hiccuped: keep what we have.
        }
    };

    // `.finally` runs after this assignment, so `inflight` can never be left
    // pointing at a settled promise.
    inflight = run().finally(() => {
        inflight = null;
    });
    return inflight;
}
