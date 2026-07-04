# Yumme Momos — Website

A fast, static, mobile-first marketing site for **Yumme Momos Manufacturer**
(Jamshedpur) — a B2B / franchise frozen-food maker. Rebuild of the old Google
Sites site: keeps every piece of real content, presents it professionally.

Built with **Astro 5** + **Tailwind CSS 4**. Ships almost no JS. Static output.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/  (deploy this)
npm run preview
```

## Structure

```
src/
├─ layouts/BaseLayout.astro     # <head>, SEO/OG, JSON-LD, header/footer/action-bar, reveal JS
├─ components/                   # Header, Footer, MobileActionBar, ProductCard, VegBadge,
│                                # AppDownload, StoreBadges, LiteYouTube, ContactStrip, Icon, ContactStrip
├─ data/site.ts                  # ← ALL editable content (contacts, products, awards, FAQ, nav)
├─ styles/global.css             # design tokens (colour/type/spacing), buttons, animations
└─ pages/                        # index, menu, about, franchise, achievements, contact, legal, 404
public/                          # favicon, og-image, robots.txt, images/
scripts/                         # Playwright before/after screenshot scripts
screenshots/                     # before/ after/ comparison.html
```

## Design tokens

- **Palette:** cream `#FBF7F0` base · chili red `#E23A2E` (CTA) · herb green `#2F7D48` (veg) · golden fry `#F2A93B` · warm ink `#231A16`.
- **Type:** Fraunces (display) + Plus Jakarta Sans (body), `display=swap`, preconnected.
- Veg / non-veg dots follow the Indian FSSAI convention.

## Key features

- Sticky condensing header + full-screen mobile menu (focus-trapped).
- Sticky bottom action bar on mobile: Call · WhatsApp · Get App.
- Per-product WhatsApp order deep-links; franchise enquiry → pre-filled WhatsApp (no backend).
- Lazy `lite-youtube` video facades; live Google Map embed.
- Full SEO: titles, meta, OG/Twitter, `FoodEstablishment` JSON-LD, sitemap, robots, indexable.
- Lighthouse (desktop): **97 / 96 / 100 / 100** (Perf / A11y / BP / SEO).

## Editing

Change copy, contacts, products, awards and FAQ in **`src/data/site.ts`**, then
rebuild. See **[HANDOFF.md](HANDOFF.md)** for the full list of client-supplied
items (photos, prices, GST/FSSAI, Instagram URL, etc.).
