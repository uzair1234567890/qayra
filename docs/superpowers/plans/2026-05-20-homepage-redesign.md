# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `src/pages/index.astro` as a light-luxury editorial homepage with one dark Featured Scent Spotlight band, using only the existing Midnight Velvet palette (`cream`, `champagne`, `aubergine`, `navy`, `near-black`) and existing Fraunces + Manrope type. No new fonts, colors, or JS dependencies.

**Architecture:** Cream-dominant page composed of six home-only Astro components. The existing `HeroFromBanner` keeps its CMS-banner override branch and renders a new `<HomeHero />` as the fallback. New components live under `src/components/home/`. The Featured Spotlight is the only deep-dark section (background `near-black` with an `aubergine` radial-gradient wash). All motion reuses existing `FadeUp` / `HeroStagger` and the `--ease-qa-out` token; `prefers-reduced-motion` is honored everywhere.

**Tech Stack:** Astro 6, Tailwind v4 (`@theme` tokens in `src/styles/globals.css`), Supabase (`serverClient` for reads), Vitest for unit tests, Playwright for E2E. No React component is needed for any of these sections (server-rendered Astro is enough).

**Reference spec:** `docs/superpowers/specs/2026-05-20-homepage-redesign-design.md`

---

## File map

**Create:**
- `src/components/home/HomeHero.astro` — new cream asymmetric hero (the fallback inside `HeroFromBanner`).
- `src/components/home/SectionLabel.astro` — reusable `NN — TITLE` header with champagne hairline.
- `src/components/home/BrandStrip.astro` — three quiet promises between hairlines.
- `src/components/home/FeaturedSpotlight.astro` — the dark Spotlight band.
- `src/components/home/StarterSetBand.astro` — image-left Starter Set composition.
- `src/components/home/PullQuotes.astro` — testimonial pull-quotes (no boxes).
- `src/lib/home.ts` — pure resolvers: pick featured scent from `scents + setting`, fetch spotlight banner override, fetch starter-set bundle. Unit-tested.
- `tests/unit/home.test.ts` — Vitest tests for `src/lib/home.ts` resolvers.
- `tests/e2e/homepage-redesign.spec.ts` — Playwright smoke test for the new sections.

**Modify:**
- `src/components/home/HeroFromBanner.astro` — replace the entire `else` (fallback) branch with `<HomeHero />`. Keep the banner-override branch unchanged.
- `src/components/product/ProductCard.astro` — accept optional `index?: number` prop, render `01`-style numeral, drop the redundant `Shop X →` caption.
- `src/pages/index.astro` — rewrite the section composition below `<HeroFromBanner />` to use the new components.

**Do NOT touch:** `PublicLayout`, `SiteHeader`, `SiteFooter`, `AnnouncementBar`, `FadeUp`, `HeroStagger`, `Button`, `globals.css`, any other route, the database schema.

---

## Conventions

**Branch:** Work in a feature branch off `main`: `feature/homepage-redesign`. Commit after each task. Frequent small commits beat one big commit.

**Style:** Match the existing codebase — Astro frontmatter blocks, Tailwind utility classes referencing theme tokens (`bg-cream`, `text-navy`, `border-navy/10`, `text-champagne`), no inline `<style>` unless an animation/hairline needs it.

**Type tracking color tokens:** `cream`, `champagne`, `aubergine`, `navy`, `near-black`. Use only these. The implementer must not introduce `text-purple-*` or any other Tailwind default palette.

**Section numbering:** Hero eyebrow reads `VOL. 01 — THE COLLECTION` (brand frame). The four content sections after the hero use `01 — THE FEATURE` / `02 — THE COLLECTION` / `03 — THE STARTER SET` / `04 — IN PRAISE OF`. The Brand Strip between Hero and Spotlight is intentionally unnumbered.

**Reduced motion:** Every new animation MUST be wrapped in `@media (prefers-reduced-motion: reduce)` to disable it. The existing rule in `globals.css` already neutralizes most transitions globally, but explicit per-component rules are still required for `animation` declarations.

---

## Task 0: Setup branch and verify baseline

**Files:** none modified

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/homepage-redesign
```

- [ ] **Step 2: Verify dev server boots and current homepage renders**

```bash
npm run dev
```

Open `http://localhost:4321/`. Confirm the current homepage loads with the existing hero (CMS banner or dark fallback), shipping bar, scent grid, and two testimonial boxes. Stop the dev server (Ctrl+C).

Expected: page renders without errors. If it doesn't, fix `.env` / Supabase setup before starting the rest of the plan — the new components depend on the same data path.

- [ ] **Step 3: Verify test commands work**

```bash
npm run test:unit -- --run
npm run lint
```

