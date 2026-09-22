# Bangla Fashions

**A Fashion House of Deshi Brand**

Bangla Fashions is a traditional clothing retailer and wholesaler in Sylhet, selling t-shirts, polo shirts, fotua, panjabi, shirts, pants and women's & kids' wear. This repository holds the full storefront system: a Next.js shopping site for customers, an Express + MongoDB API, and a built-in Admin panel and POS for running the catalogue, orders, stock and in-store sales. Prices are in BDT (৳). Delivery charges and the free-delivery threshold are admin settings, not hardcoded values.

## Business details

Bangla Fashions has been trading since 1 September 2007, nineteen years run on honesty. It is a traditional clothing brand based in Sylhet and carries the city's heritage. The shop sells both retail and wholesale, and the range covers a customer head to toe: panjabi, fotua, saree, three-piece and kurti, alongside t-shirts, polo shirts, formal and casual shirts, pants, chinos, jeans and kids' wear. The positioning is value for money.

Bangla Fashions is a retailer and wholesaler, not a manufacturer. Nothing in the storefront copy should claim production, factories, fabric sourcing or stitching.

Three branches, all real showrooms customers can walk into:

| Branch | Address |
| --- | --- |
| Main Branch | Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet |
| Shibganj Branch | Opposite of Pubali Bank, Shibganj, Sylhet |
| Tilagor Branch | West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet |

- **Founder & CEO:** Fakrul Alam Chowdhury Zahid
- **Email:** banglafashion2007@gmail.com
- **Phone:** +880 1911-700793 · +880 1601-383683 (Hridoy Singh, Manager-in-Charge) · +880 1643-480565 (Md. Toha Uddin Piash, Business Developer)

These are the values to enter under the admin **Settings** tab. The storefront reads its site name, contact details and social links from there rather than from the code, so changing them later is a settings edit and not a deploy.

## Brand

The source logo and the business card these details come from are in [`docs/brand/`](docs/brand/). The two brand colours are sampled from the logo file itself, so use these rather than eyeballing a green:

| | Hex | Used for |
| --- | --- | --- |
| Brand green | `#128A44` | `theme.primary`, navbar and footer gradients |
| Brand red | `#EC1F28` | `theme.accent`, price and sale highlights |

- **Tagline:** A Fashion House of Deshi Brand. This is the tagline from the logo and card; do not substitute a written-from-scratch one.
- The full default theme (gradient stops, home wash, navbar text) lives in three places that must stay in step: the `theme` sub-schema in [`backend/src/models/siteSettings.model.js`](backend/src/models/siteSettings.model.js), `THEME_DEFAULTS` in [`frontend/src/app/layout.js`](frontend/src/app/layout.js), and `THEME_DEFAULTS` in [`frontend/src/app/admin/settings/page.jsx`](frontend/src/app/admin/settings/page.jsx). The admin copy also drives "Reset to brand defaults" and sanitises every save, so a mismatch there quietly rewrites the live storefront.
- Copy discipline: delivery timelines and charges, return windows, order minimums, fabric details, opening hours and social handles have not been supplied by the owner. Describe the mechanism or point at the Contact page instead of inventing a number.


## Licensing

This project is built on a white-label e-commerce platform by **Md Manzurul Islam**, licensed to Bangla Fashions for its own storefront domain. One token can cover more than one host: [`backend/src/scripts/generate-license.js`](backend/src/scripts/generate-license.js) splits `--domain` on commas and signs a list of domains, which is what you need when the storefront and the backend answer on different hostnames. The backend verifies a signed `LICENSE_KEY` at boot and on every request when `NODE_ENV=production`, and refuses to start without one. The key has not been issued yet; issuing it for the live domain is on the go-live checklist below. See [docs/LICENSING.md](docs/LICENSING.md).

## Features

- Product catalogue with categories, per-size variants (each with its own price, discount, stock, SKU and barcode)
- Cart, guest checkout, and order tracking by phone or order ID
- Payments: cash on delivery plus online payment via SSLCommerz
- Customer accounts: login/register, saved addresses, order history, wishlist
- Product reviews, related products, site search, and coupon codes
- Admin dashboard: products, categories, orders, customers, pages and site settings
- POS for in-store sales, with seller shifts, receipt printing and label printing
- Stock ledger and profit reporting
- Fake-order / fraud risk scoring with a customer blocklist
- Steadfast courier integration for delivery bookings and courier success ratio
- WhatsApp notifications on new orders and order status changes
- Transactional email on order confirmation and status changes
- Landing-page builder for campaign and single-product pages
- PWA support, SEO metadata, sitemap and ISR cache invalidation on content changes

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend:** Node.js 20+, Express, MongoDB/Mongoose
- **Other:** Cloudinary (media), JWT auth, Zod validation, Pino logging, Docker + Caddy

