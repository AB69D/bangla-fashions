"use client";
import { authFetch } from "@/services/api";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { useAdminAuth } from "@/context/AdminAuthContext";

// The built-in fallback category ("Other", flagged by the backend with a
// systemKey) receives the products of any category that gets deleted. It can
// neither be deleted nor renamed.
// A legacy category already named "Other" has no systemKey until it is adopted, but
// the backend refuses to delete it all the same, so hide the button for it too.
const isSystemCategory = (category) =>
    Boolean(category?.systemKey) || /^\s*other\s*$/i.test(category?.category_name || "");

export default function AllCategoriesPage() {
    const { can } = useAdminAuth();
    const canWrite = can("category:write");
    const canDelete = can("category:delete");

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState(null); // { type: "success" | "error", text }
    const toastTimer = useRef(null);

    const showToast = (type, text) => {
        clearTimeout(toastTimer.current);
        setToast({ type, text });
        toastTimer.current = setTimeout(() => setToast(null), 6000);
    };

    useEffect(() => {
        fetchCategories();
        return () => clearTimeout(toastTimer.current);
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await authFetch(`/api/admin/category/get-all-category`);
            const data = await res.json();
            if (data.success) {
                setCategories(data.data);
            } else {
                setError(data.message || "Failed to load categories");
            }
        } catch (err) {
            setError("Network error. Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const target = deleteTarget;
        if (!target) return;

        setActionLoading(true);
        try {
            const res = await authFetch(`/api/admin/category/delete-category`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: target._id })
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                setCategories((prev) => prev.filter((c) => c._id !== target._id));
                const moved = Number(data.data?.movedProducts) || 0;
                showToast(
                    "success",
                    moved > 0
                        ? `Category "${target.category_name}" deleted. ${moved} ${moved === 1 ? "product was" : "products were"} moved to "Other".`
                        : `Category "${target.category_name}" deleted. It had no products to move.`
                );
                // "Other" may have just been created, and its product count changed.
                fetchCategories();
            } else {
                showToast("error", `Error deleting: ${data?.message || "Something went wrong."}`);
            }
        } catch (err) {
            showToast("error", "Network error. The category was not deleted.");
        } finally {
            setActionLoading(false);
            setDeleteTarget(null);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        const formData = new FormData(e.target);
        formData.append("_id", editingCategory._id);

        try {
            const res = await authFetch(`/api/admin/category/update-category`, {
                method: "PUT",
                body: formData
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                setEditingCategory(null);
                showToast("success", "Category updated.");
                fetchCategories();
            } else {
                showToast("error", `Error updating: ${data?.message || "Something went wrong."}`);
            }
        } catch (err) {
            showToast("error", "Failed to submit.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">All Categories</h3>

            {loading && <p className="text-gray-500 text-sm">Loading categories...</p>}

            {error && <p className="text-red-500 bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 text-xs sm:text-sm">{error}</p>}

            {!loading && !error && categories.length === 0 && (
                <p className="text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 text-xs sm:text-sm">No categories found. Start by creating one.</p>
            )}

            {!loading && categories.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    {categories.map((category, index) => (
                        <div key={category._id || index} className="bg-white border flex flex-col text-gray-700 border-gray-200 rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                            <div className="h-28 sm:h-36 lg:h-40 w-full relative bg-gray-100 flex-shrink-0">
                                {category.category_image ? (
                                    <Image
                                        src={category.category_image}
                                        alt={category.category_name}
                                        fill
                                        style={{ objectFit: 'contain' }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">No Image</div>
                                )}
                            </div>
                            <div className="p-3 sm:p-4 border-t border-gray-100 flex-1 flex flex-col justify-between">
                                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-3 sm:mb-4">
                                    {category.category_name}
                                    {isSystemCategory(category) && (
                                        <span className="ml-2 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            Default
                                        </span>
                                    )}
                                </h4>
                                <div className="flex items-center gap-2 mt-auto">
                                    {canWrite && (
                                        <button
                                            onClick={() => setEditingCategory(category)}
                                            className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-xs sm:text-sm font-medium"
                                        >
                                            <FiEdit2 className="w-3 h-3 sm:w-4 sm:h-4" /> Edit
                                        </button>
                                    )}
                                    {canDelete && !isSystemCategory(category) && (
                                        <button
                                            onClick={() => setDeleteTarget(category)}
                                            disabled={actionLoading}
                                            className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-xs sm:text-sm font-medium disabled:opacity-50"
                                        >
                                            <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" /> Delete
                                        </button>
                                    )}
                                    {!canWrite && !canDelete && (
                                        <span className="text-xs text-gray-400 py-1.5">View only</span>
                                    )}
                                    {!canWrite && canDelete && isSystemCategory(category) && (
                                        <span className="text-xs text-gray-400 py-1.5">Cannot be deleted</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
                            <h3 className="font-bold text-sm sm:text-lg">Edit Category</h3>
                            <button onClick={() => setEditingCategory(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category Name</label>
                                <input
                                    type="text"
                                    name="category_name"
                                    defaultValue={editingCategory.category_name}
                                    required
                                    readOnly={isSystemCategory(editingCategory)}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-sm read-only:bg-gray-50 read-only:text-gray-500"
                                />
                                {isSystemCategory(editingCategory) && (
                                    <p className="mt-1 text-[11px] sm:text-xs text-gray-400">
                                        This is the default category for products whose category was deleted. Its name is fixed, but you can change its image.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Update Image (Optional)</label>
                                <input
                                    type="file"
                                    name="category_image"
                                    accept="image/*"
                                    className="w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="mt-2 w-full bg-emerald-600 text-white font-medium py-2 sm:py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition text-xs sm:text-sm"
                            >
                                {actionLoading ? "Saving..." : "Save Changes"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="delete-category-title" className="bg-white rounded-lg sm:rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 sm:p-5">
                            <h3 id="delete-category-title" className="font-bold text-sm sm:text-lg text-gray-800 mb-2 sm:mb-3">
                                Delete category &ldquo;{deleteTarget.category_name}&rdquo;?
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-600">
                                <li>
                                    Its products are <strong>not</strong> deleted. They are moved to the &ldquo;Other&rdquo; category, which is created automatically if it does not exist yet.
                                </li>
                                <li>The category image is permanently deleted from the server.</li>
                                <li>This cannot be undone.</li>
                            </ul>
                        </div>
                        <div className="flex gap-2 sm:gap-3 justify-end p-3 sm:p-4 border-t border-gray-100">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={actionLoading}
                                className="px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-100 text-xs sm:text-sm disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs sm:text-sm disabled:opacity-70"
                            >
                                {actionLoading ? "Deleting..." : "Delete category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div
                    role="status"
                    className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] flex items-start gap-3 p-3 sm:p-4 rounded-lg shadow-lg border text-xs sm:text-sm ${
                        toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                    }`}
                >
                    <span className="flex-1">{toast.text}</span>
                    <button onClick={() => setToast(null)} aria-label="Dismiss" className="shrink-0 p-0.5 opacity-70 hover:opacity-100">
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}