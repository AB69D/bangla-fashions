"use client";
import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import ProductImageManager, { appendImagesToFormData, countNewFiles, itemsFromUrls } from "@/components/admin/ProductImageManager";

// Product form section where the admin lists the colors a product is sold in.
// Colors are independent of the sizes: the storefront shows them as swatches and
// the shopper picks any color with any size. Stock is kept per size, so a color
// has no stock of its own; marking it "Sold out" is how the admin stops selling
// it. Each color also carries its own photos: when a shopper picks a color the
// storefront slider switches to that color's photos. Used by both the create
// form and the edit modal.

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

// Server colours -> editor state (photos become image-manager items).
export const colorsFromProduct = (colors) =>
    (colors || []).map((c) => ({ name: c.name, hex: c.hex || "", available: c.available !== false, images: itemsFromUrls(c.images) }));

// Editor state -> the `colors` JSON for the API. New photo files are appended to
// `formData` as color_images_<position>, which is how the server pairs them up.
export const colorsPayload = (formData, colors) =>
    colors.map((c, index) => ({
        name: c.name,
        hex: c.hex,
        available: c.available !== false,
        images: appendImagesToFormData(formData, `color_images_${index}`, c.images),
    }));

export const countNewColorFiles = (colors) => colors.reduce((sum, c) => sum + countNewFiles(c.images), 0);

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

export default function ProductColorsEditor({ colors, onChange, disabled = false, showPhotos = true }) {
    const [name, setName] = useState("");
    const [hex, setHex] = useState(DEFAULT_SWATCH);
    const [pickedByHand, setPickedByHand] = useState(false);
    const [error, setError] = useState("");

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
        onChange([...colors, { name: clean, hex, available: true, images: [] }]);
        setName("");
        setPickedByHand(false);
        setError("");
    };

    const remove = (colorName) => onChange(colors.filter((c) => !sameName(c.name, colorName)));
    const toggleAvailable = (colorName) =>
        onChange(colors.map((c) => (sameName(c.name, colorName) ? { ...c, available: c.available === false } : c)));
    const setImages = (colorName, images) =>
        onChange(colors.map((c) => (sameName(c.name, colorName) ? { ...c, images } : c)));

    return (
        <div className="border-t pt-4 sm:pt-5">
            <div className="mb-2 sm:mb-3">
                <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                    Colors <span className="text-xs font-normal text-gray-400">(optional)</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    List the colors this product comes in. Customers pick a color and a size separately, so any listed color
                    goes with any size. Stock is counted per size, not per color: tap a color&apos;s status to mark it
                    Sold out. Leave empty if the product comes in a single color.
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                    Add photos under each color: when a customer picks that color, the slider on the product page shows
                    those photos. A color without photos shows the product&apos;s general photos.
                </p>
            </div>

            {colors.length > 0 && (
                <ul className="space-y-3 mb-3">
                    {colors.map((c) => {
                        const soldOut = c.available === false;
                        return (
                            <li
                                key={c.name}
                                className="rounded-lg border border-gray-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm text-gray-700"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                <span
                                    aria-hidden="true"
                                    className="w-5 h-5 rounded-full border border-gray-300"
                                    style={{ background: c.hex || "transparent" }}
                                />
                                <span className={`font-medium ${soldOut ? "line-through text-gray-400" : ""}`}>{c.name}</span>
                                <button
                                    type="button"
                                    onClick={() => toggleAvailable(c.name)}
                                    disabled={disabled}
                                    aria-pressed={soldOut}
                                    title={soldOut ? "Sold out. Tap to sell it again" : "Tap to mark this color Sold out"}
                                    className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold disabled:opacity-50 ${
                                        soldOut ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                                    }`}
                                >
                                    {soldOut ? "Sold out" : "Available"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => remove(c.name)}
                                    disabled={disabled}
                                    title={`Remove ${c.name}. Its photos are deleted when you save`}
                                    aria-label={`Remove ${c.name}`}
                                    className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"
                                >
                                    <FiX className="w-3.5 h-3.5" />
                                </button>
                                </div>
                                {showPhotos && (
                                    <ProductImageManager
                                        className="mt-2.5"
                                        label={`Photos for ${c.name}`}
                                        items={c.images || []}
                                        onChange={(next) => setImages(c.name, next)}
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
