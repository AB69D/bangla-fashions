"use client";

// Urgency signals for the product page. The "people viewing this now" badge
// that used to live here was a seeded random number, not a real count — there
// is no view-tracking in the backend — so it has been taken out rather than
// shown to shoppers as if it were real. Nothing renders until there is a real
// endpoint to feed it (recent orders per product would be the obvious one).
// The low-stock line on the product page is separate from this and is driven
// by actual stock.
export default function SocialProof() {
    return null;
}