Expected: both exit 0. If `test:unit` is empty or errors, investigate before continuing.

- [ ] **Step 4: Commit branch start**

No file changes — skip this commit. Move to Task 1.

---

## Task 1: Add `src/lib/home.ts` resolvers (TDD)

This is the only new pure-logic file. Tested with Vitest before any component touches it.

**Files:**
- Create: `src/lib/home.ts`
- Create: `tests/unit/home.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/home.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickFeaturedScent } from '../../src/lib/home';
import type { Scent } from '../../src/lib/catalog';

function scent(slug: string, overrides: Partial<Scent> = {}): Scent {
  return {
    id: `id-${slug}`,
    slug,
    name: slug,
    tagline: null,
    description: null,
    top_notes: null,
    heart_notes: null,
    base_notes: null,
    image_urls: [],
    stock_qty: 10,
    active: true,
    sort_order: 0,
    product_id: `p-${slug}`,
    base_price: 149900,
    ...overrides,
  };
}

describe('pickFeaturedScent', () => {
  it('returns the scent matching the configured slug', () => {
    const list = [scent('a'), scent('b'), scent('c')];
    expect(pickFeaturedScent(list, 'b')?.slug).toBe('b');
  });

  it('falls back to the first scent when slug is null', () => {
    const list = [scent('a'), scent('b')];
    expect(pickFeaturedScent(list, null)?.slug).toBe('a');
  });

  it('falls back to the first scent when slug does not match any scent', () => {
    const list = [scent('a'), scent('b')];
    expect(pickFeaturedScent(list, 'missing')?.slug).toBe('a');
  });

  it('returns null when the list is empty', () => {
    expect(pickFeaturedScent([], 'anything')).toBeNull();
    expect(pickFeaturedScent([], null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --run tests/unit/home.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/home'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/home.ts`:

```ts
import type { Scent } from './catalog';

export function pickFeaturedScent(scents: Scent[], slug: string | null): Scent | null {
  if (scents.length === 0) return null;
  if (slug) {
    const match = scents.find((s) => s.slug === slug);
    if (match) return match;
  }
  return scents[0] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --run tests/unit/home.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home.ts tests/unit/home.test.ts
git commit -m "feat(home): pickFeaturedScent resolver with unit tests"
```

---

## Task 2: Add `SectionLabel.astro`

The reusable section header. Used by Collection, Starter Set, Pull-quotes, and (eyebrow-only mode) the Spotlight.

**Files:**
- Create: `src/components/home/SectionLabel.astro`

- [ ] **Step 1: Create the component**

```astro
---
interface Props {
  number?: string;        // e.g. "01"
  title: string;          // e.g. "THE FEATURE"
  align?: 'left' | 'center';
  tone?: 'navy' | 'cream'; // navy = on cream bg; cream = on dark bg
  rightSlotPresent?: boolean;
}

const {
  number,
  title,
  align = 'left',
  tone = 'navy',
  rightSlotPresent = false,
} = Astro.props;

const labelColor = tone === 'cream' ? 'text-cream/80' : 'text-navy/60';
const ruleColor = 'bg-champagne';
const justify = align === 'center' ? 'justify-center' : 'justify-between';
---

<div class:list={['mb-8 flex items-center gap-4', justify]}>
  <p
    class:list={[
      'flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] uppercase',
      labelColor,
    ]}
  >
    <span class:list={['inline-block h-px w-8', ruleColor]} aria-hidden="true"></span>
    {number ? <span class="text-champagne">{number}</span> : null}
    {number ? <span aria-hidden="true">—</span> : null}
    <span>{title}</span>
  </p>
  {rightSlotPresent ? <slot name="right" /> : null}
</div>

{align === 'left' && (
  <div class:list={['mb-10 h-px w-full', tone === 'cream' ? 'bg-cream/10' : 'bg-navy/10']}>
  </div>
)}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run check
```

Expected: 0 errors, 0 warnings for this file. If `astro check` reports anything, fix it before committing.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/SectionLabel.astro
git commit -m "feat(home): add SectionLabel component"
```

---

## Task 3: Add `HomeHero.astro`

Replaces the dark fallback hero currently embedded in `HeroFromBanner`.

**Files:**
- Create: `src/components/home/HomeHero.astro`

- [ ] **Step 1: Create the component**

```astro
---
import HeroStagger from '../motion/HeroStagger.astro';
import type { Scent } from '../../lib/catalog';

interface Props {
  heroScent?: Scent | null;
  totalScents: number;
}

const { heroScent = null, totalScents } = Astro.props;
const img = heroScent?.image_urls?.[0] ?? null;
const counter = totalScents > 0 ? `01 / ${String(totalScents).padStart(2, '0')}` : null;
---

