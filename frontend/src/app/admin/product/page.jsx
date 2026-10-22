"use client";
import { authFetch } from "@/services/api";
import React, { useState, useEffect } from "react";
import { FiUploadCloud, FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiLock } from "react-icons/fi";
import { useAdminAuth } from "@/context/AdminAuthContext";
import ProductImageManager, {
    appendImagesToFormData,
    countNewFiles,
    useAdminCatalogConfig,
    MAX_FILES_PER_REQUEST,
    MAX_IMAGE_SIZES,
    photosPreparing,
} from "@/components/admin/ProductImageManager";
import ProductColorsEditor, { colorsPayload, countNewColorFiles, prepareColorsForSave } from "@/components/admin/ProductColorsEditor";
import ProductSizesEditor, { findDuplicateSize } from "@/components/admin/ProductSizesEditor";

export default function CreateProductPage() {
    const { can } = useAdminAuth();
    const canWrite = can("product:write");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [categories, setCategories] = useState([]);
    // One row per size. How they are priced is the admin's choice: one price
    // shared by every ticked size, or a price on each size.
    const [weights, setWeights] = useState([]);
    const [priceMode, setPriceMode] = useState("same");
    const [sharedPrice, setSharedPrice] = useState("");
    const [sharedCost, setSharedCost] = useState("");
    // Colors the product is sold in. Independent of the sizes.
    const [colors, setColors] = useState([]);
    // Variant mode: one optional cover + photos per size. Product mode: a single gallery.
    const [coverItems, setCoverItems] = useState([]);
    const [galleryItems, setGalleryItems] = useState([]);
    const catalog = useAdminCatalogConfig();
    const productMode = catalog.config.productImageMode === "product";
    const [qaList, setQaList] = useState([{ question: "", answer: "" }]);
    const [qaExpanded, setQaExpanded] = useState(true);
    const [showInEcommerce, setShowInEcommerce] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await authFetch(`/api/admin/category/get-all-category`);
                const data = await res.json();
                if (data.success) {
                    setCategories(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // The form is long; bring the result banner into view after a submit.
    const showMessage = (text) => {
        setMessage(text);
        if (text) window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const addQA = () => {
        setQaList([...qaList, { question: "", answer: "" }]);
    };

    const removeQA = (index) => {
        const newQA = qaList.filter((_, i) => i !== index);
        setQaList(newQA);
    };

    const updateQA = (index, field, value) => {
        const newQA = [...qaList];
        newQA[index][field] = value;
        setQaList(newQA);
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (!catalog.ready) return;
        const form = e.currentTarget;
        setMessage("");

        if (photosPreparing()) {
            showMessage("Error: some photos are still being prepared. Wait a moment, then press Upload Product again.");
            return;
        }
        const prepared = prepareColorsForSave(colors);
        if (prepared.error) {
            showMessage(`Error: ${prepared.error}`);
            return;
        }
        const saveColors = prepared.colors;

        // Fail before uploading anything rather than as a server 400.
        const newFiles = countNewColorFiles(saveColors) + (productMode
            ? countNewFiles(galleryItems)
            : countNewFiles(coverItems) + weights.reduce((sum, w) => sum + countNewFiles(w.images), 0));
        if (newFiles > MAX_FILES_PER_REQUEST) {
            showMessage(`Error: ${newFiles} photos selected, but at most ${MAX_FILES_PER_REQUEST} can be uploaded at once. Remove some and add them after saving.`);
            return;
        }
        if (!productMode && weights.some((w, i) => i >= MAX_IMAGE_SIZES && countNewFiles(w.images) > 0)) {
            showMessage(`Error: photos can only be attached to the first ${MAX_IMAGE_SIZES} size rows.`);
            return;
        }
        if (weights.length === 0) {
            showMessage("Error: add at least one size.");
            return;
        }
        const dupSize = findDuplicateSize(weights);
        if (dupSize) {
            showMessage(`Error: size ${dupSize} is listed twice.`);
            return;
        }
        if (priceMode === "same" && !(parseFloat(sharedPrice) >= 0)) {
            showMessage("Error: enter the price that applies to every size.");
            return;
        }

        setLoading(true);

        const filteredQA = qaList.filter(qa => qa.question.trim() && qa.answer.trim());

        const formData = new FormData();

        formData.append("firstName", form.firstName.value);
        formData.append("lastName", form.lastName.value);
        formData.append("category", form.category.value);
        formData.append("colors", JSON.stringify(colorsPayload(formData, saveColors)));
        formData.append("weights", JSON.stringify(weights.map(w => ({
            weight: w.weight,
            stock: parseInt(w.stock) || 0,
            // "Same price" mode: every ticked size takes the one shared price.
            price: parseFloat(priceMode === "same" ? sharedPrice : w.price) || 0,
            costPrice: parseFloat(priceMode === "same" ? sharedCost : w.costPrice) || 0,
            sku: (w.sku || "").trim(),
            barcode: (w.barcode || "").trim()
        }))));
        formData.append("description", form.description.value);
        formData.append("qa", JSON.stringify(filteredQA));
        formData.append("showInEcommerce", showInEcommerce);

        // A new product only has files to send (no existing URLs yet). The server
        // makes the first gallery image / the cover file the product's cover.
        if (productMode) {
            appendImagesToFormData(formData, "gallery_images", galleryItems);
        } else {
            appendImagesToFormData(formData, "cover_image", coverItems);
            weights.forEach((weight, index) => {
                appendImagesToFormData(formData, `weight_images_${index}`, weight.images);
            });
        }

        try {
            const res = await authFetch(`/api/admin/product/upload-product`, {
                method: "POST",
                body: formData,
            });
            // A proxy error page is not JSON: report the status instead of a vague failure.
            const data = await res.json().catch(() => ({ message: `the server answered ${res.status} ${res.statusText}`.trim() }));

            if (data.success) {
                showMessage(`Success: ${data.message}`);
                form.reset();
                setWeights([]);
                setPriceMode("same");
                setSharedPrice("");
                setSharedCost("");
                setColors([]);
                setCoverItems([]);
                setGalleryItems([]);
                setQaList([{ question: "", answer: "" }]);
                setShowInEcommerce(true);
            } else {
                showMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            showMessage(`Failed to submit (${error?.message || "network error"}). Check the connection and try again. If it keeps failing, remove the photos and pick them again.`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!canWrite) {
        return (
            <div className="max-w-md mx-auto text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <FiLock className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">View-only access</h3>
                <p className="text-gray-500">You don&apos;t have permission to create or edit products. Ask an admin to grant you the <strong>Products: write</strong> permission.</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Create Product</h3>

            {message && (
                <div className={`p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg font-medium text-xs sm:text-sm border ${
                    message.startsWith("Success") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                }`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleProductSubmit} className="flex flex-col gap-4 sm:gap-5">
                {!catalog.ready ? (
                    <div className="h-28 rounded-lg bg-gray-100 animate-pulse" aria-hidden="true" />
                ) : productMode ? (
                    <ProductImageManager
                        label="Product Photos"
                        hint="Shown as one slider for every size. The first photo is the cover."
                        items={galleryItems}
                        onChange={setGalleryItems}
                        max={10}
                        disabled={loading}
                    />
                ) : (
                    <ProductImageManager
                        label="Cover Image"
                        items={coverItems}
                        onChange={setCoverItems}
                        max={1}
                        showCoverBadge={false}
                        disabled={loading}
                    />
                )}
                {catalog.failed && (
                    <p className="-mt-2 text-[11px] sm:text-xs text-amber-600">
                        Could not read the store&apos;s image setting, so the default per-size photo layout is shown.
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-5">
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product First Name</label>
                        <input 
                            type="text" 
                            name="firstName" 
                            required 
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm" 
                            placeholder="e.g. Classic Cotton Panjabi" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product Last Name</label>
                        <input 
                            type="text" 
                            name="lastName" 
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm" 
                            placeholder="e.g. Full Sleeve" 
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
                    <select 
                        name="category" 
                        required 
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm"
                    >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                                {cat.category_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Visibility</label>
                    <label className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
                        <input
                            type="checkbox"
                            checked={showInEcommerce}
                            onChange={(e) => setShowInEcommerce(e.target.checked)}
                            className="mt-0.5 w-4 h-4 sm:w-5 sm:h-5 accent-emerald-600 shrink-0"
                        />
                        <span className="text-xs sm:text-sm">
                            <span className="font-medium text-gray-800 block">Show on e-commerce storefront</span>
                            <span className="text-gray-500">
                                {showInEcommerce
                                    ? "Visible to online shoppers and sellable at the POS."
                                    : "Hidden from the website — available at the POS terminal only."}
                            </span>
                        </span>
                    </label>
                </div>

                <ProductColorsEditor colors={colors} onChange={setColors} disabled={loading} />

                <ProductSizesEditor
                    rows={weights}
                    setRows={setWeights}
                    priceMode={priceMode}
                    setPriceMode={setPriceMode}
                    sharedPrice={sharedPrice}
                    setSharedPrice={setSharedPrice}
                    sharedCost={sharedCost}
                    setSharedCost={setSharedCost}
                    showPhotos={catalog.ready && !productMode}
                    disabled={loading}
                />

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Description</label>
                    <textarea 
                        name="description" 
                        rows={4}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 resize-none text-xs sm:text-sm" 
                        placeholder="Details about product..." 
                    />
                </div>

                <div className="border-t pt-4 sm:pt-5">
                    <button
                        type="button"
                        onClick={() => setQaExpanded(!qaExpanded)}
                        className="flex items-center justify-between w-full mb-3 sm:mb-4"
                    >
                        <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Question & Answer</h4>
                        {qaExpanded ? (
                            <FiChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        ) : (
                            <FiChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        )}
                    </button>

                    {qaExpanded && (
                        <div className="space-y-3 sm:space-y-4">
                            {qaList.map((qa, index) => (
                                <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <span className="text-xs sm:text-sm font-medium text-gray-600">Q&A {index + 1}</span>
                                        {qaList.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeQA(index)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 sm:space-y-3">
                                        <div>
                                            <label className="block text-[10px] sm:text-xs text-gray-500 mb-1">Question</label>
                                            <input 
                                                type="text" 
                                                value={qa.question}
                                                onChange={(e) => updateQA(index, "question", e.target.value)}
                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm" 
                                                placeholder="e.g. What is the fabric?" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] sm:text-xs text-gray-500 mb-1">Answer</label>
                                            <textarea 
                                                value={qa.answer}
                                                onChange={(e) => updateQA(index, "answer", e.target.value)}
                                                rows={2}
                                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-xs sm:text-sm resize-none" 
                                                placeholder="e.g. Cotton. Machine wash cold, do not bleach." 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={addQA}
                                className="flex items-center gap-1 text-xs sm:text-sm text-emerald-600 hover:text-emerald-700"
                            >
                                <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> Add More Q&A
                            </button>
                        </div>
                    )}
                </div>

                <button type="submit" disabled={loading || !catalog.ready} className="mt-4 sm:mt-6 flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-medium py-2.5 sm:py-3 rounded-lg shadow hover:bg-emerald-700 disabled:opacity-70 transition text-xs sm:text-sm">
                    <FiUploadCloud className="w-4 h-4 sm:w-5 sm:h-5" /> {loading ? "Uploading..." : "Upload Product"}
                </button>
            </form>
        </div>
    );
}