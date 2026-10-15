"use client";
import { useState } from "react";
import { FiPlus, FiTrash2, FiCheck } from "react-icons/fi";
import ProductImageManager from "@/components/admin/ProductImageManager";

// The sizes part of the Create Product form. A product has many sizes and the
// admin chooses how to price them:
//
//   "same"  one price for every size. The admin ticks the sizes the product comes
//           in, types the price once, and gives each ticked size its stock.
//   "each"  every size has its own price (the original layout).
//
// Either way the product is saved as one variant per size, each carrying a price;
// "same" just fills that price in for every ticked size, so nothing downstream
// (cart, orders, stock, POS) needs to know which mode was used.

export const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];
export const MAX_SIZE_NAME = 30;

// Stable per-row key so a size's image manager (and its blob: previews) stays
// attached to the right row when an earlier size is removed.
let rowKeySeq = 0;
export const newSizeRow = (weight = "") => ({
    _key: ++rowKeySeq,
    weight,
    stock: "",
    price: "",
    costPrice: "",
    sku: "",
    barcode: "",
    images: [],
});

const sameSize = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Mirror of the backend GS1 "internal use" (prefix 2) barcode so the admin can
// preview/lock a code in the form. The server fills any blank code on save.
const genBarcodePreview = (index = 0) => {
    const ts = String(Date.now()).slice(-8);
    const rand = String(Math.floor(Math.random() * 90) + 10);
    const idx = String(index % 100).padStart(2, "0");
    return `2${ts}${rand}${idx}`;
};

// Presets in their natural order, custom sizes after them in the order added.
const sortRows = (rows) => {
    const rank = (r, i) => {
        const p = SIZE_PRESETS.findIndex((s) => sameSize(s, r.weight));
        return p === -1 ? 1000 + i : p;
    };
    return rows
        .map((r, i) => [r, rank(r, i)])
        .sort((a, b) => a[1] - b[1])
        .map(([r]) => r);
};

// Duplicate size names would be indistinguishable to a shopper.
export const findDuplicateSize = (rows) => {
    const seen = new Set();
    for (const r of rows) {
        const key = String(r.weight ?? "").trim().toLowerCase();
        if (!key) continue;
        if (seen.has(key)) return String(r.weight).trim();
        seen.add(key);
    }
    return null;
};

const inputCls =
    "w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm";
const labelCls = "block text-[10px] sm:text-xs text-gray-500 mb-1";

