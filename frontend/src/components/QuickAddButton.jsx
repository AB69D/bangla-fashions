"use client";
import { useState } from "react";
import { FiPlus, FiCheck, FiLoader } from "react-icons/fi";
import { addToCart } from "@/utils/cart.js";
import { trackAddToCart } from "@/lib/tracking";
import { useQuickView } from "@/context/QuickViewContext.jsx";
import { hasColors, colorsSellable, variantInStock } from "@/lib/productVariants";

// A single source of truth for "add the default variant to the cart from a
// product card" — used by every grid (New Arrivals, Top Selling, All
// Products) so the stock check, error handling and success feedback only
// need to be right in one place. A product sold in colours has no "default"
// to add, so there the button opens the quick view to pick a colour instead.
// Always rendered (never hover-gated): a hover-only control is invisible and
// unusable on touch devices, which is most of this storefront's traffic.
export default function QuickAddButton({ product, className = "" }) {
    const [status, setStatus] = useState("idle"); // idle | adding | added | error
    const { open: openQuickView } = useQuickView();
    const weight = product.weights?.[0];
    const colored = hasColors(product);
    const inStock = colored
        ? (product.weights || []).some(variantInStock) && colorsSellable(product)
        : variantInStock(weight);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!inStock || status === "adding") return;
        if (colored) {
            openQuickView(product);
            return;
        }
        setStatus("adding");
        try {
            const image = product.cover_image || weight.images?.[0] || "";
            const res = await addToCart(product._id, 1, weight.weight, 0, weight.price, weight.discountPercent || 0, product.firstName, image);
            if (!res?.success) throw new Error(res?.message || "Failed to add to cart");
            const unit = (weight.price || 0) * (1 - (weight.discountPercent || 0) / 100);
            trackAddToCart({ productId: product._id, name: product.firstName, price: unit, quantity: 1 });
            window.dispatchEvent(new Event("cart-updated"));
            setStatus("added");
            setTimeout(() => setStatus("idle"), 1600);
        } catch (err) {
            console.error("Quick add to cart failed", err);
            setStatus("error");
            setTimeout(() => setStatus("idle"), 1600);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={!inStock || status === "adding"}
            title={!inStock ? "Out of stock" : colored ? "Choose a color" : "Add to cart"}
            aria-label={!inStock ? "Out of stock" : colored ? `Choose a color for ${product.firstName}` : `Add ${product.firstName} to cart`}
            className={`flex items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                status === "added" ? "bg-emerald-600" : status === "error" ? "bg-red-500" : "bg-emerald-600 hover:bg-emerald-700"
            } ${className}`}
        >
            {status === "adding" ? (
                <FiLoader className="w-4 h-4 animate-spin" />
            ) : status === "added" ? (
                <FiCheck className="w-4 h-4" />
            ) : (
                <FiPlus className="w-4 h-4" />
            )}
        </button>
    );
}
