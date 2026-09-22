# Homepage redesign — light-luxury editorial with one moment of depth

**Status:** Draft (awaiting user approval)
**Date:** 2026-05-20
**Scope:** `src/pages/index.astro` and the home-only components feeding it. No catalog, PDP, cart, or admin changes.

---

## 1. Goal

Replace the current homepage with a more attractive, brand-true composition that:

- Stays inside the existing **Midnight Velvet** palette and **Fraunces + Manrope** type system (no new fonts, no new colors).
- Is light and airy overall (cream-dominant) — the user picked "Light & airy luxury" as the aesthetic.
- Is balanced between editorial storytelling and storefront access — the user picked "Balanced — editorial hero, fast shop access" as the primary goal.
- Includes a Featured Scent Spotlight and a Starter-Set highlight with refined testimonials — the two extra sections the user selected.
- Earns the "Midnight Velvet" brand name with **one** cinematic dark moment (the Spotlight) inside an otherwise cream page.

Non-goals: redesigning the header, footer, announcement bar, product card behavior, or any other route. No new fonts. No new color tokens. No scroll-parallax or heavy JS motion.

---

## 2. Page architecture

```
PublicLayout (cream bg, navy text — existing)
├── AnnouncementBar         (existing, unchanged)
├── SiteHeader              (existing, unchanged)
└── main
    ├── 1. Hero                            (cream, asymmetric, editorial)
    ├── 2. Quiet brand strip               (cream, three promises, hairlines)
    ├── 3. Featured Scent Spotlight ★      (near-black + aubergine wash — THE dark moment)
    ├── 4. The Collection (scent grid)     (cream, refined ProductCard)
    ├── 5. The Starter Set                 (cream band, image-left)
    └── 6. Pull-quote testimonials         (cream, no card boxes)
└── SiteFooter             (existing dark — kept as page anchor)
```

Two dark moments only: the Spotlight band and the footer. Everything between them is cream.

**Numbering convention used throughout the design:**
- The hero eyebrow reads `VOL. 01 — THE COLLECTION` — this is the *brand* frame (collection volume), not a section index.
- Each numbered content section (Spotlight, Collection, Starter Set, Pull-quotes) uses a section index eyebrow: `01 — THE FEATURE`, `02 — THE COLLECTION`, `03 — THE STARTER SET`, `04 — IN PRAISE OF`. The Brand Strip (§3.2) is intentionally unnumbered — it's a connective rule, not a content section.
- Product cards inside The Collection use their own arabic numerals (`01`, `02`, `03`, `04`) above each name, indexing the products within the grid. The visual style matches the section eyebrows (Manrope tracked caps, champagne) — the context (above a product name vs. as a section header) keeps them from feeling like the same numeric sequence.

---

## 3. Sections

### 3.1 Hero

Asymmetric two-column on `md+`, stacked on mobile. Cream background with a very subtle off-center radial vignette in champagne at ~4% opacity (atmosphere, not flash).

**Left column (~60% width):**
- Eyebrow: `VOL. 01 — THE COLLECTION` in Manrope 11px uppercase, letter-spacing 0.3em, champagne. Preceded by a short vertical champagne hairline.
- Headline: "Quiet luxury. Long drives." in Fraunces, `clamp(56px, 9vw, 128px)`, weight 300, tracking -0.02em, navy. Two lines, with a `<br>` between sentences.
- Sub-copy: "Hand-blended fragrances for the inside of your car. Made slowly in Bengaluru." Manrope 15-16px, navy at 70% opacity, max-width ~36ch.
- Primary CTA: "Shop the collection →" — text-style button with a champagne underline that thickens on hover. Not a filled button.
- Ingredient strip: `BERGAMOT · AUBERGINE · CEDARWOOD · PATCHOULI` in Manrope 11px uppercase, tracking 0.25em, champagne. Used as typographic texture, not a list.

**Right column (~40% width):**
- Product image (real bottle shot if available) filling a tall portrait frame.
- Beneath the image, right-aligned: `01 / 04` in Fraunces small numerals, champagne — connects to the Collection grid numerals below.

**Motion:** existing `HeroStagger` keeps working — eyebrow → headline → (sub-copy + CTA + ingredient strip) reveal with 200ms / 400ms delays. Image fades in over 600ms.

**CMS override:** if a `banners` row with `position='hero'` is active, it replaces this layout (same behavior as today). The redesign updates only the fallback path.

---

### 3.2 Quiet brand strip

Replaces the loud navy "Free shipping" bar.