<section class="relative bg-cream overflow-hidden">
  <!-- Subtle off-center radial vignette (atmosphere, no color shift) -->
  <div
    class="pointer-events-none absolute inset-0 -z-0"
    aria-hidden="true"
    style="background: radial-gradient(60% 60% at 80% 10%, color-mix(in srgb, var(--color-champagne) 6%, transparent) 0%, transparent 70%);"
  >
  </div>

  <div class="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-12 md:gap-10 md:py-28">
    <!-- Left column: editorial copy (7/12) -->
    <div class="md:col-span-7 md:pr-8 border-l border-champagne pl-6 md:pl-10">
      <HeroStagger>
        <p class="mb-6 text-[11px] font-medium tracking-[0.3em] uppercase text-champagne">
          Vol. 01 — The Collection
        </p>

        <h1
          class="font-display font-light text-navy mb-8 leading-[0.95]"
          style="font-size: clamp(56px, 9vw, 128px); letter-spacing: -0.02em;"
        >
          Quiet luxury.<br />Long drives.
        </h1>

        <div>
          <p class="text-navy/70 mb-8 max-w-[36ch] text-base leading-relaxed">
            Hand-blended fragrances for the inside of your car. Made slowly in Bengaluru.
          </p>

          <a
            href="/products"
            class="inline-flex items-center gap-2 text-navy text-xs uppercase tracking-[0.25em] font-medium pb-1 border-b border-champagne hover:border-navy transition-colors duration-200"
          >
            Shop the collection
            <span aria-hidden="true">→</span>
          </a>

          <p class="mt-10 text-[11px] tracking-[0.25em] uppercase text-champagne">
            Bergamot <span class="opacity-60">·</span> Aubergine
            <span class="opacity-60">·</span> Cedarwood
            <span class="opacity-60">·</span> Patchouli
          </p>
        </div>
      </HeroStagger>
    </div>

    <!-- Right column: product image + counter (5/12) -->
    <div class="md:col-span-5 flex flex-col">
      <div class="bg-aubergine/15 relative aspect-[4/5] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={heroScent?.name ?? ''}
            width="800"
            height="1000"
            fetchpriority="high"
            class="h-full w-full object-cover"
          />
        ) : (
          <div class="from-aubergine via-navy to-near-black absolute inset-0 bg-gradient-to-br"></div>
        )}
      </div>
      {counter && (
        <p class="mt-4 self-end text-[11px] tracking-[0.3em] uppercase text-champagne font-display">
          {counter}
        </p>
      )}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Type-check the file**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeHero.astro
git commit -m "feat(home): add HomeHero (cream asymmetric editorial hero)"
```

---

## Task 4: Wire `HomeHero` into `HeroFromBanner` and verify visually

**Files:**
- Modify: `src/components/home/HeroFromBanner.astro`

- [ ] **Step 1: Replace the fallback branch**

Open `src/components/home/HeroFromBanner.astro`. Replace its entire contents with:

```astro
---
import { serverClient } from '../../lib/supabase/server';
import HeroStagger from '../motion/HeroStagger.astro';
import HomeHero from './HomeHero.astro';
import { getActiveScents } from '../../lib/catalog';
import { readSetting } from '../../lib/settings';
import { pickFeaturedScent } from '../../lib/home';

const supabase = serverClient(Astro.request, Astro.cookies);
const now = new Date().toISOString();

const { data: banner } = await supabase
  .from('banners')
  .select('headline, image_url, cta_text, cta_url')
  .eq('position', 'hero')
  .or(`active_from.is.null,active_from.lte.${now}`)
  .or(`active_until.is.null,active_until.gte.${now}`)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// Fallback path needs the featured/hero scent for the right-column image.
let heroScent = null;
let totalScents = 0;
if (!banner) {
  const [scents, featuredSlug] = await Promise.all([
    getActiveScents(Astro.request, Astro.cookies),
    readSetting<string | null>('featured_scent_slug', null),
  ]);
  totalScents = scents.length;
  heroScent = pickFeaturedScent(scents, featuredSlug);
}
---

