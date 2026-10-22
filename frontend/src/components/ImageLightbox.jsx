"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

const mod = (n, m) => ((n % m) + m) % m;
const SWIPE_PX = 50;

// Full-screen "big image" popup. Fully controlled by the caller: it is mounted
// only while open, starts on `startIndex`, and reports the slide it ended on to
// `onClose` so the slider underneath can follow. Esc, the backdrop and the X
// close it; arrows, the buttons, thumbnails and a horizontal swipe move between
// photos. Focus is held inside while open and handed back to the opener on close.
export default function ImageLightbox({ images, startIndex = 0, alt = "", onClose }) {
    const count = images.length;
    const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0)));
    const closeRef = useRef(null);
    const openerRef = useRef(null);
    const touchX = useRef(null);

    const go = useCallback((dir) => setIndex((i) => mod(i + dir, count)), [count]);
    const close = () => onClose(index);

    useEffect(() => {
        openerRef.current = document.activeElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = prevOverflow;
            openerRef.current?.focus?.();
        };
    }, []);

    const onKeyDown = (e) => {
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft" && count > 1) go(-1);
        else if (e.key === "ArrowRight" && count > 1) go(1);
        else if (e.key === "Tab") {
            // Keep Tab inside the dialog.
            const focusable = e.currentTarget.querySelectorAll("button");
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
            return;
        } else return;
        e.preventDefault();
    };

    if (typeof document === "undefined" || count === 0) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${alt || "Product"} photos, enlarged`}
            onKeyDown={onKeyDown}
            className="fixed inset-0 z-[100] flex flex-col bg-black/90 animate-[fade-in_.2s_ease-out]"
        >
            <div className="flex items-center justify-between px-4 py-3 text-white">
                <span className="text-sm tabular-nums opacity-80">{count > 1 ? `${index + 1} / ${count}` : ""}</span>
                <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
                >
                    <FiX className="h-6 w-6" />
                </button>
            </div>

            {/* The empty area around the photo closes the popup, like the backdrop of any modal. */}
            <div
                className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
                onClick={(e) => e.target === e.currentTarget && close()}
                onTouchStart={(e) => {
                    touchX.current = e.touches.length === 1 ? e.touches[0].clientX : null;
                }}
                onTouchEnd={(e) => {
                    const start = touchX.current;
                    touchX.current = null;
                    if (start === null || count < 2) return;
                    const dx = e.changedTouches[0].clientX - start;
                    if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
                }}
            >
                <img
                    key={images[index]}
                    src={images[index]}
                    alt={count > 1 ? `${alt}, image ${index + 1} of ${count}` : alt}
                    draggable={false}
                    className="max-h-full max-w-full select-none object-contain"
                />
                {count > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label="Previous image"
                            className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 sm:left-4 sm:flex"
                        >
                            <FiChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label="Next image"
                            className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 sm:right-4 sm:flex"
                        >
                            <FiChevronRight className="h-6 w-6" />
                        </button>
                    </>
                )}
            </div>

            {count > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
                    {images.map((src, i) => (
                        <button
                            key={`${i}-${src}`}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Show image ${i + 1} of ${count}`}
                            aria-current={i === index ? "true" : undefined}
                            className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                                i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
