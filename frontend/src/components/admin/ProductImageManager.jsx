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
export const MAX_IMAGE_SIZES = 30; // backend accepts weight_images_0..29 (MAX_VARIANT_IMAGE_FIELDS in product.route.js)

let seq = 0;
const nextId = () => `img-${++seq}`;

// How many image fields on the page are still preparing picked photos. The
// product forms check it before saving: a photo still being prepared is not in
// the form yet, and saving then would quietly leave it out.
let preparingFields = 0;
export const photosPreparing = () => preparingFields > 0;

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

// The server stores product photos at most 2000px on the long edge, so nothing
// larger is worth sending.
const MAX_UPLOAD_EDGE = 2000;
const SMALL_ENOUGH_BYTES = 1.5 * 1024 * 1024;

// Turn a picked photo into the file that will be uploaded, right when it is
// picked:
//   - its bytes are read into memory now. On Android a photo from the gallery
//     is only a handle, and by the time Save is pressed Chrome may no longer be
//     allowed to read it (net::ERR_UPLOAD_FILE_CHANGED), which fails the whole
//     upload before it leaves the phone;
//   - a large JPEG/PNG/WebP is scaled down to MAX_UPLOAD_EDGE, so a phone uploads
//     a few hundred KB per photo instead of several MB.
// Formats the browser cannot redraw (HEIC, AVIF, GIF, SVG) are sent as picked.
async function prepareImageFile(file) {
    const copy = new File([await file.arrayBuffer()], file.name, { type: file.type, lastModified: file.lastModified });
    if (!/^image\/(jpe?g|png|webp)$/i.test(copy.type) || typeof createImageBitmap !== "function") return copy;

    let bitmap;
    try {
        bitmap = await createImageBitmap(copy);
    } catch {
        return copy;
    }
    try {
        const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
        if (scale === 1 && copy.size <= SMALL_ENOUGH_BYTES) return copy;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        // JPEG stays JPEG; PNG/WebP become WebP so a transparent background survives.
        const type = /jpe?g/i.test(copy.type) ? "image/jpeg" : "image/webp";
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.9));
        // A browser that cannot encode the type hands back PNG instead: keep the original.
        if (!blob || blob.type !== type || blob.size >= copy.size) return copy;
        const name = `${copy.name.replace(/\.[^.]+$/, "") || "photo"}.${type === "image/jpeg" ? "jpg" : "webp"}`;
        return new File([blob], name, { type, lastModified: copy.lastModified });
    } finally {
        bitmap.close?.();
    }
}

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
    // True while picked photos are being read and shrunk (see prepareImageFile).
    const [preparing, setPreparing] = useState(false);
    const busy = disabled || preparing;
    // Preparing photos takes a moment, and the parent may re-render meanwhile
    // (another field typed into, another photo box changed). The result is added
    // to the items and handed to the onChange of that moment, not of the click.
    const latest = useRef({ items, onChange });
    useEffect(() => {
        latest.current = { items, onChange };
    });

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

    const addFiles = async (fileList) => {
        const incoming = Array.from(fileList || []);
        if (busy || incoming.length === 0) return;

        // A one-image field (cover) swaps its image instead of refusing a second one.
        const room = single ? 1 : Math.max(0, max - count);
        const picked = [];
        const problems = [];
        let overflow = 0;
        for (const file of incoming) {
            if (!isImageFile(file)) {
                problems.push(`${file.name} is not an image`);
            } else if (picked.length >= room) {
                overflow += 1;
            } else {
                picked.push(file);
            }
        }

        // One at a time: each photo is decoded at full size, which is heavy on a phone.
        setPreparing(true);
        preparingFields += 1;
        const accepted = [];
        try {
            for (const file of picked) {
                let ready;
                try {
                    ready = await prepareImageFile(file);
                } catch {
                    problems.push(`${file.name} could not be read, please pick it again`);
                    continue;
                }
                if (ready.size > MAX_IMAGE_BYTES) problems.push(`${file.name} is larger than 8 MB`);
                else accepted.push(fileItem(ready));
            }
        } finally {
            preparingFields -= 1;
            setPreparing(false);
        }

        if (overflow > 0) {
            problems.push(
                single
                    ? `only one image is allowed here, ${overflow} skipped`
                    : `limit is ${max} images, ${overflow} skipped`,
            );
        }
        setError(problems.length ? `${problems.slice(0, 3).join("; ")}${problems.length > 3 ? `; and ${problems.length - 3} more` : ""}.` : "");
        if (accepted.length > 0) {
            const { items: current, onChange: emit } = latest.current;
            emit(single ? accepted : [...current, ...accepted]);
        }
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
        if (busy || !hasFiles(e)) return;
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
                disabled={busy}
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
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-1 py-5 sm:py-6 text-gray-500 hover:text-emerald-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                        <FiUploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                        <span className="text-xs sm:text-sm font-medium">
                            {preparing ? "Preparing photos..." : dropping ? "Drop to add" : single ? "Click to choose an image, or drop one here" : "Click to choose images, or drop them here"}
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
                                    draggable={!busy && count > 1}
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
                                    } ${isDragging ? "opacity-40" : ""} ${count > 1 && !busy ? "cursor-grab" : ""}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={src}
                                        alt={`${label || "Product image"} ${index + 1}`}
                                        draggable={false}
                                        className="w-full h-full object-contain select-none"
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
                                        disabled={busy}
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
                                                disabled={busy || index === 0}
                                                onClick={() => move(index, index - 1)}
                                                aria-label={`Move image ${index + 1} left`}
                                                className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                            >
                                                <FiChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy || index === count - 1}
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
                                    disabled={busy}
                                    onClick={() => inputRef.current?.click()}
                                    className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:text-emerald-700 hover:border-emerald-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <FiUploadCloud className="w-5 h-5" />
                                    <span className="text-[10px] sm:text-xs font-medium">{preparing ? "Preparing..." : dropping ? "Drop" : addLabel}</span>
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