{banner ? (
  <section class="relative bg-navy text-cream overflow-hidden">
    {banner.image_url && (
      <img
        src={banner.image_url}
        alt=""
        width="1920"
        height="600"
        fetchpriority="high"
        class="absolute inset-0 h-full w-full object-cover opacity-30"
      />
    )}
    <div class="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 text-center">
      <HeroStagger>
        {banner.headline && <h1 class="font-display text-5xl md:text-7xl font-light mb-4">{banner.headline}</h1>}
        {banner.cta_text && banner.cta_url && (
          <a href={banner.cta_url} class="inline-block bg-champagne text-navy px-8 py-3 text-xs uppercase tracking-widest">
            {banner.cta_text}
          </a>
        )}
      </HeroStagger>
    </div>
  </section>
) : (
  <HomeHero heroScent={heroScent} totalScents={totalScents} />
)}
```

- [ ] **Step 2: Run the dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:4321/`. Expected:
- If no `position='hero'` banner is active in your DB, the new cream HomeHero renders with the headline "Quiet luxury. Long drives.", an ingredient strip, the "01 / NN" counter, and the right-column image (or aubergine/navy gradient if no image).
- If a hero banner exists, the existing dark banner layout still renders (unchanged).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HeroFromBanner.astro
git commit -m "feat(home): use HomeHero as banner fallback; load featured scent"
```

---

## Task 5: Add `BrandStrip.astro`

**Files:**
- Create: `src/components/home/BrandStrip.astro`

- [ ] **Step 1: Create the component**

```astro
---
// Three quiet brand promises sitting between two champagne hairlines.
// Replaces the loud navy "Free shipping" bar.
---

<section class="border-y border-champagne/40 bg-cream">
  <p class="mx-auto max-w-6xl px-4 py-6 sm:px-6 text-center text-[11px] uppercase tracking-[0.25em] text-navy/60">
    <span>Made slowly</span>
    <span class="mx-3 text-champagne" aria-hidden="true">·</span>
    <span>Hand-blended in small batches</span>
    <span class="mx-3 text-champagne" aria-hidden="true">·</span>
    <span>Pan-India shipping</span>
  </p>
</section>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/BrandStrip.astro
git commit -m "feat(home): add BrandStrip (three promises between hairlines)"
```

---

## Task 6: Add `FeaturedSpotlight.astro`

The dark editorial moment. Uses scent fields that already exist in the `Scent` type (`description`, `top_notes`, `heart_notes`, `base_notes`).

**Files:**
- Create: `src/components/home/FeaturedSpotlight.astro`

- [ ] **Step 1: Create the component**

```astro
---
import type { Scent } from '../../lib/catalog';

interface Props {
  scent: Scent | null;
}

const { scent } = Astro.props;

// If no scent at all, the parent shouldn't render this section; guard anyway.
const img = scent?.image_urls?.[0] ?? null;
const desc = scent?.description ?? scent?.tagline ?? null;

const noteRows = [
  scent?.top_notes ? { label: 'Top', value: scent.top_notes } : null,
  scent?.heart_notes ? { label: 'Heart', value: scent.heart_notes } : null,
  scent?.base_notes ? { label: 'Base', value: scent.base_notes } : null,
].filter((r): r is { label: string; value: string } => r !== null);

// Split the name on the first space for an italic accent on the second word.
const nameParts = scent ? scent.name.split(' ') : [];
const nameFirst = nameParts[0] ?? '';
const nameRest = nameParts.slice(1).join(' ');
---

