"use client";
import { useEffect, useRef, useState } from "react";
import { FiUploadCloud, FiX, FiChevronLeft, FiChevronRight, FiAlertCircle } from "react-icons/fi";
import { authFetch } from "@/services/api";
import { normalizeCatalogConfig } from "@/lib/catalogConfig";

// Reusable multi-image field for the product forms (create page + edit modal).
//
// Fully controlled: the parent owns `items` and receives the next array through
// `onChange`. An item is either
//   { kind: "url",  url }              an image already on the server, or
//   { kind: "file", file, preview }    a file picked in this session (preview is
//                                      a blob: URL that this component revokes).
// Both carry a client-only `id` so React keeps tiles stable while reordering.
//
// Saving is destructive on the server: when the PUT omits an image URL that the
// product used to have, that file is deleted from disk. So the payload helpers
// below send EVERY kept image, and callers must omit a field entirely (not send
// an empty array) when they mean "leave this alone".

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // mirrors the backend multer fileSize
export const MAX_FILES_PER_REQUEST = 30; // mirrors productUpload `files` limit
export const MAX_IMAGE_SIZES = 10; // backend only accepts weight_images_0..9

let seq = 0;
const nextId = () => `img-${++seq}`;

export const urlItem = (url) => ({ kind: "url", url, id: nextId() });
export const fileItem = (file) => ({ kind: "file", file, preview: URL.createObjectURL(file), id: nextId() });

// Server image list (strings) -> items. Anything that is not a non-empty string
// is dropped, the DB's weights[].images is an untyped array.
export const itemsFromUrls = (urls) =>
    (Array.isArray(urls) ? urls : []).filter((u) => typeof u === "string" && u).map(urlItem);

export const countNewFiles = (items) => (items || []).filter((i) => i.kind === "file").length;

// Appends the files in `items` to `formData` under `fieldName` (in item order, so
// the server's files[fieldName][n] lines up) and returns the JSON array the
// server expects for that field: a URL string per kept image and { new: n } per
// new file, in the order the admin arranged them.
export function appendImagesToFormData(formData, fieldName, items) {
    let n = 0;
    return (items || []).map((item) => {
        if (item.kind === "file") {
            formData.append(fieldName, item.file, item.file.name);
            return { new: n++ };
        }
        return item.url;
    });
}

