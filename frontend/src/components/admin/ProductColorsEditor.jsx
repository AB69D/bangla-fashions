"use client";
import { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import ProductImageManager, { appendImagesToFormData, countNewFiles, itemsFromUrls } from "@/components/admin/ProductImageManager";

// Product form section where the admin lists the colors a product is sold in.
// Colors are independent of the sizes: the storefront shows them as swatches and
// the shopper picks any color with any size. Stock is kept per size, so a color
// has no stock of its own; marking it "Sold out" is how the admin stops selling
// it. Used by both the create form and the edit modal.
//
// Each color is one card holding everything about it: name, swatch, status and
// its own photos. "Add color" adds an empty card straight away, so the admin
// names it and adds its photos in the same place, and there is no half-entered
// color living outside the list that Save could miss. Before saving, the form
// runs prepareColorsForSave() to drop untouched empty cards and to stop on a
// card that has photos but no name.
//
// `onChange` must accept an updater function (a React state setter does): cards
// update themselves from the latest list, so a photo that finishes preparing
// after another change cannot write back an old copy of the list.

export const MAX_COLORS = 20;
export const MAX_COLOR_NAME = 30; // mirrors the backend limit

// Typing a common name pre-fills a matching swatch, until the admin picks the
// swatch by hand.
const COMMON_SWATCHES = {
    black: "#111111",
    white: "#ffffff",
    "off white": "#f5f1e8",
    cream: "#f3ead2",
    beige: "#d9c7a3",
    red: "#d32f2f",
    maroon: "#800000",
    pink: "#ec6fa0",
    orange: "#f28a00",
    yellow: "#f2c200",
    gold: "#c9a227",
    golden: "#c9a227",
    green: "#2e9e4f",
    "sea green": "#2e8b57",
    olive: "#6b7a2e",
    teal: "#168a8a",
    blue: "#1e5bd8",
    "sky blue": "#5bb8f0",
    navy: "#14213d",
    "navy blue": "#14213d",
    purple: "#7b3fbf",
    brown: "#7a4a2a",
    grey: "#8a8f98",
    gray: "#8a8f98",
    silver: "#c0c4cc",
};

const DEFAULT_SWATCH = "#9ca3af";

let keySeq = 0;
const nextKey = () => `color-${++keySeq}`;

const cleanName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const sameName = (a, b) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();

const newColor = () => ({ _key: nextKey(), _new: true, name: "", hex: DEFAULT_SWATCH, hexByHand: false, available: true, images: [] });

// Server colours -> editor state. Saved colours keep their name: carts and past
// orders refer to a colour by name, so renaming one would orphan them.
export const colorsFromProduct = (colors) =>
    (colors || []).map((c) => ({
        _key: nextKey(),
        _new: false,
        name: c.name,
        hex: c.hex || "",
        hexByHand: true,
        available: c.available !== false,
        images: itemsFromUrls(c.images),
    }));

// The colours to save, or the first problem to show the admin. A card left
// completely empty is ignored; a card with photos must have a name.
export function prepareColorsForSave(colors) {
    const out = [];
    for (let i = 0; i < colors.length; i += 1) {
        const c = colors[i];
        const name = cleanName(c.name);
        const label = `Color ${i + 1}`;
        if (!name) {
            if ((c.images || []).length) return { error: `${label} has photos but no name. Type its name, or remove the color.` };
            continue;
        }
        if (name.length > MAX_COLOR_NAME) return { error: `${label}: keep the name under ${MAX_COLOR_NAME} characters.` };
        if (out.some((o) => sameName(o.name, name))) return { error: `The color "${name}" is listed twice.` };
        out.push({ ...c, name });
    }
    return { colors: out };
}

// Prepared colours -> the `colors` JSON for the API. New photo files are appended
// to `formData` as color_images_<position>, which is how the server pairs them up.
export const colorsPayload = (formData, colors) =>
    colors.map((c, index) => ({
        name: c.name,
        hex: c.hex,
        available: c.available !== false,
        images: appendImagesToFormData(formData, `color_images_${index}`, c.images),
    }));

export const countNewColorFiles = (colors) => colors.reduce((sum, c) => sum + countNewFiles(c.images), 0);

export default function ProductColorsEditor({ colors, onChange, disabled = false, showPhotos = true }) {
    // The card just added, whose name field should take the focus.
    const [focusKey, setFocusKey] = useState(null);

    const update = (key, patch) =>
        onChange((prev) => prev.map((c) => (c._key === key ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));

    const add = () => {
        const color = newColor();
        setFocusKey(color._key);
        onChange((prev) => (prev.length >= MAX_COLORS ? prev : [...prev, color]));
    };

    const remove = (c, index) => {
        const photos = (c.images || []).length;
        const label = cleanName(c.name) || `color ${index + 1}`;
        if (photos && !window.confirm(`Remove ${label} and its ${photos} photo${photos === 1 ? "" : "s"}?`)) return;
        onChange((prev) => prev.filter((x) => x._key !== c._key));
    };

    const rename = (key, value) =>
        update(key, (c) => {
            const guess = COMMON_SWATCHES[cleanName(value).toLowerCase()];
            return { name: value, ...(!c.hexByHand && guess ? { hex: guess } : {}) };
        });

    // Same name typed twice: flagged on the card as soon as it happens.
    const duplicate = (c) => cleanName(c.name) && colors.some((o) => o._key !== c._key && sameName(o.name, c.name));

    return (
        <div className="border-t pt-4 sm:pt-5">
            <div className="mb-3">
                <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                    Colors <span className="text-xs font-normal text-gray-400">(optional)</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    Add each color this product comes in, with its own photos. When a customer picks a color, its photos
                    show first in the product slider. Customers pick color and size separately, and stock is counted per
                    size. Leave this empty if the product comes in a single color.
                </p>
            </div>

            {colors.length > 0 && (
                <ul className="space-y-3 mb-3">
                    {colors.map((c, index) => {
                        const soldOut = c.available === false;
                        const name = cleanName(c.name);
                        const dup = duplicate(c);
                        return (
                            <li key={c._key} className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                                <div className="flex items-center gap-2">
                                    <span className="shrink-0 text-xs font-semibold text-gray-400 w-5">{index + 1}.</span>
                                    <label className="relative shrink-0 w-9 h-9 rounded-full border border-gray-300 overflow-hidden cursor-pointer" title="Swatch color">
                                        <span className="absolute inset-0" style={{ background: c.hex || "transparent" }} aria-hidden="true" />
                                        <input
                                            type="color"
                                            value={c.hex || DEFAULT_SWATCH}
                                            disabled={disabled}
                                            onChange={(e) => update(c._key, { hex: e.target.value, hexByHand: true })}
                                            aria-label={`Swatch for ${name || `color ${index + 1}`}`}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </label>
                                    {c._new ? (
                                        <input
                                            type="text"
                                            value={c.name}
                                            maxLength={MAX_COLOR_NAME}
                                            disabled={disabled}
                                            autoFocus={focusKey === c._key}
                                            onChange={(e) => rename(c._key, e.target.value)}
                                            // Enter must not submit the whole product form.
                                            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                                            placeholder="Color name, e.g. Maroon"
                                            aria-label={`Name of color ${index + 1}`}
                                            aria-invalid={dup || undefined}
                                            className={`min-w-0 flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 text-sm ${
                                                dup ? "border-red-400" : "border-gray-300"
                                            }`}
                                        />
                                    ) : (
                                        <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${soldOut ? "line-through text-gray-400" : "text-gray-800"}`}>
                                            {c.name}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => update(c._key, { available: soldOut })}
                                        disabled={disabled}
                                        aria-pressed={soldOut}
                                        title={soldOut ? "Sold out. Tap to sell it again" : "Tap to mark this color Sold out"}
                                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold disabled:opacity-50 ${
                                            soldOut ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                                        }`}
                                    >
                                        {soldOut ? "Sold out" : "Available"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => remove(c, index)}
                                        disabled={disabled}
                                        aria-label={`Remove ${name || `color ${index + 1}`}`}
                                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {dup && <p role="alert" className="mt-1.5 ml-7 text-[11px] text-red-600">This color is already in the list.</p>}
                                {showPhotos && (
                                    <ProductImageManager
                                        className="mt-3"
                                        label={`Photos of ${name || "this color"}`}
                                        items={c.images || []}
                                        onChange={(next) => update(c._key, { images: next })}
                                        max={10}
                                        showCoverBadge={false}
                                        compact
                                        disabled={disabled}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <button
                type="button"
                onClick={add}
                disabled={disabled || colors.length >= MAX_COLORS}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border-2 border-dashed border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50"
            >
                <FiPlus className="w-4 h-4" /> {colors.length ? "Add another color" : "Add color"}
            </button>
            {colors.length >= MAX_COLORS && (
                <p className="mt-1.5 text-[11px] text-gray-500">A product can have at most {MAX_COLORS} colors.</p>
            )}
        </div>
    );
}
