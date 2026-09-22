# Bangla Fashions — Storefront

The customer-facing storefront for **Bangla Fashions**, a Bangladeshi clothing
brand: t-shirts, polo shirts, fotua, panjabi, formal & casual shirts, pants and
women's & kids' wear, delivered across Bangladesh.

This app also hosts the admin panel (`/admin`) and the POS terminal (`/pos`).
Product, order and settings data all come from the backend API in
[`../backend`](../backend).

## Stack

- **Next.js 16** (App Router, server components)
- **React 19**
- **Tailwind CSS 4** (CSS-first config, class-based dark mode)
- `react-icons` for iconography

## Requirements

- Node.js 20+
- A running backend API (see [`../backend`](../backend))

## Environment

Create `.env.local` in this directory:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080   # the backend API origin
NEXT_PUBLIC_SITE_URL=http://localhost:3000      # public origin, used for SEO/sitemap
```

`NEXT_PUBLIC_BACKEND_URL` is required — without it the storefront falls back to
`http://localhost:8080` and shows empty catalogue data if nothing is listening.

## Running

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```

## Branding & theme

The site name, logo, tagline, contact details and the full colour theme are
edited from **Admin → Appearance / Site Settings** and served from the backend.

The brand palette hardcoded in `src/app/layout.js` (`THEME_DEFAULTS`
— brand green `#128a44`, brand red `#ec1f28`, both sampled from the client logo
in `docs/brand/logo-source.png`) and the site name fallbacks in
`src/app/layout.js` / `src/lib/seo.js` are **fallbacks only**: they apply until
an admin saves their own values. Keep `THEME_DEFAULTS` in sync with the theme defaults in
`backend/src/models/siteSettings.model.js` AND in `src/app/admin/settings/page.jsx`
(that third copy drives `sanitizeTheme()` on every save and "Reset to brand
defaults", so a stale value there silently rewrites the live storefront).
