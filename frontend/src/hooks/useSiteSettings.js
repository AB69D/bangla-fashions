"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchSiteSettings } from "@/lib/dynamicContent";
import { normalizeCatalogConfig } from "@/lib/catalogConfig";

// Shared, module-level cache of the public site settings so every consumer
// (header, footer, chatbot, product page, reviews, PWA, …) triggers a single
// network request instead of each refetching the same document.
let _cache = null; // resolved settings object
let _inflight = null; // Promise while the first fetch is running

export const loadSiteSettings = () => {
    if (_cache) return Promise.resolve(_cache);
    if (_inflight) return _inflight;
    _inflight = fetchSiteSettings()
        .then((data) => {
            _cache = data || {};
            return _cache;
        })
        .catch(() => {
            _cache = {};
            return _cache;
        })
        .finally(() => {
            _inflight = null;
        });
    return _inflight;
};

// Mounted useSiteSettings() consumers, so refreshSiteSettings() can push a new
// document to them without a page reload.
const _listeners = new Set();

// Re-fetch the public settings and hand them to every mounted consumer. The
// cache above is otherwise filled once per page load, which in the admin SPA
// would leave e.g. the product forms on the OLD image mode after the admin
// changes it in Settings and navigates there. Keeps the previous settings if
// the request fails (fetchSiteSettings resolves null on error) rather than
// replacing them with an empty object.
export const refreshSiteSettings = async () => {
    const data = await fetchSiteSettings();
    if (!data) return _cache;
    _cache = data;
    _listeners.forEach((notify) => notify(data));
    return data;
};

// Returns the cached settings object, or null until the first fetch resolves.
export function useSiteSettings() {
    const [settings, setSettings] = useState(_cache);

    useEffect(() => {
        _listeners.add(setSettings);
        let cancelled = false;
        if (_cache) {
            setSettings(_cache);
        } else {
            loadSiteSettings().then((s) => {
                if (!cancelled) setSettings(s);
            });
        }
        return () => {
            cancelled = true;
            _listeners.delete(setSettings);
        };
    }, []);

    return settings;
}

// Boolean helper for a single feature flag. Defaults to `true` for an unknown
// flag (matches the backend `isFeatureEnabled` / model defaults). While the
// settings are still loading it also returns the fallback, so gated UI doesn't
// flash off-then-on for default-enabled features.
export function useFeature(name, fallback = true) {
    const settings = useSiteSettings();
    if (settings == null) return fallback;
    const v = settings?.features?.[name];
    return v === undefined || v === null ? fallback : v !== false;
}

// Product-image behaviour: { productImageMode, autoSlide, autoSlideSeconds,
// ready }. `ready` is false until the settings have loaded, so a caller can show
// a skeleton (or keep the default) instead of rendering the wrong gallery and
// then swapping it. If the settings request fails the cache falls back to {},
// which normalises to the defaults with ready === true. The result is memoised
// on the settings object, so it is safe in effect/memo dependency lists.
export function useCatalogConfig() {
    const settings = useSiteSettings();
    return useMemo(
        () => ({ ...normalizeCatalogConfig(settings), ready: settings != null }),
        [settings],
    );
}
