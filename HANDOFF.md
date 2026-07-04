# Yumme Momos — Handoff & Client TODO list

The site is a fast, static, mobile-first Astro build. Everything the client can
edit (phones, address, products, awards, copy) lives in one file:
[`src/data/site.ts`](src/data/site.ts). No CMS, no backend.

## ✅ What's done

- 7 pages: **Home, Menu, About, Franchise (Become a Partner), Achievements, Contact, Legal** — plus a styled 404.
- All real content from the old Google Sites migrated (company blurb, vision, mission, 3 pillars, product list, awards, app links, contact, socials, terms/shipping policy).
- Global: sticky header (condenses on scroll), full-screen mobile menu with focus trap, sticky bottom action bar (Call · WhatsApp · Get App), footer with app badges + socials.
- Conversion: "Order on WhatsApp" everywhere, per-product WhatsApp deep-links with pre-filled messages, franchise enquiry form that opens a pre-filled WhatsApp message (no backend).
- Menu veg/non-veg filter toggle; FSSAI veg/non-veg indicator dots on cards.
- Lazy `lite-youtube` facade for all videos (nothing loads until tap).
- Awards timeline + video gallery on Achievements.
- Live Google Map embed on Contact.
- SEO: per-page titles + descriptions, canonical, Open Graph + Twitter cards, `FoodEstablishment` JSON-LD, `sitemap-index.xml`, `robots.txt`, indexable (fixed the old `noindex`).
- Accessibility: semantic landmarks, skip link, focus-visible rings, `prefers-reduced-motion`, labelled forms.
- **Lighthouse (desktop): Performance 97 · Accessibility 96 · Best Practices 100 · SEO 100.**

## ⚠️ TODO — client must provide

These are marked `TODO` in the code so nothing was fabricated.

### High priority (facts we must not invent)
- [ ] **GST number** and **FSSAI licence number** → `src/pages/legal.astro` (Legal section).
- [ ] **Banking / payment details** (if any should be public — e.g. UPI ID for B2B) → `src/pages/legal.astro` (Banking section). *The old site's "Banking" page was empty.*
- [ ] **Product prices / price list** (optional) → currently we drive to WhatsApp/app. `src/data/site.ts` + `src/pages/menu.astro`.
- [ ] **Delivery coverage area** → FAQ in `src/data/site.ts` (`faqs`).
- [ ] **B2B minimum order quantity (MOQ)** → FAQ in `src/data/site.ts`.
- [ ] **Franchise investment & terms** → FAQ in `src/data/site.ts`.
- [ ] **Instagram handle URL** → `site.social.instagram` in `src/data/site.ts` (footer/contact auto-show it once set).
- [ ] **Exact map coordinates** (`site.geo`) — currently approximate for Baridih, Jamshedpur. Confirm for accurate JSON-LD/map.

### Imagery (all placeholders now)
- [ ] **Hi-res hero momo photo** (Home hero) — replace the placeholder slot.
- [ ] **Product photos** (one per item) — `src/components/ProductCard.astro` has an image slot; add to `public/images/` and wire `srcset`/WebP.
- [ ] **App screenshot** for the device mockup → `src/components/AppDownload.astro`.
- [ ] **Team / kitchen photo** → `src/pages/about.astro`.
- [ ] **Share/OG image** — a placeholder `public/og-image.svg` ships now. Export a **1200×630 PNG** for best social-preview support and set `ogImage` default in `src/layouts/BaseLayout.astro`.
- [ ] **Do NOT hotlink** the old `lh3.googleusercontent.com` images — download, optimise (WebP/AVIF), drop into `public/images/`.

### Optional
- [ ] The old site also showed **Veg Spring Roll**, **Veg Kurkure Momos**, **Chicken Kurkure Momos**, **Mushroom Momo**, **Mutton Momo** and a "Reeshys Frozen Hub" reseller line. The brief's product list is used as the source of truth; add any missing SKUs in `src/data/site.ts` (`products`) if the client sells them.
- [ ] Swap the franchise form from WhatsApp deep-link to **Formspree/Netlify Forms** if email submissions are preferred (`src/pages/franchise.astro`).
- [ ] Confirm any **stats** (clients served, outlets) before using them — the "6+ years" figure is derived from Est. 2019 and is safe.

## 🚀 Run / build / deploy

```bash
npm install
npm run dev        # local dev at http://localhost:4321
npm run build      # static output → dist/
npm run preview    # preview the production build
```

Deploy `dist/` to any static host (Netlify / Vercel / Cloudflare Pages). It's a
pure static build — no server needed. Point the host at `npm run build` with
output dir `dist`.

## 📸 Screenshots

```bash
npm run screenshots:before   # captures the live Google Sites (parity baseline)
npm run dev                  # (in another shell) then:
npm run screenshots:after    # captures the new build at 390 / 768 / 1440px
```

Open `screenshots/comparison.html` for a side-by-side before/after.

## ✏️ Editing content

Almost everything is in **`src/data/site.ts`** — phones, address, hours, email,
WhatsApp links, app links, socials, product list, awards, FAQ, nav. Change copy
there and rebuild; you rarely need to touch component markup.
