# Yumme Momos — Website Redesign Brief (for Claude Code)

> Paste this file into Claude Code (or open the repo and reference it) and work through it top to bottom. It is written as an executable brief: follow the phases in order, use the listed skills, and take screenshots at the checkpoints.

---

## 0. Context

**Business:** Yumme Momos Manufacturer — a B2B / franchise frozen-food maker (momos + French fries) based in Jamshedpur, Jharkhand, India. Operating since 2019.

**Current site:** https://www.yummemomos.com — built on **Google Sites**. It contains good raw content but suffers from a generic template look, raw unstyled URLs pasted as text, no real menu/product layout, inconsistent typography, weak imagery treatment, and poor mobile ergonomics.

**Goal:** Rebuild it as a fast, modern, mobile-first, multi-page marketing site that keeps every piece of real content but presents it professionally. This is a lead-gen and credibility site — the primary actions are **WhatsApp/call for orders**, **download the app**, and **franchise enquiry**.

**Audience:** local & regional retailers, franchise/stockist prospects, and end customers ordering via the app.

---

## 1. Tech stack (recommended)

- **Framework:** Astro (content-driven, ships almost no JS, ideal for a marketing site) **or** Next.js (static export) if you prefer React. Astro is the default recommendation.
- **Styling:** Tailwind CSS.
- **Components/interactivity:** minimal vanilla JS or small React/Astro islands (mobile nav, image lightbox, form).
- **Images:** use `astro:assets` / responsive `<img>` with `srcset`, WebP/AVIF, lazy-loading.
- **Deploy target:** static host (Netlify / Vercel / Cloudflare Pages). Keep it a static build.
- **No CMS required** — content volume is small; keep copy in Markdown/`.astro` data files so it's easy to edit.

If the user already has a preferred stack, adapt — but keep it static, fast, and mobile-first.

---

## 2. Use these skills

Before writing UI code, **read and apply the `frontend-design` skill** (design tokens, typography, spacing, avoiding templated defaults). This is mandatory — it prevents a generic "AI website" look.

Other skills to invoke when relevant:
- **`frontend-design`** — for all visual/design decisions and component styling.
- If you generate any downloadable **PDF** menu or franchise deck → use the **`pdf`** skill.
- If you produce a **spreadsheet** (e.g. a price/product matrix for the client) → **`xlsx`** skill.
- Use Playwright (below) for screenshots.

---

## 3. Screenshots (required checkpoints)

Install Playwright and use it at three checkpoints. Save all images into `/screenshots`.

```bash
npm i -D playwright
npx playwright install chromium
```

**Checkpoint A — BEFORE (capture the current live site for reference):**
Write a small script that visits each live page and screenshots it at desktop (1440px) and mobile (390px) widths:

Pages to capture:
- https://www.yummemomos.com/home
- https://www.yummemomos.com/about-us
- https://www.yummemomos.com/menu
- https://www.yummemomos.com/reach-us
- https://www.yummemomos.com/stock-franchise
- https://www.yummemomos.com/achievement
- https://www.yummemomos.com/banking
- https://www.yummemomos.com/legal
- https://www.yummemomos.com/terms-condition

Save as `screenshots/before/<page>-<desktop|mobile>.png`. These are your baseline for content parity — make sure nothing gets lost in the rebuild.

**Checkpoint B — AFTER (each new page, once built):** screenshot the local dev build at 390px, 768px, and 1440px. Save as `screenshots/after/<page>-<width>.png`.

**Checkpoint C — Final:** a full-page scroll screenshot of every new page at mobile + desktop for a before/after comparison. Optionally assemble a simple `screenshots/comparison.html` that lays before/after side by side.

Example Playwright snippet:

```js
import { chromium } from 'playwright';
const pages = [['home','/home'],['about','/about-us'],['menu','/menu'],
  ['reach','/reach-us'],['franchise','/stock-franchise'],
  ['achievement','/achievement'],['banking','/banking'],
  ['legal','/legal'],['terms','/terms-condition']];
const widths = { mobile: 390, desktop: 1440 };
const base = 'https://www.yummemomos.com';
const b = await chromium.launch();
for (const [name, path] of pages) {
  for (const [label, w] of Object.entries(widths)) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.screenshot({ path: `screenshots/before/${name}-${label}.png`, fullPage: true });
    await p.close();
  }
}
await b.close();
```

---

## 4. Brand & design direction

**Personality:** appetizing, fresh, energetic, trustworthy, a little street-food warmth + a clean modern manufacturer credibility. Momo = Himalayan/Tibetan comfort food.

**Palette (starting point — refine in `frontend-design`):**
- Primary: a warm momo/steamed-dough cream `#FBF7F0` background base.
- Accent 1 (CTA / energy): chili red / tomato `#E23A2E`.
- Accent 2 (fresh): herb green `#2F7D48` for veg cues.
- Deep neutral text: `#231A16` (warm near-black).
- Support: golden fry `#F2A93B` for highlights/badges.
- Use veg-green vs non-veg-red dots (Indian FSSAI convention) on product cards.

**Typography:** one characterful display face for headings (rounded, friendly but not childish) + a clean readable sans for body. Avoid default system-only stacks. Follow the `frontend-design` skill for pairing and scale.

**Imagery:** the current site's Google-hosted images are low-quality/compressed. In the rebuild, use placeholder image slots with clear `alt` text and a note to the client to supply high-res photos. Do **not** hotlink the `lh3.googleusercontent.com` URLs in production — download/replace them. Treat all product photos with consistent aspect ratios, rounded corners, subtle shadow.

**Motion:** subtle only — fade/slide-in on scroll, hover lift on cards, steam-wisp micro-animation on hero is a nice touch. Respect `prefers-reduced-motion`.

---

## 5. Global elements

**Header / nav (sticky, condensed on scroll):**
- Logo left.
- Links: Home · Menu · About · Franchise · Achievements · Contact.
- Persistent primary CTA button: **"Order on WhatsApp"** (→ `https://wa.me/919142081374`).
- Mobile: hamburger → full-screen slide-in menu, large tap targets (min 44px), CTA pinned.

**Sticky mobile action bar (mobile only, bottom):** Call · WhatsApp · Get App — three big thumb-friendly buttons. This is the single biggest mobile conversion win.

**Footer:**
- Address, hours, phones, email, social links.
- Quick nav.
- App store badges.
- Copyright: © 2019–2026 Yumme Momos Manufacturer.

**Consolidate the 9 Google Sites pages into a cleaner IA** (see §7). Fold `Legal`, `Banking`, `Terms & Condition` into fewer, better pages.

---

## 6. Real content to migrate (do not lose any of this)

**Company blurb (About / Home):**
- Established 2019. Manufactures Frozen Veg Momos, Frozen Non-Veg Momos, and Frozen French Fries.
- Emphasis: superb taste, healthy, nutritious, good quality; dedicated team; quality-tested ingredients; timely delivery; long-term B2B relationships; hygienic food at reasonable rates.
- Rewrite the existing prose to be tighter and less repetitive — it currently repeats "clients" and "quality" heavily. Keep meaning, improve flow.

**Vision:** "Enabling and empowering individuals in transforming societies by serving convenient food that saves time and builds reliability and simplicity — created in an agile, innovative, trusted work environment backed by simple sustainable systems."

**Mission:** "To deliver convenience in the daily food experience."

**Three pillars (Home):**
1. **Delicious Food** — "Love momo? You'll never have just one."
2. **Authentic Taste** — cooked traditionally with native Himalayan herbs for a real Himalayan flavour.
3. **Real Ingredients** — only real ingredients for the freshest, most authentic taste.

**Product / Menu list (build proper product cards):**
- Veg Momo
- Chicken Momo
- Paneer Corn Momo
- Jain Veg Momo
- Cheese Corn Momo
- Fish Momo
- Mushroom Momo
- Mutton Momo
- (Product lines also include **Frozen French Fries**.)

