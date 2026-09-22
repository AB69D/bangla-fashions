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

This project is built on a white-label e-commerce platform by **Md Manzurul Islam**, licensed to Bangla Fashions for its own storefront domain. One token can cover more than one host: [`backend/src/scripts/generate-license.js`](backend/src/scripts/generate-license.js) splits `--domain` on commas and signs a list of domains, which is what you need when the storefront and the backend answer on different hostnames. The backend verifies a signed `LICENSE_KEY` at boot and on every request when `NODE_ENV=production`, and refuses to start without one. The licence for this deployment has been issued for `banglafashions.com`, and `isDomainLicensed()` strips a leading `www.` before comparing, so the apex token covers `www` too. The token itself lives in the server `.env` on the VPS, never in this repository.

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
- **Other:** JWT auth, Zod validation, Pino logging, Docker + Caddy. Uploaded images are stored on the server's own disk (see Deployment), not on a third-party media host

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

In development (`NODE_ENV=development`) no `LICENSE_KEY` is needed. Uploaded images are written to `backend/uploads/` locally — `UPLOAD_DIR` defaults to `./uploads` and is set to `/app/uploads` in the container.

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

Everything runs as **one Docker Compose stack** on the client's Contabo VPS (Ubuntu 24.04, `94.136.184.197`), cloned to `/opt/bangla-fashions`. Only Caddy binds host ports; every other service talks over the internal compose network and is not reachable from the internet.

| Service | What it is | Exposure |
| --- | --- | --- |
| `caddy` | Reverse proxy and TLS terminator, provisions Let's Encrypt certificates automatically | Host ports 80 / 443 |
| `frontend` | Next.js storefront + admin/POS, built in `standalone` mode | Internal, behind Caddy |
| `backend` | Express API, also serves the uploaded images | Internal, behind Caddy |
| `mongo` | Single-node MongoDB 7, authentication on | Internal only |
| `mongo-backup` | Nightly dump of the database and the uploads volume, 7-day retention | Internal only |

The site answers on **banglafashions.com**, and `www.banglafashions.com` redirects to the apex. Caddy sends `/api/*` and `/uploads/*` to the backend and everything else to the frontend.

```bash
cp .env.docker.example .env   # fill in real values — never commit this file
docker compose up -d --build
```

### Product images are stored on the VPS disk

There is no third-party media host. The backend writes uploads under `UPLOAD_DIR` (`/app/uploads` in the container, `./uploads` for local development) in dated folders — `/app/uploads/<yyyy>/<mm>/<uuid>.webp` — and stores the **relative** URL `/uploads/<yyyy>/<mm>/<uuid>.webp` in MongoDB. No hostname is baked into the database, so the same rows keep working if the domain changes. The backend serves that directory at `/uploads/*`, Caddy proxies it, and [`frontend/next.config.mjs`](frontend/next.config.mjs) rewrites `/uploads/:path*` to the backend as well, because `next/image`'s optimizer fetches a relative source against the Next server's own origin rather than through Caddy.

That directory is the named Docker volume `uploads-data`, mounted at `/app/uploads`.

> ⚠️ **`uploads-data` holds every product and review image on the site.** `docker compose up -d --build` and `docker compose down` leave it alone, but `docker compose down -v` or `docker volume rm` deletes it and the images are gone — the product rows then point at files that no longer exist. The nightly backup job covers this volume as well as the database, so a restore needs both.

### Deploy flow

Push to `main` → GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) SSHes into the VPS → `git reset --hard origin/main` in `/opt/bangla-fashions` → `docker compose up -d --build` → a health gate polls the stack until it answers. If the health check fails, the workflow rolls back to the previous commit, rebuilds it and leaves the last known-good stack serving, so a bad push does not take the shop offline.

Four repository secrets drive it, set under **Settings → Secrets and variables → Actions** on this repository. Secrets do not travel with the code, and nothing deploys until the first two exist:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_SSH_PRIVATE_KEY_B64` | The deploy key's private half, base64-encoded — encoding survives the newline mangling a pasted PEM suffers |
| `VPS_USER` | SSH user the deploy runs as; falls back to `root` when unset |
| `VPS_SSH_PORT` | SSH port; falls back to `22` when unset |

**Production boot requires a `LICENSE_KEY` issued for the storefront's public domain** — the domain customers actually visit, not the backend's own host. Without it the API refuses to start; with a key for the wrong domain every request returns `503 domain not licensed`. The token goes in the server `.env` on the VPS and nowhere in this repository.

## Before going live

- [ ] Point DNS at the VPS: `A` records for `@` and `www` on `banglafashions.com` → `94.136.184.197`. Caddy issues the certificates on the first request once DNS resolves
- [ ] Add the Brevo API key and set `MAIL_FROM_ADDRESS` to a sender on `banglafashions.com` that is verified in Brevo (SPF + DKIM). Order and account emails do not send until both are done — Brevo rejects a gmail.com From address
- [ ] Enter the SSLCommerz store ID and password in the admin **Settings → Payments** tab and switch the gateway on. Until then checkout offers cash on delivery only
- [ ] Seed or upload the real apparel catalogue with sizes, stock and prices
- [ ] Capture screenshots for this README once the real catalogue is loaded. The platform's old demo-store images have been removed, so the README currently shows none

## Notes

- `.env` files are git-ignored. Never commit secrets.
- `node_modules/`, `.next/`, `.vercel/`, and build artifacts are git-ignored.
