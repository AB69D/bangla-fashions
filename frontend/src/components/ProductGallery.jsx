"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiPause, FiPlay } from "react-icons/fi";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const mod = (n, m) => ((n % m) + m) % m;

// How long a programmatic scroll may "own" the active index before we trust the
// real scroll position again (covers a scroll the shopper interrupted).
const TRAVEL_MS = 1000;

// Product photo slider built on a native scroll-snap track (so swipe, momentum
// and snapping are the browser's own) with no carousel library.
//
// The scroll position is the single source of truth for which slide is showing:
// swipes and wheel scrolls update `index` through the scroll handler, and the
// buttons/dots/timer only ever ask the track to scroll. `children` are overlay
// badges (e.g. the discount pill) and are positioned against the photo frame.
export default function ProductGallery({ images, alt = "", autoSlide = false, intervalSeconds = 4, children }) {
    // Callers rebuild the `images` array on every render, so identity is useless.
    // A string key of its contents tells us when the photos really changed.
    const contentKey = Array.isArray(images)
        ? images.filter((s) => typeof s === "string" && s !== "").join("\n")
        : "";
    const list = useMemo(() => (contentKey ? contentKey.split("\n") : []), [contentKey]);
    const count = list.length;

    const [index, setIndex] = useState(0);
    // Autoplay gates. The slideshow runs only while every one of them allows it.
    const [userPaused, setUserPaused] = useState(false); // the visible pause button
    const [hovering, setHovering] = useState(false); // mouse/pen over the slider
    const [keyboardFocus, setKeyboardFocus] = useState(false); // :focus-visible inside
    const [touching, setTouching] = useState(false); // finger down / swiping
    const [tabHidden, setTabHidden] = useState(false);
    const [inView, setInView] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);
    // Bumped by every manual interaction so the countdown restarts even when the
    // shopper lands on the slide that was already showing.
    const [tick, setTick] = useState(0);
    const bump = () => setTick((t) => t + 1);

    // Different photos (the shopper picked another size): back to the first slide.
    // Done while rendering so there is no frame showing the old position; the
    // track itself is keyed on the content, so it also remounts at scrollLeft 0.
    const [seenKey, setSeenKey] = useState(contentKey);
    if (seenKey !== contentKey) {
        setSeenKey(contentKey);
        setIndex(0);
    }

    const rootRef = useRef(null);
    const trackRef = useRef(null);
    const thumbsRef = useRef(null);
    const rafRef = useRef(0);
    // { target, expires } while a programmatic scroll is travelling.
    const headingRef = useRef(null);

    useEffect(() => {
        headingRef.current = null;
    }, [contentKey]);

    // ---- environment gates -------------------------------------------------
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return undefined;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setReducedMotion(mq.matches);
        sync();
        if (mq.addEventListener) mq.addEventListener("change", sync);
        else mq.addListener(sync);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener("change", sync);
            else mq.removeListener(sync);
        };
    }, []);

    const canAutoplay = !!autoSlide && count > 1 && !reducedMotion;
    const running = canAutoplay && !userPaused && !hovering && !keyboardFocus && !touching && !tabHidden && inView;
    const intervalMs = clamp(Number(intervalSeconds) || 4, 2, 15) * 1000;

    useEffect(() => {
        if (!canAutoplay) return undefined;
        const onVisibility = () => setTabHidden(document.hidden);
        onVisibility();
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [canAutoplay]);

    useEffect(() => {
        const el = rootRef.current;
        if (!canAutoplay || !el || typeof IntersectionObserver === "undefined") return undefined;
        const io = new IntersectionObserver(
            (entries) => setInView(entries[entries.length - 1].isIntersecting),
            { threshold: 0.25 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [canAutoplay]);

    // ---- navigation --------------------------------------------------------
    const goTo = useCallback(
        (i, { instant = false } = {}) => {
            const el = trackRef.current;
            if (!el || !el.clientWidth) return;
            const n = el.childElementCount;
            if (n < 1) return;
            const target = mod(i, n);
            // Show the destination straight away and ignore the scroll events of the
            // trip, so the dots do not walk back through every slide in between.
            headingRef.current = { target, expires: performance.now() + TRAVEL_MS };
            setIndex(target);
            el.scrollTo({ left: target * el.clientWidth, behavior: instant || reducedMotion ? "auto" : "smooth" });
        },
        [reducedMotion],
    );

    // Slide the next/previous way. Wrapping around cuts straight back instead of
    // sweeping the whole track in reverse.
    const step = (dir) => {
        const h = headingRef.current;
        const base = h && performance.now() <= h.expires ? h.target : index;
        const target = mod(base + dir, count);
        goTo(target, { instant: count > 2 && Math.abs(target - base) > 1 });
        bump();
    };

    const jump = (i) => {
        goTo(i);
        bump();
    };

    // ---- autoplay ----------------------------------------------------------
    // One timeout, owned by this effect. Every dependency that can change the
    // outcome (a gate closing, a new index, a manual bump, new photos, a new
    // interval) cleans it up and arms a fresh one, so two timers can never run
    // and a stale `index` can never be used: the closure is rebuilt on each arm.
    useEffect(() => {
        if (!running) return undefined;
        const id = setTimeout(() => {
            const next = mod(index + 1, count);
            goTo(next, { instant: count > 2 && next === 0 });
            setTick((t) => t + 1);
        }, intervalMs);
        return () => clearTimeout(id);
    }, [running, index, count, tick, intervalMs, goTo]);

    // ---- scroll -> index ---------------------------------------------------
    const onScroll = () => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            const el = trackRef.current;
            if (!el || !el.clientWidth) return;
            const pos = el.scrollLeft / el.clientWidth;
            const h = headingRef.current;
            if (h) {
                if (performance.now() > h.expires || Math.abs(pos - h.target) < 0.02) headingRef.current = null;
                else return; // still travelling: keep showing the destination
            }
            setIndex(clamp(Math.round(pos), 0, el.childElementCount - 1));
        });
    };

    useEffect(
        () => () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0; // a re-mount (StrictMode) must not see a stale "pending" id
        },
        [],
    );

    // Warm the cache for the neighbours. Lazy images inside a horizontal scroller
    // are not fetched until they scroll into view, which would flash an empty
    // slide at every autoplay step.
    useEffect(() => {
        if (count < 2) return;
        [1, -1].forEach((d) => {
            const src = list[mod(index + d, count)];
            if (src) new Image().src = src;
        });
    }, [index, list, count]);

    // Keep the active thumbnail in view. Scrolls only the strip (never
    // scrollIntoView, which would also scroll the page under the shopper).
    useEffect(() => {
        const strip = thumbsRef.current;
        const thumb = strip?.children[index];
        if (!strip || !thumb || strip.scrollWidth <= strip.clientWidth) return;
        strip.scrollTo({
            left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2,
            behavior: reducedMotion ? "auto" : "smooth",
        });
    }, [index, count, reducedMotion]);

    // ---- interaction handlers ---------------------------------------------
    const onKeyDown = (e) => {
        if (count < 2 || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "ArrowLeft") step(-1);
        else if (e.key === "ArrowRight") step(1);
        else if (e.key === "Home") jump(0);
        else if (e.key === "End") jump(count - 1);
        else return;
        e.preventDefault();
    };

    // Only keyboard focus pauses the show: a mouse or tap that happens to focus a
    // button must not freeze it until the shopper clicks away.
    const onFocus = (e) => {
        let visible = true; // browsers without :focus-visible: be safe and pause
        try {
            visible = e.target.matches(":focus-visible");
        } catch {
            /* keep the safe default */
        }
        if (visible) setKeyboardFocus(true);
    };
    const onBlur = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocus(false);
    };

    // Touch events (not pointer events): a swipe makes the browser cancel the
    // pointer stream mid-gesture, whereas touchend reliably marks the lift-off.
    const onTouchStart = () => {
        headingRef.current = null;
        setTouching(true);
    };
    const onTouchEnd = (e) => {
        setTouching(e.touches.length > 0);
        bump();
    };

    // Pointer enter/leave rather than mouse events: a tap fires compatibility
    // mouse events whose "hover" would stick until the next tap elsewhere.
    const onPointerEnter = (e) => {
        if (e.pointerType !== "touch") setHovering(true);
    };
    const onPointerLeave = (e) => {
        if (e.pointerType !== "touch") setHovering(false);
    };

    const announce = canAutoplay && !userPaused && !keyboardFocus ? "off" : "polite";

    return (
        <div
            ref={rootRef}
            className="w-full"
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
        >
            <div
                role="region"
                aria-roledescription="carousel"
                aria-label={`${alt || "Product"} photos`}
                tabIndex={count > 1 ? 0 : undefined}
                className="group relative mb-3 aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600 dark:bg-gray-800 dark:ring-white/10 sm:mb-4 sm:rounded-3xl"
            >
                {count > 0 ? (
                    <div
                        key={contentKey}
                        ref={trackRef}
                        tabIndex={-1}
                        onScroll={onScroll}
                        onWheel={() => {
                            headingRef.current = null;
                        }}
                        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {list.map((src, i) => (
                            <div
                                key={`${i}-${src}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${i + 1} of ${count}`}
                                className="h-full w-full shrink-0 basis-full snap-center snap-always"
                            >
                                <img
                                    src={src}
                                    alt={count > 1 ? `${alt}, image ${i + 1}` : alt}
                                    draggable={false}
                                    decoding="async"
                                    loading={i === 0 ? "eager" : "lazy"}
                                    fetchPriority={i === 0 ? "high" : "auto"}
                                    className="h-full w-full select-none object-cover"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                        No Image
                    </div>
                )}

                {children && <div className="pointer-events-none absolute inset-0">{children}</div>}

                {count > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md backdrop-blur-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:flex dark:bg-gray-900/90"
                        >
                            <FiChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md backdrop-blur-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:flex dark:bg-gray-900/90"
                        >
                            <FiChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                        </button>

                        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full bg-black/25 px-1.5 backdrop-blur-sm">
                            {list.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => jump(i)}
                                    aria-label={`Show image ${i + 1} of ${count}`}
                                    aria-current={i === index ? "true" : undefined}
                                    className="flex h-6 items-center justify-center rounded-full px-[5px] focus-visible:outline-2 focus-visible:outline-white"
                                >
                                    <span
                                        className="block rounded-full transition-all duration-300"
                                        style={
                                            i === index
                                                ? { width: "1.25rem", height: "0.4rem", backgroundColor: "var(--theme-accent)" }
                                                : { width: "0.4rem", height: "0.4rem", backgroundColor: "rgba(255,255,255,0.75)" }
                                        }
                                    />
                                </button>
                            ))}
                        </div>

                        <p className="sr-only" aria-live={announce} aria-atomic="true">
                            {`Image ${index + 1} of ${count}`}
                        </p>
                    </>
                )}

                {canAutoplay && (
                    <button
                        type="button"
                        onClick={() => setUserPaused((p) => !p)}
                        aria-label={userPaused ? "Play image slideshow" : "Pause image slideshow"}
                        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md backdrop-blur-sm dark:bg-gray-900/90 dark:text-gray-200 sm:right-4 sm:top-4"
                    >
                        {userPaused ? <FiPlay className="h-4 w-4" /> : <FiPause className="h-4 w-4" />}
                    </button>
                )}
            </div>

            {count > 1 && (
                <div ref={thumbsRef} className="hide-scrollbar relative hidden gap-2 overflow-x-auto pb-1 sm:flex">
                    {list.map((src, i) => (
                        <button
                            key={`${i}-${src}`}
                            type="button"
                            onClick={() => jump(i)}
                            aria-label={`Show image ${i + 1} of ${count}`}
                            aria-current={i === index ? "true" : undefined}
                            className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:h-20 sm:w-20 ${
                                i === index
                                    ? "border-emerald-600 shadow-sm"
                                    : "border-transparent opacity-70 hover:border-gray-300 hover:opacity-100 dark:hover:border-gray-600"
                            }`}
                        >
                            <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