Each card: image slot, name, veg/non-veg indicator, short tasty description, "Order" CTA (WhatsApp/app). Prices are not published on the current site — leave a price slot the client can fill, or omit price and drive to app/WhatsApp.

**Achievements / Awards (build a proper timeline or badge section):**
- "Best Momo Manufacturer in Jharkhand" — awarded by Jayaparda, 10/08/2025.
- "Best Momo Manufacturer" — awarded by (MLA) Purnima Das, 14/04/2026.
- There are related YouTube videos (see links below) — embed as a small gallery.

**App (feature prominently — it's a real product):**
- Android: https://play.google.com/store/apps/details?id=com.yummeuserapp.app
- iOS: https://apps.apple.com/in/app/yumme-momos-app/id6504599618
- Messaging on current site: "Install app for order & booking — instant discount." Turn this into a proper app-download section with device mockup slots and store badges.

**Contact / Reach us:**
- Address: Yumme Momos Manufacturer, Bagun Nagar, Behind AIWC School, Near Church, Baridih, Jamshedpur, Jharkhand — 831017.
- Phones: 9142081374 (24×7), 7209412954 (24×7).
- Email: yummemomo2020@gmail.com
- Hours: Mon–Sun, 9:30 AM–7:30 PM, 365 days (special holidays only).
- Embed a Google Map for the address.

**Franchise / Stockist (Stock Franchise page):**
- Add a proper enquiry section + WhatsApp franchise contacts:
  - https://wa.me/919142081374
  - https://wa.me/917873282812
- Build an enquiry form (name, phone, city, message) that submits via a static form service (e.g. Formspree/Netlify Forms) **or** deep-links to a pre-filled WhatsApp message. Do not invent a backend.

**Social links:**
- WhatsApp: https://wa.me/919142081374
- Facebook: https://www.facebook.com/YummeMomo2020/
- YouTube: https://youtube.com/@yummemomo7550
- Instagram: (link present on current site via invite — ask client for the clean handle URL)
- Google listing: https://g.co/kgs/5iSGFkQ

**Video content (embed lazily via lite-youtube, don't autoload iframes):**
- https://youtube.com/shorts/GLTA4wImT4I
- https://youtu.be/MJlwK2IOvR8
- https://youtu.be/Lfjxnwbjxs8
- https://youtu.be/cZOXQCvghfA

---

## 7. New page structure (multi-page)

1. **Home** — hero (tagline + steam animation + primary CTAs), 3 pillars, featured products (4–6 cards → link to full menu), app-download band, awards highlight, testimonial/social proof slot, franchise teaser, contact strip.
2. **Menu / Products** — full grid of all momo varieties + French fries, veg/non-veg filter toggle, order CTAs.
3. **About** — story since 2019, vision, mission, process (handmade momos: dough → fill → fold → steam/fry), hygiene & quality note, team slot.
4. **Franchise / Stockist** — why partner, what's offered, enquiry form + WhatsApp CTAs. (Rename "Stock Franchise" to something clearer like "Become a Partner".)
5. **Achievements** — awards timeline + press/video gallery.
6. **Contact / Reach Us** — address, map, phones, email, hours, social, quick WhatsApp buttons.
7. **Legal** *(single consolidated page)* — merge current **Legal**, **Banking**, and **Terms & Condition** into one page with anchored sections (Terms, Banking details, Legal/registration info). Fetch the actual content from those three live pages first and preserve it faithfully — do not fabricate legal, banking, or registration details.

> ⚠️ For Legal / Banking / Terms: pull the real text from the live pages and keep it verbatim in meaning. Never invent bank account numbers, GST/FSSAI numbers, or legal terms. If a live page is empty or unclear, leave a clearly-marked `TODO: client to provide` placeholder.

---

## 8. Improvements checklist

**Content & UX**
- [ ] Replace every raw pasted URL with a styled button or link.
- [ ] Rewrite repetitive copy to be concise and appetizing.
- [ ] Real product cards with veg/non-veg indicators.
- [ ] Awards presented as credible badges/timeline, not loose images.
- [ ] Clear, repeated CTAs: Order (WhatsApp), Get the App, Franchise enquiry.
- [ ] Add a short FAQ (ordering, delivery area, MOQ for B2B, franchise basics) — mark answers `TODO` where the client must confirm facts.

**Mobile optimization**
- [ ] Mobile-first CSS; test at 360/390/414px.
- [ ] Sticky bottom action bar (Call / WhatsApp / App).
- [ ] Tap targets ≥ 44px; readable base font ≥ 16px.
- [ ] No horizontal scroll; fluid images; no fixed-width layouts.
- [ ] Hamburger nav with accessible focus trap.
- [ ] `tel:` and `wa.me` links work on tap.

**Performance**
- [ ] Convert/serve images as WebP/AVIF with `srcset` + lazy-load.
- [ ] Lazy-load YouTube (facade/lite-youtube), no autoplaying iframes.
- [ ] Preconnect fonts; self-host or `display:swap`.
- [ ] Target Lighthouse mobile ≥ 90 across Performance, A11y, Best Practices, SEO.

**SEO & meta**
- [ ] Per-page `<title>` + meta description (current site is `noindex` with weak titles — fix this: make pages indexable).
- [ ] Open Graph + Twitter cards with a proper share image.
- [ ] `LocalBusiness` / `FoodEstablishment` JSON-LD schema (name, address, geo, hours, phone, sameAs socials).
- [ ] Descriptive alt text on all images.
- [ ] `sitemap.xml` + `robots.txt`.

**Accessibility**
- [ ] Semantic landmarks, heading order, color contrast (check red-on-cream), focus-visible states, `prefers-reduced-motion`, form labels.

---

## 9. Suggested repo structure (Astro example)

```
/
├── src/
│   ├── layouts/BaseLayout.astro
│   ├── components/ (Header, Footer, MobileActionBar, ProductCard,
│   │                AwardTimeline, AppDownload, WhatsAppButton, LiteYouTube)
│   ├── data/ (products.ts, awards.ts, site.ts  ← all copy/contact lives here)
│   └── pages/ (index, menu, about, franchise, achievements, contact, legal)
├── public/images/
├── screenshots/ (before/ after/)
└── scripts/screenshots.mjs
```

Keep all editable content (phones, address, product list, awards) in `src/data/site.ts` so the client can update copy without touching components.

---

## 10. Build order for Claude Code

1. Run **Checkpoint A** screenshots of the live site.
2. Fetch the live **Legal / Banking / Terms** pages and save their real text.
3. Read the **`frontend-design`** skill; lock in tokens (color, type, spacing).
4. Scaffold the project + global layout, header, footer, mobile action bar.
5. Build `site.ts` data with all §6 content.
6. Build pages in this order: Home → Menu → About → Franchise → Achievements → Contact → Legal.
7. Add images (placeholders + `TODO` for client hi-res), SEO meta, JSON-LD, sitemap.
8. Run **Checkpoint B** screenshots per page as you go; fix responsive issues.
9. Run Lighthouse; hit the targets in §8.
10. **Checkpoint C** final before/after comparison; write a short `HANDOFF.md` listing every `TODO: client to provide` item (hi-res photos, prices, Instagram URL, GST/FSSAI/banking details, any confirmed FAQ facts).

---

## 11. Guardrails

- Preserve **all** real content; don't drop pages or contacts.
- Never invent factual business data (prices, legal/banking/registration/tax numbers, delivery areas). Use clearly-marked `TODO` placeholders.
- Don't hotlink Google-hosted images in production — download and optimize, or use placeholders.
- Keep it static and fast; no unnecessary backend.
- Everything mobile-first; the mobile experience is the priority.
