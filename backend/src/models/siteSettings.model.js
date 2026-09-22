import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema(
    {
        platform: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        icon: { type: String, default: '' },
    },
    { _id: false },
);

const siteSettingsSchema = new mongoose.Schema(
    {
        // Singleton — there should only ever be one document.
        key: { type: String, default: 'global', unique: true, immutable: true },

        siteName: { type: String, default: 'Bangla Fashions', trim: true },
        tagline: { type: String, default: 'A Fashion House of Deshi Brand', trim: true },
        description: {
            type: String,
            default:
                "Bangla Fashions is a Bangladeshi clothing brand — t-shirts, polo shirts, fotua, panjabi, shirts, pants and women's & kids' wear delivered across Bangladesh.",
            trim: true,
        },

        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },

        contactEmail: { type: String, default: 'banglafashion2007@gmail.com', trim: true, lowercase: true },
        contactPhone: { type: String, default: '+880 1911-700793, +880 1601-383683, +880 1643-480565', trim: true },
        contactAddress: {
            type: String,
            default:
                'Main Branch: Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet. Shibganj Branch: Opposite of Pubali Bank, Shibganj, Sylhet. Tilagor Branch: West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet.',
            trim: true,
        },

        socialLinks: { type: [socialLinkSchema], default: [] },

        currencyCode: { type: String, default: 'BDT', uppercase: true },
        currencySymbol: { type: String, default: '৳' },

        seo: {
            defaultTitle: { type: String, default: '' },
            defaultDescription: { type: String, default: '' },
            defaultKeywords: { type: String, default: '' },
            ogImage: { type: String, default: '' },
        },

        // ── Advanced feature master switches (toggled from the admin panel) ──
        // Every feature added in Phase 1/2 reads its flag here. Defaults keep
        // existing behaviour intact so nothing changes until an admin opts in.
        features: {
            barcode: { type: Boolean, default: true },
            coupons: { type: Boolean, default: true },
            wishlist: { type: Boolean, default: true },
            receiptPrinting: { type: Boolean, default: true },
            labelPrinting: { type: Boolean, default: true },
            posShift: { type: Boolean, default: true },
            profitReporting: { type: Boolean, default: true },
            stockLedger: { type: Boolean, default: true },
            pwa: { type: Boolean, default: true },
            whatsapp: { type: Boolean, default: false },
            analytics: { type: Boolean, default: true },
            productReviews: { type: Boolean, default: true },
            fakeOrderDetection: { type: Boolean, default: true },
        },

        // Tunable thresholds for the in-house fake-order risk scorer
        // (lib/fraudScore.js). Kept out of `features` since these are numeric
        // knobs, not on/off switches; sane defaults so the feature works
        // out of the box without an admin ever touching this.
        fraudRules: {
            velocityWindowMinutes: { type: Number, default: 120, min: 1 },
            velocityMaxOrders: { type: Number, default: 3, min: 1 },
            minHistoryForReturnRate: { type: Number, default: 3, min: 1 },
            returnRateThreshold: { type: Number, default: 0.5, min: 0, max: 1 },
            // Courier-ratio thresholds (lib/courierRatio.js evaluateCourierRatio).
            courierMinOrdersForRatio: { type: Number, default: 3, min: 1 },
            courierSuccessRateThreshold: { type: Number, default: 60, min: 0, max: 100 },
        },

        // POS receipt + storefront invoice customization.
        receipt: {
            header: { type: String, default: '' },        // extra line under the store name
            footerNote: { type: String, default: 'Thank you for shopping with us!' },
            showLogo: { type: Boolean, default: true },
            paperWidth: { type: String, enum: ['58', '80'], default: '80' }, // mm
            showTax: { type: Boolean, default: false },
            returnPolicy: { type: String, default: '' },
        },

        // Barcode / label configuration.
        barcode: {
            symbology: { type: String, enum: ['CODE128', 'EAN13'], default: 'CODE128' },
            prefix: { type: String, default: '' },           // optional SKU/barcode prefix
            labelWidthMm: { type: Number, default: 40 },
            labelHeightMm: { type: Number, default: 30 },
            showPrice: { type: Boolean, default: true },
            showName: { type: Boolean, default: true },
        },

        // POS behaviour.
        pos: {
            lowStockThreshold: { type: Number, default: 5 },
            taxPercent: { type: Number, default: 0 },
            taxLabel: { type: String, default: 'VAT' },
            requireShift: { type: Boolean, default: false },  // force open shift before selling
            allowNegativeStock: { type: Boolean, default: false },
            // Default % discount pre-filled on a wholesale sale (cashier can edit
            // or clear it per sale). 0 disables the pre-fill.
            wholesaleDiscountPercent: { type: Number, default: 0 },
        },

        // Web analytics (injected into the storefront <head> when set).
        analytics: {
            ga4Id: { type: String, default: '' },     // G-XXXXXXXXXX
            metaPixelId: { type: String, default: '' },
            gtmId: { type: String, default: '' },     // GTM-XXXXXXX
            // Meta Conversions API (server-side tracking). The access token is a
            // SECRET — the public site-settings endpoint strips it before
            // responding so it never reaches the browser. The optional test
            // event code routes events to Meta's "Test Events" tab during setup.
            metaCapiToken: { type: String, default: '' },
            metaTestEventCode: { type: String, default: '' },
        },

        // WhatsApp order / status notifications.
        whatsapp: {
            businessNumber: { type: String, default: '8801911700793' }, // E.164 without '+', e.g. 8801XXXXXXXXX
            notifyOnOrder: { type: Boolean, default: true },
            notifyOnStatusChange: { type: Boolean, default: true },
            // {{name}} {{orderId}} {{total}} {{status}} are substituted at send time.
            orderTemplate: {
                type: String,
                default: 'Hi {{name}}, thanks for your order {{orderId}} ({{total}}). We will confirm shortly.',
            },
            statusTemplate: {
                type: String,
                default: 'Hi {{name}}, your order {{orderId}} is now {{status}}.',
            },
        },

        // ── Storefront appearance / theme ──────────────────────────────────
        // Admin-selectable colours applied across the storefront via CSS custom
        // properties injected server-side in the root layout. Navbar and footer
        // are ALWAYS rendered as gradients (three stops each); the home page gets
        // a soft background wash. `primary`/`accent` drive buttons, links and the
        // red highlights. Defaults are the green (#128A44) and red (#EC1F28)
        // sampled from the Bangla Fashions logo, with the gradient stops darkened
        // either side of the green so white navbar/footer text stays legible.
        // Nothing changes visually until an admin customises it.
        theme: {
            // Navbar gradient (left → right) + a legible text/icon colour on top.
            navbarFrom: { type: String, default: '#0E6E36' },
            navbarVia: { type: String, default: '#128A44' },
            navbarTo: { type: String, default: '#0A5228' },
            navbarText: { type: String, default: '#FFFFFF' },
            // Footer gradient (top → bottom).
            footerFrom: { type: String, default: '#0E6E36' },
            footerVia: { type: String, default: '#0A5228' },
            footerTo: { type: String, default: '#06381B' },
            // Home / storefront background wash (top tint → base).
            homeFrom: { type: String, default: '#EAF7EF' },
            homeTo: { type: String, default: '#FFFFFF' },
            // Brand accents reused across the UI.
            primary: { type: String, default: '#128A44' },
            accent: { type: String, default: '#EC1F28' },
        },

        // ── Online payments ────────────────────────────────────────────────
        // SSLCommerz gateway (Bangladesh aggregator: cards + bKash/Nagad/Rocket
        // and bank in one integration). Disabled until an admin enters store
        // credentials and flips `enabled`. `storeId` and `storePassword` are
        // SECRETS — the public site-settings endpoint strips both so neither ever
        // reaches the browser; only `enabled`/`provider`/`sandbox` are exposed so
        // the storefront knows whether to offer the "Pay online" option.
        payment: {
            provider: { type: String, enum: ['sslcommerz'], default: 'sslcommerz' },
            enabled: { type: Boolean, default: false },
            sandbox: { type: Boolean, default: true }, // sandbox creds until live
            storeId: { type: String, default: '' },
            storePassword: { type: String, default: '' },
        },

        // Storefront delivery/shipping rules. `freeDeliveryThreshold` waives the
        // delivery charge on checkout.route.js when the cart subtotal meets or
        // exceeds it — 0 (the default) disables the waiver entirely, so an
        // existing store's delivery pricing is unchanged until an admin opts in.
        shipping: {
            freeDeliveryThreshold: { type: Number, default: 0, min: 0 },
        },

        maintenanceMode: { type: Boolean, default: false },

        // ── Third-party integrations ────────────────────────────────────────
        // Fraud BD (fraudbd.com) courier delivery-ratio lookup, used by the
        // checkout fraud scorer (lib/courierRatio.js). Stored here (not an env
        // var) so an admin can turn it on/off and rotate the key from the panel
        // without a redeploy. `apiKey` is empty by default -> the feature is off
        // (checkCourierRatio() no-ops) until an admin enters a key. `apiKey` is a
        // SECRET — the public site-settings endpoint strips it, same treatment
        // as payment.storeId/storePassword above.
        integrations: {
            fraudbd: {
                apiKey: { type: String, default: '' },
                mode: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
            },
            // Steadfast Courier (portal.steadfast.com.bd) — booking + status sync
            // (lib/couriers/steadfast.js). Off by default, same "empty key = off"
            // convention as fraudbd. webhookToken is a secret the admin picks and
            // pastes into Steadfast's own dashboard (Settings > Webhook) so we can
            // verify incoming status-update calls are really from Steadfast.
            steadfast: {
                apiKey: { type: String, default: '' },
                secretKey: { type: String, default: '' },
                webhookToken: { type: String, default: '' },
            },
        },
    },
    { timestamps: true },
);

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