- Cream background, no fill.
- Two thin champagne hairlines top and bottom (1px, full width).
- Single line: `Made slowly  ·  Hand-blended in small batches  ·  Pan-India shipping`
- Manrope 12px uppercase, tracking 0.25em, navy at 60% opacity. Centered. ~32px vertical padding.

Free-shipping threshold value moves to the Starter Set section (where the spend matters) and stays in the existing announcement bar.

---

### 3.3 Featured Scent Spotlight ★

Full-bleed dark section. The only deeply dark moment on the page.

**Background:** near-black `#0e0820` with an aubergine `#5c3a6e` radial-gradient wash anchored to the top-left, fading to transparent. Optional slow drift (6s ease-in-out alternating) — gated by `prefers-reduced-motion`.

**Layout:** two-column on `md+`, stacked on mobile.

**Left (~50%):** Featured scent product image, full-bleed inside the column.

**Right (~50%):**
- Eyebrow: `01 — THE FEATURE` in champagne tracked caps with leading hairline.
- Name: scent name in Fraunces, ~64-80px (responsive), weight 300, cream. If the name has two words, the second renders italic (e.g., "Velvet *Midnight*").
- Description: a 2-3 sentence editorial paragraph in Manrope, cream at 70% opacity, max-width ~52ch.
- Notes block:
  ```
  Top    — Bergamot, black plum
  Heart  — Iris, leather
  Base   — Cedar, vetiver, patchouli
  ```
  Manrope 13-14px, cream at 70%, em-rules in champagne, monospaced column alignment by padding the labels.
- CTA: "Read the full note →" — champagne underline link, links to `/product/<slug>`.

**Data source:**
- Primary: `settings.featured_scent_slug` via existing `readSetting` helper. If unset, fall back to the first active scent returned by `getActiveScents`.
- Override: if a `banners` row with `position='spotlight'` exists and is active, render its `headline / image_url / cta_text / cta_url` instead of the scent-driven layout (mirrors the existing `position='hero'` pattern).
- Editorial copy (description + notes): pulled from the scent record's own fields if present (`description`, `top_notes`, `heart_notes`, `base_notes` — these fields already exist on the `Scent` type in `src/lib/catalog.ts`), with safe fallbacks if any are missing (skip the Notes block rather than render empty rows).