## Structure

- [`frontend/`](frontend/) — Next.js storefront + admin/POS panel. `frontend/public/` holds the client's real logo (`logo.png`, `logo-transparent.png`) and the PWA icon set generated from it.
- [`backend/`](backend/) — Node.js / Express API server with MongoDB.
- [`docs/brand/`](docs/brand/) — the source logo and the business card the brand details and colours were taken from.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env   # fill in real values
npm install
npm start
```

In development (`NODE_ENV=development`) no `LICENSE_KEY` is needed.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` with the API and site URLs the browser should use:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Deployment (Contabo VPS)

The `docker-compose.yml` stack runs MongoDB, the API, a nightly Mongo backup job, and Caddy as the reverse proxy on the client's Contabo VPS:

```bash
cp .env.docker.example .env   # fill in real values — never commit this file
docker compose up -d --build
```

Caddy currently serves HTTP on port 80 by IP; once the domain points at the VPS, switch the `:80` block in [`Caddyfile`](Caddyfile) to the real hostname and Caddy provisions Let's Encrypt HTTPS automatically.

Two workflows handle deploys, and both live in the repository-root `.github/workflows/` because that is the only directory GitHub Actions reads:

- [`.github/workflows/deploy-backend.yml`](.github/workflows/deploy-backend.yml) — pushes to `main` touching `backend/`, `docker-compose.yml` or `Caddyfile` redeploy the API. It SSHes in and pulls into `/opt/bangla-fashions`, so the repo has to be cloned at exactly that path on the VPS.
- [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) — pushes to `main` touching `frontend/` redeploy the storefront to Vercel, with `NEXT_PUBLIC_BACKEND_URL` pointing at this server. This one used to sit in `frontend/.github/workflows/`, left over from when the storefront was a separate repository. GitHub never looked there, so it never ran.

Both workflows need their secrets set on this repository. Secrets do not travel with the code.

**Production boot requires a `LICENSE_KEY` issued for the storefront's public domain** — the domain customers actually visit, not the backend's own host. Without it the API refuses to start; with a key for the wrong domain every request returns `503 domain not licensed`.

## Before going live

- [ ] Set `FRONTEND_URL` / `PUBLIC_BACKEND_URL` (`.env`) and `NEXT_PUBLIC_SITE_URL` (frontend) to the real domain, replacing the placeholder server IP. Canonical and openGraph URLs across the site derive from these, so a stale value there shows up in every share preview and in Google
- [ ] Verify the real domain in Brevo (SPF + DKIM) and set `MAIL_FROM_ADDRESS` to a sender on it, e.g. `noreply@<the domain>`. Brevo rejects a gmail.com From address, so order emails will not send until this is done
- [ ] Set `ADMIN_EMAILS` to the real admin accounts — this is what gates admin login
- [ ] Issue the `LICENSE_KEY` for the live domain and put it in the server `.env`
- [ ] Set the GitHub Actions secrets on this repository: `VPS_HOST`, `VPS_USER`, `VPS_SSH_PORT` and `VPS_SSH_PRIVATE_KEY` for the backend deploy, `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for the frontend. Nothing deploys until these exist
- [ ] Enter the site name, branch addresses, phone numbers and social links in the admin **Settings**, **Header** and **Layout** tabs. The schema defaults already carry the real tagline, the three branch addresses and the three phone numbers, so this is a confirmation pass rather than data entry
- [ ] Seed or upload the real apparel catalogue with sizes, stock and prices
- [ ] Configure Cloudinary, SSLCommerz, Steadfast and WhatsApp credentials
- [ ] Capture screenshots for this README once the real catalogue is loaded. The platform's old demo-store images have been removed, so the README currently shows none

## Notes

- `.env` files are git-ignored. Never commit secrets.
- `node_modules/`, `.next/`, `.vercel/`, and build artifacts are git-ignored.