export default function ProductSizesEditor({
    rows,
    setRows,
    priceMode,
    setPriceMode,
    sharedPrice,
    setSharedPrice,
    sharedCost,
    setSharedCost,
    showPhotos,
    disabled = false,
}) {
    const [customName, setCustomName] = useState("");
    const [customError, setCustomError] = useState("");

    const updateRow = (index, field, value) =>
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

    // Moving between modes keeps what the admin already typed.
    const switchMode = (next) => {
        if (next === priceMode) return;
        if (next === "same") {
            const priced = rows.find((r) => String(r.price).trim() !== "");
            if (!String(sharedPrice).trim() && priced) setSharedPrice(String(priced.price));
            const costed = rows.find((r) => String(r.costPrice).trim() !== "");
            if (!String(sharedCost).trim() && costed) setSharedCost(String(costed.costPrice));
            // A blank size row has no tick to belong to in this mode.
            setRows((prev) => prev.filter((r) => r.weight.trim()));
        } else {
            setRows((prev) => {
                const filled = prev.map((r) => ({ ...r, price: sharedPrice, costPrice: sharedCost }));
                return filled.length ? filled : [newSizeRow()];
            });
        }
        setPriceMode(next);
    };

    const hasSize = (name) => rows.some((r) => sameSize(r.weight, name));

    const toggleSize = (name) => {
        if (hasSize(name)) setRows((prev) => prev.filter((r) => !sameSize(r.weight, name)));
        else setRows((prev) => sortRows([...prev, newSizeRow(name)]));
    };

    const addCustomSize = () => {
        const clean = customName.trim().replace(/\s+/g, " ");
        if (!clean) return setCustomError("Type a size first.");
        if (clean.length > MAX_SIZE_NAME) return setCustomError(`Keep the size under ${MAX_SIZE_NAME} characters.`);
        if (hasSize(clean)) return setCustomError(`${clean} is already added.`);
        setRows((prev) => sortRows([...prev, newSizeRow(clean)]));
        setCustomName("");
        setCustomError("");
    };

    // Ticked sizes that are not presets still need a chip so they can be unticked.
    const customSizes = rows.map((r) => r.weight.trim()).filter((w) => w && !SIZE_PRESETS.some((p) => sameSize(p, w)));

    return (
        <div className="border-t pt-4 sm:pt-5">
            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 mb-1">Sizes &amp; Pricing</h4>
            <p className="text-[11px] sm:text-xs text-gray-500 mb-3">
                Choose how this product is priced. Stock is always set per size.
            </p>

            <div role="radiogroup" aria-label="Pricing" className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
                {[
                    { value: "same", title: "Same price for all sizes", hint: "Tick the sizes, type one price." },
                    { value: "each", title: "Different price for each size", hint: "Set a price on every size." },
                ].map((m) => {
                    const selected = priceMode === m.value;
                    return (
                        <label
                            key={m.value}
                            className={`flex items-start gap-2.5 p-3 border rounded-lg cursor-pointer transition ${
                                selected ? "border-emerald-500 bg-emerald-50" : "border-gray-300 bg-white hover:bg-gray-50"
                            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                            <input
                                type="radio"
                                name="priceMode"
                                value={m.value}
                                checked={selected}
                                disabled={disabled}
                                onChange={() => switchMode(m.value)}
                                className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
                            />
                            <span className="text-xs sm:text-sm">
                                <span className="font-medium text-gray-800 block">{m.title}</span>
                                <span className="text-gray-500">{m.hint}</span>
                            </span>
                        </label>
                    );
                })}
            </div>

            {priceMode === "same" ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 mb-4">
                        <div>
                            <label className={labelCls}>Price (applies to every ticked size)</label>
                            <input
                                type="number"
                                min="0"
                                value={sharedPrice}
                                onChange={(e) => setSharedPrice(e.target.value)}
                                required
                                disabled={disabled}
                                className={inputCls}
                                placeholder="850"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Cost Price (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sharedCost}
                                onChange={(e) => setSharedCost(e.target.value)}
                                disabled={disabled}
                                className={inputCls}
                                placeholder="for profit reports"
                            />
                        </div>
                    </div>

                    <p className={labelCls}>Sizes this product comes in</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {[...SIZE_PRESETS, ...customSizes].map((name) => {
                            const checked = hasSize(name);
                            return (
                                <label
                                    key={name}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer select-none transition ${
                                        checked
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={disabled}
                                        onChange={() => toggleSize(name)}
                                        className="sr-only"
                                    />
                                    <span
                                        aria-hidden="true"
                                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                                            checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        {checked && <FiCheck className="w-3 h-3" />}
                                    </span>
                                    {name}
                                </label>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-end gap-2 mb-1">
                        <div className="grow basis-40 min-w-0">
                            <label className={labelCls}>Other size</label>
                            <input
                                type="text"
                                value={customName}
                                maxLength={MAX_SIZE_NAME}
                                disabled={disabled}
                                onChange={(e) => {
                                    setCustomName(e.target.value);
                                    setCustomError("");
                                }}
                                onKeyDown={(e) => {
                                    // Enter must add the size, not submit the whole product form.
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (customName.trim()) addCustomSize();
                                    }
                                }}
                                className={inputCls}
                                placeholder="e.g. 38, 40, 4-5 Years"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addCustomSize}
                            disabled={disabled}
                            className="flex items-center gap-1 h-8 sm:h-9 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold hover:bg-emerald-100 disabled:opacity-50"
                        >
                            <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> Add size
                        </button>
                    </div>
                    {customError && (
                        <p role="alert" className="mb-2 text-[11px] sm:text-xs text-red-600">
                            {customError}
                        </p>
                    )}

                    {rows.length === 0 ? (
                        <p className="mt-3 text-xs sm:text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-4 text-center">
                            Tick at least one size above, then set its stock.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {rows.map((row, index) => (
                                <div key={row._key} className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <span className="text-xs sm:text-sm font-medium text-gray-700">Size {row.weight}</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleSize(row.weight)}
                                            disabled={disabled}
                                            className="text-red-500 hover:text-red-600 disabled:opacity-50"
                                            aria-label={`Remove size ${row.weight}`}
                                        >
                                            <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                                        <div>
                                            <label className={labelCls}>Stock</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={row.stock}
                                                onChange={(e) => updateRow(index, "stock", e.target.value)}
                                                required
                                                disabled={disabled}
                                                className={inputCls}
                                                placeholder="100"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>SKU</label>
                                            <input
                                                type="text"
                                                value={row.sku}
                                                onChange={(e) => updateRow(index, "sku", e.target.value)}
                                                disabled={disabled}
                                                className={inputCls}
                                                placeholder="auto-generated if blank"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Barcode</label>
                                            <div className="flex gap-1.5">
                                                <input
                                                    type="text"
                                                    value={row.barcode}
                                                    onChange={(e) => updateRow(index, "barcode", e.target.value)}
                                                    disabled={disabled}
                                                    className={inputCls}
                                                    placeholder="auto-generated if blank"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateRow(index, "barcode", genBarcodePreview(index))}
                                                    title="Generate a barcode now"
                                                    className="shrink-0 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-semibold hover:bg-emerald-100"
                                                >
                                                    Gen
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {showPhotos && (
                                        <ProductImageManager
                                            className="mt-3"
                                            label={`Images for ${row.weight}`}
                                            items={row.images}
                                            onChange={(next) => updateRow(index, "images", next)}
                                            max={10}
                                            showCoverBadge={false}
                                            compact
                                            disabled={disabled}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <span className="text-xs sm:text-sm text-gray-600">One row per size, each with its own price.</span>
                        <button
                            type="button"
                            onClick={() => setRows((prev) => [...prev, newSizeRow()])}
                            disabled={disabled}
                            className="flex items-center gap-1 text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                            <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> Add Size
                        </button>
                    </div>

                    {rows.map((row, index) => (
                        <div key={row._key} className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 border">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <span className="text-xs sm:text-sm font-medium text-gray-600">Size {index + 1}</span>
                                {rows.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                                        disabled={disabled}
                                        className="text-red-500 hover:text-red-600 disabled:opacity-50"
                                        aria-label={`Remove size ${index + 1}`}
                                    >
                                        <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3">
                                <div>
                                    <label className={labelCls}>Size</label>
                                    <input
                                        type="text"
                                        value={row.weight}
                                        onChange={(e) => updateRow(index, "weight", e.target.value)}
                                        required
                                        disabled={disabled}
                                        className={inputCls}
                                        placeholder="e.g. M, L, XL"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={row.stock}
                                        onChange={(e) => updateRow(index, "stock", e.target.value)}
                                        required
                                        disabled={disabled}
                                        className={inputCls}
                                        placeholder="100"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={row.price}
                                        onChange={(e) => updateRow(index, "price", e.target.value)}
                                        required
                                        disabled={disabled}
                                        className={inputCls}
                                        placeholder="850"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3">
                                <div>
                                    <label className={labelCls}>Cost Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.costPrice}
                                        onChange={(e) => updateRow(index, "costPrice", e.target.value)}
                                        disabled={disabled}
                                        className={inputCls}
                                        placeholder="for profit reports"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>SKU</label>
                                    <input
                                        type="text"
                                        value={row.sku}
                                        onChange={(e) => updateRow(index, "sku", e.target.value)}
                                        disabled={disabled}
                                        className={inputCls}
                                        placeholder="auto-generated if blank"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Barcode</label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            value={row.barcode}
                                            onChange={(e) => updateRow(index, "barcode", e.target.value)}
                                            disabled={disabled}
                                            className={inputCls}
                                            placeholder="auto-generated if blank"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateRow(index, "barcode", genBarcodePreview(index))}
                                            title="Generate a barcode now"
                                            className="shrink-0 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-semibold hover:bg-emerald-100"
                                        >
                                            Gen
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {showPhotos && (
                                <ProductImageManager
                                    label={`Images for ${row.weight || "this size"}`}
                                    items={row.images}
                                    onChange={(next) => updateRow(index, "images", next)}
                                    max={10}
                                    showCoverBadge={false}
                                    compact
                                    disabled={disabled}
                                />
                            )}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
