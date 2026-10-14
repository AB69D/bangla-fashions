"use client";
import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";

// Product form section where the admin lists the colors a product is sold in.
// Each size row below it then picks one of these, and the storefront shows them
// as swatches. Used by both the create form and the edit modal.

export const MAX_COLORS = 20;
export const MAX_COLOR_NAME = 30; // mirrors the backend limit

// Typing a common name pre-fills a matching swatch so the admin usually only
// has to press Add. Anything not listed keeps the picker's current value, and
// once the admin touches the picker themselves we stop guessing.
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

const DEFAULT_SWATCH = "#d32f2f";

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// After the color list changes, a size row that points at a color that is no
// longer listed has to be cleared (the server rejects it otherwise).
export const reconcileVariantColors = (variants, colors) =>
    variants.map((v) => (v.color && !colors.some((c) => sameName(c.name, v.color)) ? { ...v, color: "" } : v));

// Two rows for the same size in the same color would be indistinguishable to a
// shopper. Returns the first repeated "M / Red" label, or null. Only meaningful
// once the product has colors (older products may legitimately repeat a size).
export const findDuplicateVariant = (variants) => {
    const seen = new Set();
    for (const v of variants) {
        const size = String(v.weight ?? "").trim();
        const color = String(v.color ?? "").trim();
        const key = `${size.toLowerCase()}|${color.toLowerCase()}`;
        if (seen.has(key)) return color ? `${size} / ${color}` : size;
        seen.add(key);
    }
    return null;
};

export default function ProductColorsEditor({ colors, onChange, lockedNames = [], disabled = false }) {
    const [name, setName] = useState("");
    const [hex, setHex] = useState(DEFAULT_SWATCH);
    const [pickedByHand, setPickedByHand] = useState(false);
    const [error, setError] = useState("");

    const isLocked = (colorName) => lockedNames.some((n) => sameName(n, colorName));

    const handleName = (value) => {
        setName(value);
        setError("");
        if (!pickedByHand) {
            const guess = COMMON_SWATCHES[value.trim().toLowerCase()];
            if (guess) setHex(guess);
        }
    };

    const add = () => {
        const clean = name.trim().replace(/\s+/g, " ");
        if (!clean) return setError("Type a color name first.");
        if (clean.length > MAX_COLOR_NAME) return setError(`Keep the name under ${MAX_COLOR_NAME} characters.`);
        if (colors.some((c) => sameName(c.name, clean))) return setError(`${clean} is already added.`);
        if (colors.length >= MAX_COLORS) return setError(`A product can have at most ${MAX_COLORS} colors.`);
        onChange([...colors, { name: clean, hex }]);
        setName("");
        setPickedByHand(false);
        setError("");
    };

    const remove = (colorName) => onChange(colors.filter((c) => !sameName(c.name, colorName)));

    return (
        <div className="border-t pt-4 sm:pt-5">
            <div className="mb-2 sm:mb-3">
                <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                    Colors <span className="text-xs font-normal text-gray-400">(optional)</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    List the colors this product is available in. Customers pick one before ordering. Then choose a color
                    for each size below and set its own stock. Leave empty if the product comes in a single color.
                </p>
            </div>

            {colors.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-3">
                    {colors.map((c) => {
                        const locked = isLocked(c.name);
                        return (
                            <li
                                key={c.name}
                                className="inline-flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-700"
                            >
                                <span
                                    aria-hidden="true"
                                    className="w-5 h-5 rounded-full border border-gray-300"
                                    style={{ background: c.hex || "transparent" }}
                                />
                                <span className="font-medium">{c.name}</span>
                                <button
                                    type="button"
                                    onClick={() => remove(c.name)}
                                    disabled={disabled || locked}
                                    title={locked ? "Used by a size row, so it can't be removed here" : `Remove ${c.name}`}
                                    aria-label={`Remove ${c.name}`}
                                    className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <FiX className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex flex-wrap items-end gap-2">
                <div className="grow basis-40 min-w-0">
                    <label className="block text-[10px] sm:text-xs text-gray-500 mb-1">Color name</label>
                    <input
                        type="text"
                        value={name}
                        maxLength={MAX_COLOR_NAME}
                        disabled={disabled}
                        onChange={(e) => handleName(e.target.value)}
                        onKeyDown={(e) => {
                            // Enter must add the color, not submit the whole product
                            // form. An empty field is ignored quietly: the error is for
                            // the Add button, not for a stray Enter.
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (name.trim()) add();
                            }
                        }}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm"
                        placeholder="e.g. Maroon"
                    />
                </div>
                <div>
                    <label className="block text-[10px] sm:text-xs text-gray-500 mb-1">Swatch</label>
                    <input
                        type="color"
                        value={hex}
                        disabled={disabled}
                        onChange={(e) => {
                            setHex(e.target.value);
                            setPickedByHand(true);
                        }}
                        aria-label="Swatch color"
                        className="h-8 sm:h-9 w-12 p-0.5 border border-gray-300 rounded-lg bg-white cursor-pointer"
                    />
                </div>
                <button
                    type="button"
                    onClick={add}
                    disabled={disabled}
                    className="flex items-center gap-1 h-8 sm:h-9 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold hover:bg-emerald-100 disabled:opacity-50"
                >
                    <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> Add color
                </button>
            </div>
            {error && (
                <p role="alert" className="mt-1.5 text-[11px] sm:text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
