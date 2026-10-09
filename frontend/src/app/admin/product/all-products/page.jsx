"use client";
import { authFetch } from "@/services/api";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FiEdit, FiTrash2, FiSearch, FiX, FiImage } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useCurrency } from "@/context/CurrencyContext.jsx";
import ProductImageManager, {
    appendImagesToFormData,
    countNewFiles,
    itemsFromUrls,
    useAdminCatalogConfig,
    MAX_FILES_PER_REQUEST,
    MAX_IMAGE_SIZES,
} from "@/components/admin/ProductImageManager";

// Mirror of the backend GS1 (prefix 2) barcode generator for in-form previews.
const genBarcodePreview = (index = 0) => {
    const ts = String(Date.now()).slice(-8);
    const rand = String(Math.floor(Math.random() * 90) + 10);
    const idx = String(index % 100).padStart(2, "0");
    return `2${ts}${rand}${idx}`;
};

// Every distinct image the product already has (cover first, then size photos).
// Used to seed an empty gallery when the store switches to "one gallery" mode.
const existingImageUrls = (product) => {
    const seen = new Set();
    const out = [];
    const push = (u) => {
        if (typeof u === "string" && u && !seen.has(u)) {
            seen.add(u);
            out.push(u);
        }
    };
    push(product.cover_image);
    (product.weights || []).forEach((w) => (w.images || []).forEach(push));
    return out;
};