**Empty/fallback behavior:**
- No image → render the band with just the typography on the dark gradient. The Spotlight remains visually strong.
- No notes data → drop the notes block; keep the description and CTA.
- No scents at all → entire Spotlight section is skipped (don't render an empty dark band).

---

### 3.4 The Collection (scent grid)

Cream section, refined version of the current grid.

**Section header:**
- Left: `02 — THE COLLECTION` (Manrope tracked caps, navy at 60%) with a short champagne hairline above.
- Right: `See all →` link to `/products` (champagne underline).
- Long champagne hairline spans the full width below the header.

**Grid:** 4 columns on `md+`, 2 on mobile, gap-8.

**Card refinements (to `ProductCard.astro`):**
- Add a numeral above the name: `01`, `02`, `03`, … in Manrope 11px tracked caps, champagne. Numerals match the order they appear in the grid (computed from the loop index in `index.astro`, passed as a prop).
- Remove the redundant `Shop {first-word} →` caption — the entire card already links to the product, and the hover underline on the name is enough signal.
- Keep the existing hover behavior: 500ms image zoom and champagne underline draw on `.scent-name`. No new motion.
- Keep the aspect-square image frame and the aubergine/20 background fallback.

---

### 3.5 The Starter Set

Cream band, two-column image-left composition. Pulled from the `bundles` table by slug `starter-set`.

**Left (~55%):** composed photograph of the three bottles together (uses the bundle's hero image; falls back to a tasteful aubergine→navy gradient panel matching the existing PDP fallback if no image).

**Right (~45%):**
- Eyebrow: `03 — THE STARTER SET` champagne tracked caps with leading hairline.
- Headline: "Three scents, one ride." Fraunces, ~40-48px, weight 300, navy.
- Body: "Velvet Midnight · Coastal Drive · Forest Hush, packaged in a slim navy sleeve. Best place to begin — and the one most people gift." Manrope, navy/80, max-width ~48ch.
- Price line: bundle price `·` saves-amount. Manrope, navy.
- CTA: "View the set →" champagne underline link to `/bundles/starter-set`.
- Tiny line below CTA: "Free shipping on prepaid orders over ₹X." Manrope 11px, navy/50.

**Empty/fallback:** if the starter-set bundle is missing or inactive, render with hardcoded copy + the gradient fallback panel — never a blank section. The CTA still points to `/bundles/starter-set` (which will 404 gracefully if truly missing; that's fine for the homepage hero band).

---

### 3.6 Pull-quote testimonials

Cream section. Replaces the two boxed quote cards.

**Section header:** `04 — IN PRAISE OF` (Manrope tracked caps, navy/60, champagne hairline above).

**Two quotes**, stacked vertically with generous spacing and asymmetric horizontal alignment (first left-aligned, second indented ~25% from the left or right-aligned on `md+`). Stacked centered on mobile.

Each quote:
- Body: Fraunces italic, ~28-32px on desktop, navy, with curly typographic quotes `"…"`.
- Attribution: `── Riya, Mumbai` in Manrope 11px tracked caps, champagne. Em-dash in champagne is the only ornament.
- No background fill, no border, no card. Just type on cream.

Content stays the same as today (Riya / Arjun quotes) — content change is out of scope. No `StarRating` here; the pull-quote form replaces the star signal.

---

## 4. Type, color, motion summary

**Typography (all already loaded — Fraunces + Manrope):**

| Use | Family | Size | Weight | Tracking | Color |
| --- | --- | --- | --- | --- | --- |
| Hero headline | Fraunces | clamp(56,9vw,128) | 300 | -0.02em | navy |
| Section-name H2 | Fraunces | 32-40px | 300 | -0.01em | navy |
| Spotlight name | Fraunces | 64-80px (resp.) | 300 (italic accent on 2nd word) | -0.02em | cream |
| Pull-quote | Fraunces italic | 28-32px | 400 | normal | navy |
| Section label / eyebrow | Manrope | 11px uppercase | 500 | 0.3em | champagne |
| Numerals (`01`, `02`…) | Manrope | 11px uppercase | 500 | 0.3em | champagne |
| Ingredient strip | Manrope | 11px uppercase | 500 | 0.25em | champagne |
| Body | Manrope | 15-16px | 400 | normal | navy/80 |
| Small print | Manrope | 11-12px | 400 | normal | navy/50 |

**Color application:**

- `cream #f2ede4` — page canvas (~80% of pixels).
- `navy #231840` — primary text.
- `champagne #d4b97a` — connective tissue: hairlines, tracked caps labels, numerals, CTA underlines, em-dashes, italic accents.
- `aubergine #5c3a6e` — only inside the Spotlight, as a radial gradient wash.
- `near-black #0e0820` — Spotlight base color + the existing footer.

**Motion (all CSS, all respects `prefers-reduced-motion`):**

- Hero stagger — existing `HeroStagger.astro`, no change.
- Section header hairlines — `scaleX(0) → scaleX(1)` over 500ms with `--ease-qa-out`, triggered when scrolled into view. Reuse the existing `FadeUp` reveal mechanism rather than building a new IntersectionObserver.
- Product card hover — existing zoom + underline behavior unchanged.
- Spotlight aubergine wash — slow 6s `background-position` drift alternating, ease-in-out. Disabled under `prefers-reduced-motion`.
- No parallax, no scroll-tied animations, no Motion library, no fancy JS.

---

## 5. Components

**Reused (no change):** `PublicLayout`, `SiteHeader`, `SiteFooter`, `AnnouncementBar`, `FadeUp`, `HeroStagger`, `Button`.

**Refined (small props change):** `ProductCard.astro` — accepts an optional `index?: number` prop; when provided, renders the `01`-style numeral above the name and drops the "Shop X →" caption.

**New components (all under `src/components/home/`):**

- `HomeHero.astro` — the new cream asymmetric hero (the fallback layout currently inside `HeroFromBanner`'s `else` branch becomes this component).
- `FeaturedSpotlight.astro` — the dark Spotlight band. Accepts a scent record (and optional banner override) and renders the editorial layout.
- `BrandStrip.astro` — the quiet three-promise strip.
- `StarterSetBand.astro` — the cream Starter Set composition.
- `PullQuotes.astro` — the two pull-quote testimonials.
- `SectionLabel.astro` — the reusable numeral + tracked-caps + champagne hairline header used by sections 4 and 6 (and reused by `StarterSetBand` and `FeaturedSpotlight` eyebrows where the layout matches).

**Modified:**

- `src/components/home/HeroFromBanner.astro` — keep the CMS-banner override branch as-is; replace the `else` branch with `<HomeHero />`.
- `src/pages/index.astro` — replace the existing free-shipping bar, scent grid section, and testimonial section with the new section composition listed in §2.

---

## 6. Data & queries

The redesign should add **at most one** new data read beyond what `index.astro` already does today. The current page reads `getActiveScents` and `readSetting('free_shipping_threshold')`.

New reads:

1. **Featured scent:** read `settings.featured_scent_slug` via `readSetting`. Resolve to a scent from the already-loaded `scents` array (no extra DB round-trip). If unset or unresolved, use `scents[0]`.
2. **Spotlight banner override:** one new query to `banners` with `position='spotlight'` and the same active-window filter the hero uses. Can be batched with the existing hero banner query inside `HeroFromBanner` if helpful — but a separate small query is fine; the cost is negligible.
3. **Starter Set bundle:** read the `starter-set` bundle from the `bundles` table (or whatever the existing bundles helper is — discover during implementation; if no helper exists, use a single direct `from('bundles').select(...).eq('slug','starter-set').maybeSingle()`).

If any read fails or returns nothing, the corresponding section degrades to a hardcoded-copy fallback or is skipped (per the per-section "Empty/fallback behavior" notes above) — never render an empty section, and never throw.

---

## 7. Accessibility

- Color contrast: navy on cream and cream on near-black both clear WCAG AA at body sizes. Champagne on cream is decorative-only (labels/hairlines) — never used for primary body text.
- Section labels use real `<h2>` elements (visually styled as tracked caps); the eyebrow caps inside the Spotlight and Starter Set sit *above* the H2 as a `<p>` with `aria-hidden="true"` so the heading hierarchy stays clean.
- All decorative images get `alt=""`; product images get the scent name as alt text.
- Reduced motion: every animation in §4 is wrapped by the existing `prefers-reduced-motion` rule in `globals.css`; the new Spotlight wash drift adds its own `@media (prefers-reduced-motion: reduce)` block setting `animation: none`.
- The single product image in the hero gets `fetchpriority="high"` and explicit width/height to avoid LCP regression. The Spotlight image is below the fold — `loading="lazy"`.
- Keyboard focus states use the existing button/link focus styles; no new focus treatment.

---

## 8. Performance

- No new fonts (Fraunces + Manrope already loaded with `display=swap`).
- No new JS bundle. The reveal animations reuse the existing `reveal.client.ts` script that already runs on every public page.
- Hero image dimensions stay roughly the same as today's; LCP should stay flat or improve slightly because the asymmetric hero crops the image to a portrait frame (smaller bytes).
- Spotlight aubergine wash is a pure CSS radial gradient — no image cost.
- Section-label hairlines are 1px elements — no images, no SVGs.

Target: Lighthouse Performance ≥ existing baseline on the homepage. No regression in LCP, CLS, or TBT.

---

## 9. Testing

- **Unit:** no new unit tests required. Existing Vitest coverage for `lib/catalog`, `lib/settings`, and the cart helpers is unaffected.
- **Visual / E2E:** add one Playwright check that the homepage renders with each section's identifying H2 visible, and that the Spotlight degrades to a non-empty state when no `featured_scent_slug` is set (the fallback path).
- **Manual QA:** check the page at 360px, 768px, 1280px, and 1920px widths; verify reduced-motion mode flattens all animations; verify the CMS banner override path still wins when an active `position='hero'` row exists; verify the page still ships when the `bundles` table query returns nothing.

---

## 10. Out of scope

- Header/footer/announcement-bar redesign.
- Any change to `/products`, `/product/[slug]`, `/bundles/[slug]`, cart, checkout, account, ops, or admin.
- New fonts, new color tokens, or theme switching.
- Adding ratings/aggregated review counts to the testimonial section.
- Loyalty/referral, popups, or chat widgets.
- A11y audit of routes other than `/`.
- Content writing — the editorial copy in this spec (e.g., the Starter Set blurb, the Velvet Midnight description) is suggested placeholder copy; final copy is the user's call before launch.

---

## 11. Open questions for implementation

1. Does the `bundles` table currently store a single hero image for the Starter Set, or do we need a small admin tweak to upload one? (Discover during implementation; if no field exists, fall back to the gradient panel for now and defer the schema change.)
2. ~~Do active scent records carry notes fields today?~~ Resolved: the `Scent` interface in `src/lib/catalog.ts` already exposes `top_notes`, `heart_notes`, `base_notes`, `description`, and `tagline`. The Spotlight's notes block uses these directly, and skips any individual line that is `null`.
3. The `featured_scent_slug` setting — is it acceptable to add it as a new key under the existing `settings` table via `readSetting`, or should it become a new typed admin field? Default plan: add it as a string setting, exposed via an existing admin Settings page (out of scope for this spec — for now, the implementer can seed it manually in the DB).
4. Does the `banners` table allow arbitrary `position` strings, or is it constrained by a CHECK/enum? If constrained, adding `position='spotlight'` needs a migration; if not, no schema change is required. The implementer should verify before relying on the Spotlight banner-override path.