// Which image layout the store uses ("variant" = photos per size, "product" =
// one gallery). The admin endpoint needs content:read, which a product-only
// staff role may lack, so fall back to the public settings (same catalog block).
// If both fail we keep the default "variant" layout; every payload built for
// that layout re-sends existing URLs untouched, so a wrong guess cannot delete
// anything.
export function useAdminCatalogConfig() {
    const [state, setState] = useState({ config: normalizeCatalogConfig(undefined), ready: false, failed: false });

    useEffect(() => {
        let cancelled = false;
        const load = async (url, useAuth) => {
            try {
                const res = await (useAuth ? authFetch(url, { cache: "no-store" }) : fetch(url, { cache: "no-store" }));
                if (!res.ok) return null;
                const json = await res.json();
                return json?.success === false ? null : json?.data ?? null;
            } catch {
                return null;
            }
        };
        (async () => {
            const settings =
                (await load("/api/admin/site-settings", true)) || (await load("/api/client/site-settings", false));
            if (cancelled) return;
            setState({ config: normalizeCatalogConfig(settings || undefined), ready: true, failed: !settings });
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
}

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|heic|heif|svg|bmp)$/i;
// Some browsers report an empty MIME type for HEIC/AVIF, so fall back to the extension.
const isImageFile = (file) => (file.type ? file.type.startsWith("image/") : IMAGE_EXT_RE.test(file.name || ""));
const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");

export default function ProductImageManager({
    label,
    hint,
    items,
    onChange,
    max = 10,
    showCoverBadge = true,
    disabled = false,
    compact = false,
    className = "",
}) {
    const inputRef = useRef(null);
    const dragFrom = useRef(null);
    const livePreviews = useRef(new Set());
    const [dropping, setDropping] = useState(false);
    const [dragIndex, setDragIndex] = useState(null);
    const [overIndex, setOverIndex] = useState(null);
    const [error, setError] = useState("");
    const [announce, setAnnounce] = useState("");

    const single = max === 1;
    const count = items.length;

    // Revoke blob: previews as soon as their item leaves the list (removed, or
    // the parent reset the form), and everything that is left on unmount.
    useEffect(() => {
        const current = new Set(items.filter((i) => i.kind === "file" && i.preview).map((i) => i.preview));
        livePreviews.current.forEach((url) => {
            if (!current.has(url)) URL.revokeObjectURL(url);
        });
        livePreviews.current = current;
    }, [items]);
    useEffect(
        () => () => {
            livePreviews.current.forEach((url) => URL.revokeObjectURL(url));
            livePreviews.current = new Set();
        },
        [],
    );

    const addFiles = (fileList) => {
        const incoming = Array.from(fileList || []);
        if (disabled || incoming.length === 0) return;

        // A one-image field (cover) swaps its image instead of refusing a second one.
        const room = single ? 1 : Math.max(0, max - count);
        const accepted = [];
        const problems = [];
        let overflow = 0;
        for (const file of incoming) {
            if (!isImageFile(file)) {
                problems.push(`${file.name} is not an image`);
            } else if (file.size > MAX_IMAGE_BYTES) {
                problems.push(`${file.name} is larger than 8 MB`);
            } else if (accepted.length >= room) {
                overflow += 1;
            } else {
                accepted.push(fileItem(file));
            }
        }
        if (overflow > 0) {
            problems.push(
                single
                    ? `only one image is allowed here, ${overflow} skipped`
                    : `limit is ${max} images, ${overflow} skipped`,
            );
        }
        setError(problems.length ? `${problems.slice(0, 3).join("; ")}${problems.length > 3 ? `; and ${problems.length - 3} more` : ""}.` : "");
        if (accepted.length > 0) onChange(single ? accepted : [...items, ...accepted]);
    };

    const remove = (index) => {
        setError("");
        setAnnounce(`Image ${index + 1} removed`);
        onChange(items.filter((_, i) => i !== index));
    };

    const move = (from, to) => {
        if (from === to || to < 0 || to >= count) return;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setAnnounce(`Image moved to position ${to + 1} of ${count}`);
        onChange(next);
    };

    const endDrag = () => {
        dragFrom.current = null;
        setDragIndex(null);
        setOverIndex(null);
    };

    const onZoneDragOver = (e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        setDropping(true);
    };
    const onZoneDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false);
    };
    const onZoneDrop = (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(false);
        addFiles(e.dataTransfer.files);
    };

    const tileSize = compact ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5";
    const addLabel = single && count > 0 ? "Replace" : "Add";

    return (
        <div className={className}>
            {label && <span className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">{label}</span>}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple={!single}
                className="hidden"
                disabled={disabled}
                onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = ""; // allow picking the same file again
                }}
            />

            <div
                onDragOver={onZoneDragOver}
                onDragLeave={onZoneDragLeave}
                onDrop={onZoneDrop}
                className={`rounded-lg border border-dashed p-2 sm:p-3 transition ${
                    dropping ? "border-emerald-500 bg-emerald-50" : "border-gray-300 bg-gray-50"
                } ${disabled ? "opacity-60" : ""}`}
            >
                {count === 0 ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => inputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-1 py-5 sm:py-6 text-gray-500 hover:text-emerald-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                        <FiUploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                        <span className="text-xs sm:text-sm font-medium">
                            {dropping ? "Drop to add" : single ? "Click to choose an image, or drop one here" : "Click to choose images, or drop them here"}
                        </span>
                    </button>
                ) : (
                    <ul role="list" className={`grid ${tileSize} gap-2`}>
                        {items.map((item, index) => {
                            const src = item.kind === "file" ? item.preview : item.url;
                            const isDragging = dragIndex === index;
                            const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;
                            return (
                                <li
                                    key={item.id}
                                    draggable={!disabled && count > 1}
                                    onDragStart={(e) => {
                                        dragFrom.current = index;
                                        setDragIndex(index);
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", String(index)); // Firefox needs data to start a drag
                                    }}
                                    onDragOver={(e) => {
                                        if (dragFrom.current === null) return; // a file drag bubbles to the zone
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        setOverIndex(index);
                                    }}
                                    onDrop={(e) => {
                                        if (dragFrom.current === null) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const from = dragFrom.current;
                                        endDrag();
                                        move(from, index);
                                    }}
                                    onDragEnd={endDrag}
                                    className={`relative aspect-square rounded-lg overflow-hidden border bg-white ${
                                        isOver ? "ring-2 ring-emerald-500 border-emerald-500" : "border-gray-200"
                                    } ${isDragging ? "opacity-40" : ""} ${count > 1 && !disabled ? "cursor-grab" : ""}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={src}
                                        alt={`${label || "Product image"} ${index + 1}`}
                                        draggable={false}
                                        className="w-full h-full object-cover select-none"
                                    />

                                    <div className="absolute top-1 left-1 flex flex-col items-start gap-1 pointer-events-none">
                                        {showCoverBadge && index === 0 && (
                                            <span className="text-[10px] font-semibold leading-none px-1.5 py-1 rounded bg-emerald-600 text-white shadow">
                                                Cover
                                            </span>
                                        )}
                                        {item.kind === "file" && (
                                            <span className="text-[10px] font-semibold leading-none px-1.5 py-1 rounded bg-blue-600 text-white shadow">
                                                New
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => remove(index)}
                                        aria-label={`Remove image ${index + 1}`}
                                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                    >
                                        <FiX className="w-3.5 h-3.5" />
                                    </button>

                                    {count > 1 && (
                                        <div className="absolute bottom-1 inset-x-1 flex items-center justify-between">
                                            <button
                                                type="button"
                                                disabled={disabled || index === 0}
                                                onClick={() => move(index, index - 1)}
                                                aria-label={`Move image ${index + 1} left`}
                                                className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                            >
                                                <FiChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={disabled || index === count - 1}
                                                onClick={() => move(index, index + 1)}
                                                aria-label={`Move image ${index + 1} right`}
                                                className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                            >
                                                <FiChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}

                        {(single || count < max) && (
                            <li>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => inputRef.current?.click()}
                                    className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:text-emerald-700 hover:border-emerald-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <FiUploadCloud className="w-5 h-5" />
                                    <span className="text-[10px] sm:text-xs font-medium">{dropping ? "Drop" : addLabel}</span>
                                </button>
                            </li>
                        )}
                    </ul>
                )}
            </div>

            <p className="mt-1 text-[10px] sm:text-xs text-gray-400">
                {single ? "Up to 8 MB." : `${count}/${max} images, up to 8 MB each.`}
                {count > 1 ? " Drag to reorder, or use the arrows." : ""}
                {hint ? ` ${hint}` : ""}
            </p>
            {error && (
                <p role="alert" className="mt-1 flex items-start gap-1 text-[11px] sm:text-xs text-red-600">
                    <FiAlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
                    <span>{error}</span>
                </p>
            )}
            <p aria-live="polite" className="sr-only">
                {announce}
            </p>
        </div>
    );
}