// List thumbnail: legacy per-size products may have no cover at all.
const listImage = (product) => product.cover_image || product.gallery?.[0] || existingImageUrls(product)[0] || "";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AllProductsPage() {
    const { can } = useAdminAuth();
    const canWrite = can("product:write");
    const canDelete = can("product:delete");
    const { symbol } = useCurrency();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleteModal, setDeleteModal] = useState({ show: false, product: null });
    const [editModal, setEditModal] = useState({ show: false, product: null });
    const [editShowEcom, setEditShowEcom] = useState(true);
    const [editWeights, setEditWeights] = useState([]);
    // Image state for the open edit modal. Both layouts are loaded so the one the
    // store uses is ready; the other layout's data is never sent (see handleEdit).
    const [editGallery, setEditGallery] = useState([]);
    const [editCover, setEditCover] = useState([]);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);
    const [categories, setCategories] = useState([]);
    const [notice, setNotice] = useState(null); // { type: "success" | "error", text }
    const noticeTimer = useRef(null);
    const catalog = useAdminCatalogConfig();
    const productMode = catalog.config.productImageMode === "product";

    const flash = (type, text) => {
        clearTimeout(noticeTimer.current);
        setNotice({ type, text });
        noticeTimer.current = setTimeout(() => setNotice(null), 6000);
    };
    useEffect(() => () => clearTimeout(noticeTimer.current), []);

    const closeEdit = () => {
        setEditModal({ show: false, product: null });
        setEditError("");
    };

    const openEdit = (product) => {
        setEditError("");
        setEditGallery(itemsFromUrls(product.gallery));
        setEditCover(itemsFromUrls(product.cover_image ? [product.cover_image] : []));
        setEditShowEcom(product.showInEcommerce !== false);
        setEditWeights(
            (product.weights || []).map((w) => ({
                weight: w.weight ?? "",
                stock: w.stock ?? "",
                price: w.price ?? "",
                costPrice: w.costPrice ?? "",
                discountPercent: w.discountPercent ?? 0,
                sku: w.sku ?? "",
                barcode: w.barcode ?? "",
                images: itemsFromUrls(w.images),
            })),
        );
        setEditModal({ show: true, product });
    };

    const updateEditWeight = (index, field, value) => {
        setEditWeights((prev) => prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
    };

    const limit = 10;

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

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await authFetch(`/api/admin/product/get-all-product`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ page, limit, search })
                });
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                    setTotalPages(data.totalNoPage || 1);
                }
            } catch (error) {
                console.error("Failed to fetch products:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(timer);
    }, [page, search, reloadTick]);

    const handleDelete = async () => {
        const target = deleteModal.product;
        if (!target || deleting) return;
        setDeleting(true);

        try {
            const res = await authFetch(`/api/admin/product/delete-product`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: target._id })
            });
            const data = await res.json().catch(() => null);

            if (res.ok && data?.success) {
                setProducts((prev) => prev.filter((p) => p._id !== target._id));
                const r = data.data || {};
                const removed = [];
                if (r.reviewsDeleted) removed.push(plural(r.reviewsDeleted, "review"));
                if (r.files?.deleted?.length) removed.push(plural(r.files.deleted.length, "image file"));
                let text = `Product deleted permanently${removed.length ? ` (also removed ${removed.join(", ")})` : ""}.`;
                if (r.files?.failed?.length) text += ` ${plural(r.files.failed.length, "image file")} could not be deleted from the server.`;
                flash(r.files?.failed?.length ? "error" : "success", text);
            } else if (res.status === 404) {
                setProducts((prev) => prev.filter((p) => p._id !== target._id));
                flash("error", "That product no longer exists. It has been removed from the list.");
            } else {
                flash("error", `Failed to delete product${data?.message ? `: ${data.message}` : ""}`);
            }
        } catch (error) {
            flash("error", "Failed to delete product. Please check your connection.");
        } finally {
            setDeleting(false);
            setDeleteModal({ show: false, product: null });
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (editSaving || !catalog.ready) return;
        const product = editModal.product;
        const fields = new FormData(e.currentTarget);

        // Fail before uploading anything rather than as a server 400.
        const newFiles = productMode
            ? countNewFiles(editGallery)
            : countNewFiles(editCover) + editWeights.reduce((sum, w) => sum + countNewFiles(w.images), 0);
        if (newFiles > MAX_FILES_PER_REQUEST) {
            setEditError(`${newFiles} new photos are selected, but at most ${MAX_FILES_PER_REQUEST} can be uploaded in one save. Remove some, save, then add the rest.`);
            return;
        }
        if (!productMode && editWeights.some((w, i) => i >= MAX_IMAGE_SIZES && countNewFiles(w.images) > 0)) {
            setEditError(`New photos can only be added to the first ${MAX_IMAGE_SIZES} sizes.`);
            return;
        }

        // Multipart, because new photos are files. The server deletes any image
        // file this product had that is missing from what we send, so:
        //  - a layout's image field is sent in full (every kept URL + new files),
        //    exactly as the admin arranged it;
        //  - the OTHER layout's fields are omitted entirely, which the server reads
        //    as "unchanged" (an empty array would mean "remove everything").
        const body = new FormData();
        body.append("_id", product._id);
        body.append("firstName", fields.get("firstName") ?? "");
        body.append("lastName", fields.get("lastName") ?? "");
        body.append("category", fields.get("category") ?? "");
        body.append("description", fields.get("description") ?? "");
        body.append("qa", JSON.stringify(product.qa || []));
        body.append("showInEcommerce", String(editShowEcom));

        const weightsPayload = editWeights.map((w, index) => {
            const out = {
                weight: w.weight,
                stock: parseInt(w.stock) || 0,
                price: parseFloat(w.price) || 0,
                costPrice: parseFloat(w.costPrice) || 0,
                discountPercent: parseFloat(w.discountPercent) || 0,
                sku: (w.sku || "").trim(),
                barcode: (w.barcode || "").trim(),
            };
            if (!productMode) out.images = appendImagesToFormData(body, `weight_images_${index}`, w.images);
            return out;
        });
        body.append("weights", JSON.stringify(weightsPayload));

        if (productMode) {
            body.append("gallery", JSON.stringify(appendImagesToFormData(body, "gallery_images", editGallery)));
        } else {
            // "" clears the cover, a URL keeps it, a file replaces it.
            const cover = editCover[0];
            if (!cover) body.append("cover_image", "");
            else if (cover.kind === "file") body.append("cover_image", cover.file, cover.file.name);
            else body.append("cover_image", cover.url);
        }

        setEditSaving(true);
        setEditError("");
        try {
            const res = await authFetch(`/api/admin/product/update-product-details`, {
                method: "PUT",
                body, // FormData: the browser sets the multipart boundary itself
            });
            const data = await res.json().catch(() => null);

            if (res.ok && data?.success) {
                const updated = data.data && typeof data.data === "object" && data.data._id ? data.data : null;
                if (updated) {
                    const category = typeof updated.category === "string"
                        ? categories.find((c) => c._id === updated.category) || updated.category
                        : updated.category;
                    setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...updated, category } : p)));
                } else {
                    setReloadTick((t) => t + 1);
                }
                flash(
                    "success",
                    data.removedFiles > 0
                        ? `Product updated successfully. ${plural(data.removedFiles, "removed image file")} deleted from the server.`
                        : "Product updated successfully"
                );
                closeEdit();
            } else {
                setEditError(data?.message || "Failed to update product");
            }
        } catch (error) {
            setEditError("Failed to update product. Please check your connection.");
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">All Products</h3>
                {canWrite && (
                    <Link href="/admin/product" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
                        + Add New
                    </Link>
                )}
            </div>

            {notice && (
                <div role="status" className={`p-4 mb-4 rounded-lg text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {notice.text}
                </div>
            )}

            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No products found</div>
            ) : (
                <>
                    <p className="sm:hidden px-4 py-2 text-xs text-gray-400 bg-gray-50 border border-b-0 border-gray-200 rounded-t-xl">
                        Swipe left/right to see all columns →
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Image</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Product</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Price Range</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Stock</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.map((product) => {
                                    const minPrice = product.weights?.length > 0 ? Math.min(...product.weights.map(w => w.price)) : 0;
                                    const maxPrice = product.weights?.length > 0 ? Math.max(...product.weights.map(w => w.price)) : 0;
                                    const totalStock = product.weights?.reduce((sum, w) => sum + (w.stock || 0), 0) || 0;

                                    return (
                                        <tr key={product._id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                {listImage(product) ? (
                                                    <img src={listImage(product)} alt={product.firstName} className="w-12 h-12 object-cover rounded-lg" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <FiImage className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-800">{product.firstName}</p>
                                                {product.lastName && <p className="text-sm text-gray-500">{product.lastName}</p>}
                                                {product.showInEcommerce === false && (
                                                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                        POS only
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {product.category?.category_name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {symbol}{minPrice} - {symbol}{maxPrice}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalStock > 10 ? 'bg-green-100 text-green-700' : totalStock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {totalStock} items
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {canWrite && (
                                                        <button
                                                            onClick={() => openEdit(product)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <FiEdit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => setDeleteModal({ show: true, product })}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!canWrite && !canDelete && (
                                                        <span className="text-xs text-gray-400">View only</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {deleteModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-6">
                    <div role="dialog" aria-modal="true" aria-labelledby="delete-product-title" className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h3 id="delete-product-title" className="text-lg font-semibold text-gray-800 mb-3">Delete product permanently?</h3>
                        <p className="text-gray-600 mb-3">You are about to delete <strong>{deleteModal.product.firstName}</strong>. This action cannot be undone.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mb-4">
                            <li>The product and all of its images are removed permanently, and the image files are deleted from the server.</li>
                            <li>Its customer reviews, and their photos, are deleted.</li>
                            <li>It is removed from customers&apos; carts and wishlists, and landing-page order forms that use it are emptied.</li>
                            <li>Order history is kept: past orders still show the product name, price and quantity, but not its photo.</li>
                        </ul>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteModal({ show: false, product: null })} disabled={deleting} className="px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70">{deleting ? "Deleting..." : "Delete permanently"}</button>
                        </div>
                    </div>
                </div>
            )}

            {editModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div role="dialog" aria-modal="true" aria-labelledby="edit-product-title" className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 id="edit-product-title" className="text-lg font-semibold text-gray-800">Edit Product</h3>
                            <button type="button" onClick={closeEdit} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-lg">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                    <input type="text" name="firstName" defaultValue={editModal.product.firstName} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input type="text" name="lastName" defaultValue={editModal.product.lastName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select name="category" defaultValue={editModal.product.category?._id} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>{cat.category_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea name="description" defaultValue={editModal.product.description} rows={4} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                                <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
                                    <input
                                        type="checkbox"
                                        checked={editShowEcom}
                                        onChange={(e) => setEditShowEcom(e.target.checked)}
                                        className="mt-0.5 w-5 h-5 accent-emerald-600 shrink-0"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium text-gray-800 block">Show on e-commerce storefront</span>
                                        <span className="text-gray-500">
                                            {editShowEcom
                                                ? "Visible to online shoppers and sellable at the POS."
                                                : "Hidden from the website — available at the POS terminal only."}
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div className="mb-4 border-t pt-4">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">{productMode ? "Product Photos" : "Cover Image"}</h4>
                                {!catalog.ready ? (
                                    <div className="h-28 rounded-lg bg-gray-100 animate-pulse" aria-hidden="true" />
                                ) : productMode ? (
                                    <>
                                        <ProductImageManager
                                            label="Photos"
                                            hint="Shown as one slider for every size. The first photo is the cover. Removing a photo deletes its file from the server when you save, unless one of the sizes also uses it."
                                            items={editGallery}
                                            onChange={setEditGallery}
                                            max={10}
                                            disabled={editSaving}
                                        />
                                        {editGallery.length === 0 && existingImageUrls(editModal.product).length > 0 && (
                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                                <span>No gallery yet. The storefront is showing this product&apos;s cover and size photos instead.</span>
                                                <button
                                                    type="button"
                                                    disabled={editSaving}
                                                    onClick={() => setEditGallery(itemsFromUrls(existingImageUrls(editModal.product).slice(0, 10)))}
                                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-50"
                                                >
                                                    Use these photos
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <ProductImageManager
                                        label="Cover"
                                        hint="Photos for each size are managed with the size below. Replacing or removing the cover deletes its file from the server when you save."
                                        items={editCover}
                                        onChange={setEditCover}
                                        max={1}
                                        showCoverBadge={false}
                                        disabled={editSaving}
                                    />
                                )}
                                {catalog.failed && (
                                    <p className="mt-2 text-xs text-amber-600">Could not read the store&apos;s image setting, so the default per-size photo layout is shown.</p>
                                )}
                            </div>
                            {editWeights.length > 0 && (
                                <div className="mb-4 border-t pt-4">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">{productMode ? "Variants · Stock, SKU & Barcode" : "Variants · Stock, SKU, Barcode & Photos"}</h4>
                                    <div className="space-y-3">
                                        {editWeights.map((w, index) => (
                                            <div key={index} className="bg-gray-50 border rounded-lg p-3">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Weight</label>
                                                        <input type="text" value={w.weight} onChange={(e) => updateEditWeight(index, "weight", e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Stock</label>
                                                        <input type="number" value={w.stock} onChange={(e) => updateEditWeight(index, "stock", e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Price ($)</label>
                                                        <input type="number" value={w.price} onChange={(e) => updateEditWeight(index, "price", e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Cost ($)</label>
                                                        <input type="number" value={w.costPrice} onChange={(e) => updateEditWeight(index, "costPrice", e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="for profit" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">SKU</label>
                                                        <input type="text" value={w.sku} onChange={(e) => updateEditWeight(index, "sku", e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="auto if blank" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Barcode</label>
                                                        <div className="flex gap-1.5">
                                                            <input type="text" value={w.barcode} onChange={(e) => updateEditWeight(index, "barcode", e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="auto if blank" />
                                                            <button type="button" onClick={() => updateEditWeight(index, "barcode", genBarcodePreview(index))} title="Generate a barcode" className="shrink-0 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100">Gen</button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {catalog.ready && !productMode && (
                                                    <ProductImageManager
                                                        className="mt-3"
                                                        label={`Images for ${w.weight || "this size"}`}
                                                        items={w.images}
                                                        onChange={(next) => updateEditWeight(index, "images", next)}
                                                        max={10}
                                                        showCoverBadge={false}
                                                        compact
                                                        disabled={editSaving}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-2">Leave SKU / barcode blank to auto-generate a scannable code on save.</p>
                                </div>
                            )}

                            {editError && (
                                <p role="alert" className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{editError}</p>
                            )}
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={closeEdit} disabled={editSaving} className="px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                                <button type="submit" disabled={editSaving || !catalog.ready} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-70">{editSaving ? "Saving..." : "Save Changes"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}