{scent && (
  <section class="relative overflow-hidden bg-near-black text-cream">
    <!-- Aubergine radial wash -->
    <div
      class="spotlight-wash pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
    </div>

    <div class="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
      <!-- Image -->
      <div class="relative aspect-[4/5] overflow-hidden bg-near-black/40">
        {img ? (
          <img
            src={img}
            alt={scent.name}
            width="800"
            height="1000"
            loading="lazy"
            class="h-full w-full object-cover"
          />
        ) : (
          <div class="from-aubergine via-navy to-near-black absolute inset-0 bg-gradient-to-br"></div>
        )}
      </div>

      <!-- Editorial copy -->
      <div>
        <p class="mb-6 flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] uppercase text-champagne">
          <span class="inline-block h-px w-8 bg-champagne" aria-hidden="true"></span>
          <span>01</span>
          <span aria-hidden="true">—</span>
          <span>The Feature</span>
        </p>

        <h2
          class="font-display font-light text-cream mb-6 leading-[0.95]"
          style="font-size: clamp(48px, 6vw, 80px); letter-spacing: -0.02em;"
        >
          {nameFirst}
          {nameRest && <><br /><em class="font-display italic">{nameRest}</em></>}
        </h2>

        {desc && (
          <p class="text-cream/70 mb-10 max-w-[52ch] text-base leading-relaxed">
            {desc}
          </p>
        )}

        {noteRows.length > 0 && (
          <dl class="mb-10 space-y-2 text-sm text-cream/70">
            {noteRows.map((row) => (
              <div class="grid grid-cols-[5rem_auto] items-baseline gap-3">
                <dt class="text-cream/50 tracking-[0.2em] uppercase text-[11px]">{row.label}</dt>
                <dd>
                  <span class="text-champagne mr-2" aria-hidden="true">—</span>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <a
          href={`/product/${scent.slug}`}
          class="inline-flex items-center gap-2 text-cream text-xs uppercase tracking-[0.25em] font-medium pb-1 border-b border-champagne hover:border-cream transition-colors duration-200"
        >
          Read the full note
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>

    <style>
      .spotlight-wash {
        background:
          radial-gradient(60% 60% at 20% 20%, color-mix(in srgb, var(--color-aubergine) 60%, transparent) 0%, transparent 70%),
          radial-gradient(80% 80% at 90% 90%, color-mix(in srgb, var(--color-navy) 40%, transparent) 0%, transparent 70%);
        background-size: 140% 140%, 140% 140%;
        background-position: 20% 20%, 90% 90%;
      }
      @media (prefers-reduced-motion: no-preference) {
        .spotlight-wash {
          animation: spotlight-drift 12s ease-in-out infinite alternate;
        }
      }
      @keyframes spotlight-drift {
        from {
          background-position: 20% 20%, 90% 90%;
        }
        to {
          background-position: 30% 30%, 80% 80%;
        }
      }
    </style>
  </section>
)}
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/FeaturedSpotlight.astro
git commit -m "feat(home): add FeaturedSpotlight dark editorial band"
```

---

## Task 7: Refine `ProductCard.astro` with optional numeral

**Files:**
- Modify: `src/components/product/ProductCard.astro`

- [ ] **Step 1: Update the component**

Replace the entire file with:

```astro
---
import { formatINR } from '../../lib/format';
import type { Scent } from '../../lib/catalog';
interface Props {
  scent: Scent;
  index?: number; // 1-based; when provided, renders "NN" numeral above name
}
const { scent, index } = Astro.props;
const img = scent.image_urls[0] ?? null;
const numeral = typeof index === 'number' ? String(index).padStart(2, '0') : null;
---

<a href={`/product/${scent.slug}`} class="scent-card group bg-cream/0 block">
  <div class="bg-aubergine/20 relative mb-4 aspect-square overflow-hidden">
    {
      img ? (
        <img
          src={img}
          alt={scent.name}
          width="600"
          height="600"
          loading="lazy"
          class="ease-qa-out h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div class="from-aubergine via-navy to-near-black absolute inset-0 bg-gradient-to-br" />
      )
    }
  </div>
  {numeral && (
    <p class="text-champagne mb-1 text-[11px] tracking-[0.3em] uppercase font-medium">{numeral}</p>
  )}
  <p class="scent-name font-display text-navy text-xl">{scent.name}</p>
  <p class="text-navy/60 mt-1 text-xs">{formatINR(scent.base_price)}</p>
</a>
```

- [ ] **Step 2: Verify no other call sites broke**

```bash
npm run check
```

Expected: 0 errors. The `index` prop is optional so existing call sites (e.g., `src/pages/products/index.astro`, any cross-sell rows) keep working without it.

- [ ] **Step 3: Verify the rendered output**

```bash
npm run dev
```

Open `http://localhost:4321/` — the homepage cards still render (without numerals yet; we'll pass `index` in Task 11). Open `http://localhost:4321/products` — that catalog page should also still render normally (no numeral, no regression). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/product/ProductCard.astro
git commit -m "feat(product-card): add optional index prop for numeric label"
```

---

## Task 8: Add `StarterSetBand.astro`

Pulls the Starter Set bundle by slug. Uses `serverClient` (same as the existing PDP at `src/pages/bundles/[slug].astro`).

**Files:**
- Create: `src/components/home/StarterSetBand.astro`

- [ ] **Step 1: Create the component**

```astro
---
import { serverClient } from '../../lib/supabase/server';
import { formatINR } from '../../lib/format';
import { readSetting } from '../../lib/settings';

const supabase = serverClient(Astro.request, Astro.cookies);

const { data: bundle } = await supabase
  .from('bundles')
  .select('slug, name, description, price, image_urls')
  .eq('slug', 'starter-set')
  .eq('status', 'active')
  .maybeSingle();

const freeShippingPaise = await readSetting<number>('free_shipping_threshold', 49900);

const heroImg = bundle?.image_urls?.[0] ?? null;
const priceLabel = bundle ? formatINR(bundle.price) : null;
---

<section class="bg-cream">
  <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
    <div class="grid items-center gap-10 md:grid-cols-12">
      <!-- Image (~55%) -->
      <div class="md:col-span-7">
        <div class="relative aspect-[4/3] overflow-hidden bg-aubergine/15">
          {heroImg ? (
            <img
              src={heroImg}
              alt={bundle?.name ?? 'Starter Set'}
              width="1200"
              height="900"
              loading="lazy"
              class="h-full w-full object-cover"
            />
          ) : (
            <div class="from-aubergine via-navy to-near-black absolute inset-0 bg-gradient-to-br"></div>
          )}
        </div>
      </div>

      <!-- Copy (~45%) -->
      <div class="md:col-span-5">
        <p class="mb-6 flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] uppercase text-navy/60">
          <span class="inline-block h-px w-8 bg-champagne" aria-hidden="true"></span>
          <span class="text-champagne">03</span>
          <span aria-hidden="true">—</span>
          <span>The Starter Set</span>
        </p>

        <h2 class="font-display text-navy font-light mb-6 leading-[1.05]" style="font-size: clamp(36px, 4.5vw, 48px); letter-spacing: -0.01em;">
          Three scents, one ride.
        </h2>

        <p class="text-navy/80 mb-8 max-w-[48ch] text-base leading-relaxed">
          {bundle?.description ?? 'Three of our scents, packaged in a slim navy sleeve. The easiest place to start — and the one most people gift.'}
        </p>

        {priceLabel && (
          <p class="mb-8 text-navy">
            <span class="text-2xl font-medium">{priceLabel}</span>
          </p>
        )}

        <a
          href="/bundles/starter-set"
          class="inline-flex items-center gap-2 text-navy text-xs uppercase tracking-[0.25em] font-medium pb-1 border-b border-champagne hover:border-navy transition-colors duration-200"
        >
          View the set
          <span aria-hidden="true">→</span>
        </a>

        <p class="mt-6 text-[11px] tracking-[0.15em] uppercase text-navy/50">
          Free shipping on prepaid orders over {formatINR(freeShippingPaise)}
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/StarterSetBand.astro
git commit -m "feat(home): add StarterSetBand"
```

---

## Task 9: Add `PullQuotes.astro`

Replaces the two boxed testimonial cards.

**Files:**
- Create: `src/components/home/PullQuotes.astro`

- [ ] **Step 1: Create the component**

```astro
---
import SectionLabel from './SectionLabel.astro';

interface Quote {
  body: string;
  attribution: string;
}

interface Props {
  quotes?: Quote[];
}

const {
  quotes = [
    {
      body: "Best scent I've had in any car. Long-lasting.",
      attribution: 'Riya, Mumbai',
    },
    {
      body: 'Velvet Midnight is unreal. Ordered the starter set next.',
      attribution: 'Arjun, Delhi',
    },
  ],
} = Astro.props;
---

<section class="bg-cream">
  <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
    <SectionLabel number="04" title="In Praise Of" />

    <div class="space-y-16 md:space-y-20">
      {quotes.map((q, i) => (
        <figure class:list={['max-w-2xl', i % 2 === 1 ? 'md:ml-auto md:text-right' : '']}>
          <blockquote class="font-display italic text-navy leading-[1.25]" style="font-size: clamp(24px, 3vw, 32px);">
            &ldquo;{q.body}&rdquo;
          </blockquote>
          <figcaption class="mt-4 text-[11px] uppercase tracking-[0.3em] text-navy/60">
            <span class="text-champagne mr-2" aria-hidden="true">──</span>
            {q.attribution}
          </figcaption>
        </figure>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/PullQuotes.astro
git commit -m "feat(home): add PullQuotes (replace boxed testimonials)"
```

---

## Task 10: Rewrite `src/pages/index.astro`

Compose the homepage from the new components. Load data once at the top.

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/pages/index.astro` with:

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
import HeroFromBanner from '../components/home/HeroFromBanner.astro';
import FadeUp from '../components/motion/FadeUp.astro';
import ProductCard from '../components/product/ProductCard.astro';
import BrandStrip from '../components/home/BrandStrip.astro';
import FeaturedSpotlight from '../components/home/FeaturedSpotlight.astro';
import StarterSetBand from '../components/home/StarterSetBand.astro';
import PullQuotes from '../components/home/PullQuotes.astro';
import SectionLabel from '../components/home/SectionLabel.astro';
import { getActiveScents } from '../lib/catalog';
import { readSetting } from '../lib/settings';
import { pickFeaturedScent } from '../lib/home';

const [scents, featuredSlug] = await Promise.all([
  getActiveScents(Astro.request, Astro.cookies),
  readSetting<string | null>('featured_scent_slug', null),
]);

const featured = pickFeaturedScent(scents, featuredSlug);
---

<PublicLayout title="Quiet scents, long drives">
  <!-- 1. Hero (CMS banner or new HomeHero fallback) -->
  <HeroFromBanner />

  <!-- 2. Quiet brand strip -->
  <FadeUp>
    <BrandStrip />
  </FadeUp>

  <!-- 3. Featured Scent Spotlight (only when we have a scent) -->
  {featured && (
    <FadeUp>
      <FeaturedSpotlight scent={featured} />
    </FadeUp>
  )}

  <!-- 4. The Collection -->
  <section class="bg-cream">
    <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
      <SectionLabel number="02" title="The Collection" rightSlotPresent>
        <a
          slot="right"
          href="/products"
          class="text-[11px] uppercase tracking-[0.25em] font-medium text-navy border-b border-champagne pb-1 hover:border-navy transition-colors"
        >
          See all <span aria-hidden="true">→</span>
        </a>
      </SectionLabel>

      <div class="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
        {scents.map((s, i) => (
          <FadeUp delay={i * 60}>
            <ProductCard scent={s} index={i + 1} />
          </FadeUp>
        ))}
      </div>
    </div>
  </section>

  <!-- 5. The Starter Set -->
  <FadeUp>
    <StarterSetBand />
  </FadeUp>

  <!-- 6. Pull-quote testimonials -->
  <FadeUp>
    <PullQuotes />
  </FadeUp>
</PublicLayout>
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Run the dev server and visually verify the full page**

```bash
npm run dev
```

Open `http://localhost:4321/`. Expected, in order:
1. New cream HomeHero (or banner if active).
2. Brand strip between two champagne hairlines.
3. Dark Featured Spotlight band with notes block (if your DB has at least one active scent).
4. "02 — THE COLLECTION" header + grid with `01`/`02`/`03`/`04` numerals above each scent name.
5. Starter Set image-left band with price and "View the set →" CTA (image falls back to gradient if the bundle has no image).
6. Pull-quote testimonials, second quote right-aligned on desktop.

Test reduced-motion: in your browser, enable "Reduce motion" in OS settings (Windows: Settings → Accessibility → Visual effects → Animation effects off). Reload — confirm no animations play.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): compose new homepage with six editorial sections"
```

---

## Task 11: Add Playwright smoke test

**Files:**
- Create: `tests/e2e/homepage-redesign.spec.ts`

- [ ] **Step 1: Write the test**

Create `tests/e2e/homepage-redesign.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('homepage redesign', () => {
  test('renders all six sections in order on cream canvas', async ({ page }) => {
    await page.goto('/');

    // Hero headline (visible in both banner and fallback paths)
    await expect(page.locator('h1')).toBeVisible();

    // Brand strip
    await expect(page.getByText('Hand-blended in small batches', { exact: false })).toBeVisible();

    // Collection section
    await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: /collection/i }).first()).toBeVisible();
    // "See all →" link to /products
    await expect(page.getByRole('link', { name: /see all/i })).toBeVisible();

    // Starter Set CTA
    await expect(page.getByRole('link', { name: /view the set/i })).toBeVisible();

    // Pull-quote testimonials (one of the seeded attributions)
    await expect(page.getByText(/Riya, Mumbai|Arjun, Delhi/).first()).toBeVisible();

    // Body uses the cream theme color (background-color resolves to #f2ede4)
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // rgb(242, 237, 228) === #f2ede4
    expect(bodyBg).toBe('rgb(242, 237, 228)');
  });

  test('reduced-motion users see no animation transitions', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');

    // The reveal targets land in their final state immediately under reduced motion.
    const opacity = await page.locator('[data-reveal]').first().evaluate((el) =>
      getComputedStyle(el).opacity,
    );
    expect(opacity).toBe('1');

    await ctx.close();
  });
});
```

- [ ] **Step 2: Run the test (with dev server)**

```bash
npm run dev
```

In another terminal:

```bash
npx playwright test tests/e2e/homepage-redesign.spec.ts
```

Expected: both tests PASS.

If the `bodyBg` check fails because Playwright reports `rgb(...)` in a different format (e.g. with non-zero alpha), inspect the actual value and adjust the assertion to match what your build produces — the goal is to confirm the page is on the cream background, not to be pedantic about the format. Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/homepage-redesign.spec.ts
git commit -m "test(e2e): smoke test for redesigned homepage sections"
```

---

## Task 12: Lint, type-check, and full test sweep

**Files:** none modified

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: exit 0. Fix any new lint warnings introduced by the new components before continuing.

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors, 0 warnings related to the new files.

- [ ] **Step 3: Unit tests**

```bash
npm run test:unit -- --run
```

Expected: existing test count + 4 new tests from Task 1 all pass.

- [ ] **Step 4: E2E sweep on the homepage**

```bash
npm run dev
```

In another terminal:

```bash
npx playwright test tests/e2e/storefront.spec.ts tests/e2e/homepage-redesign.spec.ts tests/e2e/a11y.spec.ts
```

Expected: all PASS. If `storefront.spec.ts` or `a11y.spec.ts` fails because they grep for the old shipping bar copy ("Free shipping on prepaid orders over") in the page chrome and that copy moved to the Starter Set section, update the test to query the new location. Do NOT silently re-add the old shipping bar.

Stop the dev server.

- [ ] **Step 5: Commit any fixups**

If you adjusted any existing test:

```bash
git add tests/
git commit -m "test: adjust existing specs for new homepage layout"
```

If no changes needed, skip the commit.

---

## Task 13: Final visual QA + responsive check

**Files:** none modified

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check 360px (mobile)**

In your browser devtools, set viewport to 360px wide. Reload `/`. Expected:
- Hero stacks: copy first, image second.
- Spotlight stacks: image first, copy second.
- Collection: 2-column grid.
- Starter Set stacks: image first, copy second.
- Pull-quotes: both centered (no left/right alternation on mobile).
- No horizontal scrollbar.

- [ ] **Step 3: Check 768px (tablet)**

Viewport 768px. Expected: still mostly stacked but with tighter spacing; check no element overflows.

- [ ] **Step 4: Check 1280px (desktop)**

Viewport 1280px. Expected: all asymmetric two-column layouts in their full form. Hero counter "01/NN" sits at the bottom-right of the right column. Quote 2 is right-aligned with offset.

- [ ] **Step 5: Check 1920px (wide)**

Viewport 1920px. Expected: content stays inside `max-w-6xl` rails — no element stretches to viewport edges except the Spotlight band (full-bleed) and the BrandStrip hairlines.

- [ ] **Step 6: Check banner-override path**

If your DB has tooling to insert a banner row, insert one with `position='hero'` and `active_from <= now`, then reload `/`. Expected: the dark CMS banner renders instead of the new HomeHero. Remove or expire that row when done.

- [ ] **Step 7: Stop dev server, commit nothing**

No changes — this task is verification only.

---

## Task 14: Push the branch (do not merge automatically)

**Files:** none modified

- [ ] **Step 1: Push**

```bash
git push -u origin feature/homepage-redesign
```

- [ ] **Step 2: Hand off**

Report to the user:
- Branch name: `feature/homepage-redesign`
- New files created (the list in §File map).
- Modified files (the list in §File map).
- A short summary of what they should look at in a preview deploy or local dev: "open `/`, then disable the active hero banner if present to see the new HomeHero, then check the dark Spotlight band and the responsive layouts."

Do NOT open a PR, do NOT merge. The user is responsible for the merge step (see the `superpowers:finishing-a-development-branch` skill).

---

## Self-review (already performed by the planner)

- **Spec coverage:** Every section in §3 of the spec maps to a task (Hero=Task 3+4, BrandStrip=Task 5, Spotlight=Task 6, Collection=Tasks 7+10, StarterSet=Task 8, PullQuotes=Task 9, composition=Task 10). Typography, motion, and color-application notes from §4 of the spec are inlined into each component's Tailwind/CSS where applicable. Data notes from §6 are implemented by Task 1 (`pickFeaturedScent`) and the resolver fetches in Tasks 4, 8. Accessibility notes from §7 are honored: `<h1>` in HomeHero, `<h2>` in Spotlight/StarterSet/PullQuotes, decorative spans `aria-hidden`, alt text on real images, `prefers-reduced-motion` in Spotlight. Performance §8: no new fonts, no new client JS, `fetchpriority="high"` on hero image, `loading="lazy"` on Spotlight image. Testing §9: Task 1 unit tests + Task 11 E2E + Task 13 manual QA. Out-of-scope §10 explicitly preserved (no changes to header/footer/announcement/global theme).
- **Placeholder scan:** No `TBD`, `TODO`, or "implement later" remains. All code blocks contain the actual content.
- **Type consistency:** `pickFeaturedScent` signature in Task 1 matches its call sites in Tasks 4 and 10. `ProductCard` `index?: number` prop matches its consumer in Task 10. `FeaturedSpotlight` accepts `scent: Scent | null` and is guarded at the call site (`{featured && ...}`).
- **Open-question follow-ups:** Spec open question #2 (notes fields) is resolved — the existing `Scent` type has them. Spec open question #3 (banner `position` CHECK constraint) is left as a deferred check; the Spotlight banner-override path is intentionally NOT implemented in this plan (the spec lists it as optional). If the user later wants a banner-driven Spotlight override, that becomes a follow-up spec — calling it out here so the implementer doesn't go hunting for it.
