# Week 2 — Storefront (public pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship every public-facing storefront page — home (shop-forward), scents collection, 4× PDP, brand story, contact, policy pages, error pages — wired to real Supabase data via the catalog tables seeded with the four launch scents.

**Architecture:** All pages live under `src/pages/` (no `/admin` or `/ops`). Shared shell via `PublicLayout.astro`. Pages are SSR by default (Astro `output: 'server'`) but use Supabase server client for catalog reads. Cart/checkout deferred to Week 3 — buttons exist but no-op for now.

**Tech Stack:** Astro 6 · Tailwind v4 (CSS-native @theme{}) · Supabase (catalog reads) · Zod (form validation)

**Spec reference:** `docs/superpowers/specs/2026-05-17-qayra-ecommerce-design.md` §§ 6, 7

---

## File structure created this week

```
src/
├── components/
│   ├── layout/
│   │   ├── SiteHeader.astro              # nav + bag-count badge
│   │   ├── SiteFooter.astro
│   │   └── AnnouncementBar.astro         # banner CMS slot (renders if active)
│   ├── product/
│   │   ├── ScentCard.astro               # grid card with image, name, price
│   │   ├── ScentSwitcher.astro           # 4-pill scent chooser on PDP
│   │   ├── ScentNotes.astro              # top/heart/base notes block
│   │   └── StickyBuyBar.astro            # bottom-pinned add-to-bag bar
│   ├── ui/
│   │   ├── Button.astro                  # primary/secondary/ghost variants
│   │   ├── Pill.astro
│   │   └── StarRating.astro              # display only (not input)
│   └── policy/
│       └── PolicyPage.astro              # shared shell for policy markdown
├── layouts/
│   └── PublicLayout.astro                # site header + footer wrapper
├── lib/
│   ├── catalog.ts                        # getActiveScents, getScentBySlug, etc.
│   └── format.ts                         # formatINR(paise)
├── pages/
│   ├── index.astro                       # shop-forward home (replaces placeholder)
│   ├── scents/index.astro                # collection page
│   ├── scent/[slug].astro                # PDP — all 4 scents
│   ├── bundles/[slug].astro              # bundle PDP (basic; Week 8 enhances)
│   ├── story.astro                       # brand story
│   ├── contact.astro                     # contact form (no backend submit yet)
│   ├── policies/
│   │   ├── shipping.astro
│   │   ├── returns.astro
│   │   ├── privacy.astro
│   │   └── terms.astro
│   ├── 404.astro
│   └── 500.astro
└── content/                              # (no policy markdown — pages use inline content)

supabase/
├── migrations/
│   └── 20260524000000_seed_catalog.sql
└── seed.sql                              # development seed only

tests/
└── e2e/
    └── storefront.spec.ts
```

---

## Task 1: Catalog data layer

**Files:** Create `src/lib/catalog.ts`, `src/lib/format.ts`; Test `tests/unit/format.test.ts`

- [ ] **Step 1: Failing test for `formatINR`**

`tests/unit/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatINR } from '../../src/lib/format';

describe('formatINR', () => {
  it('formats whole rupees from paise', () => {
    expect(formatINR(34900)).toBe('₹349');
    expect(formatINR(99900)).toBe('₹999');
  });
  it('formats sub-rupee paise correctly', () => {
    expect(formatINR(34950)).toBe('₹349.50');
    expect(formatINR(100)).toBe('₹1');
  });
  it('handles zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });
});
```

Run: `npm run test:unit` → FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/format.ts`**

```ts
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  if (Number.isInteger(rupees)) return `₹${rupees.toLocaleString('en-IN')}`;
  return `₹${rupees.toFixed(2)}`;
}
```

Run: `npm run test:unit` → PASS.

- [ ] **Step 3: Implement `src/lib/catalog.ts`**

```ts
import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';

export interface Scent {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  top_notes: string | null;
  heart_notes: string | null;
  base_notes: string | null;
  image_urls: string[];
  stock_qty: number;
  active: boolean;
  sort_order: number;
  product_id: string;
  base_price: number; // joined from products
}

export async function getActiveScents(cookies: AstroCookies): Promise<Scent[]> {
  const supabase = serverClient(cookies);
  const { data, error } = await supabase
    .from('scents')
    .select('*, products!inner(base_price, status)')
    .eq('active', true)
    .eq('products.status', 'active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    base_price: (row.products as any).base_price,
  })) as Scent[];
}

export async function getScentBySlug(cookies: AstroCookies, slug: string): Promise<Scent | null> {
  const supabase = serverClient(cookies);
  const { data, error } = await supabase
    .from('scents')
    .select('*, products!inner(base_price, status)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, base_price: (data.products as any).base_price } as Scent;
}
```

- [ ] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(catalog): formatINR helper + getActiveScents/getScentBySlug

INR amounts stored as paise; formatINR converts to ₹X or ₹X.XX strings.
Catalog helpers join products.base_price with scents.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Seed the four launch scents

**Files:** Create `supabase/migrations/20260524000000_seed_catalog.sql`

- [ ] **Step 1: Write the seed migration**

```sql
-- seed: one product, four scents, one bundle
insert into public.products (id, slug, name, description, base_price, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'qayra-fragrance-diffuser',
  'qayra fragrance diffuser',
  'Hand-blended fragrance for the inside of your car.',
  34900,
  'active'
);

insert into public.scents (product_id, slug, name, tagline, description, top_notes, heart_notes, base_notes, stock_qty, sort_order, active) values
  ('00000000-0000-0000-0000-000000000001', 'azeziya',           'Azeziya',           'scent of stillness',  'A gentle, refined fragrance built around precious woods and a soft floral heart.', 'Bergamot, cardamom', 'Jasmine, rose absolute', 'Sandalwood, amber',  60, 1, true),
  ('00000000-0000-0000-0000-000000000001', 'velvet-midnight',   'Velvet Midnight',   'after-hours scent',   'A scent that arrives slowly. Notes of oud, sandalwood and a quiet warmth.', 'Bergamot, pink pepper', 'Iris, jasmine, leather', 'Oud, sandalwood, vanilla', 60, 2, true),
  ('00000000-0000-0000-0000-000000000001', 'blue-lotus-mist',   'Blue Lotus Mist',   'a slow exhale',       'Aquatic, calm, balanced. Built around the blue lotus accord.', 'Sea salt, mint', 'Blue lotus, lily', 'White musk, driftwood', 60, 3, true),
  ('00000000-0000-0000-0000-000000000001', 'imperial-musk',     'Imperial Musk',     'a quiet command',     'Refined musk, warm and confident without being loud.', 'Pink pepper, saffron', 'Iris, geranium', 'Musks, ambergris, vanilla', 60, 4, true);

insert into public.bundles (slug, name, description, price, status) values
  ('starter-set', 'The Starter Set', 'All four scents, ₹250 off versus buying each individually.', 99900, 'active');

insert into public.bundle_items (bundle_id, scent_id, quantity)
select b.id, s.id, 1
from public.bundles b
cross join public.scents s
where b.slug = 'starter-set'
  and s.slug in ('azeziya','velvet-midnight','blue-lotus-mist','imperial-musk');
```

- [ ] **Step 2: Push migration**

```powershell
npx supabase db push
```

- [ ] **Step 3: Verify rows exist**

In Supabase dashboard → Table Editor → `scents`: 4 rows. `bundles`: 1 row. `bundle_items`: 4 rows.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260524000000_seed_catalog.sql
git commit -m "feat(catalog): seed 4 launch scents + starter set bundle

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: UI primitives — Button, Pill, StarRating

**Files:** Create `src/components/ui/Button.astro`, `Pill.astro`, `StarRating.astro`

- [ ] **Step 1: `src/components/ui/Button.astro`**

```astro
---
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  href?: string;
  type?: 'button' | 'submit';
  class?: string;
  disabled?: boolean;
}
const { variant = 'primary', href, type = 'button', class: className = '', disabled } = Astro.props;
const base =
  'inline-flex items-center justify-center px-6 py-3 text-xs uppercase tracking-widest font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const styles = {
  primary: 'bg-navy text-cream hover:bg-near-black',
  secondary: 'bg-champagne text-near-black hover:bg-champagne/85',
  ghost: 'border border-navy/30 text-navy hover:bg-navy/5',
};
const cls = `${base} ${styles[variant]} ${className}`;
---

{
  href ? (
    <a href={href} class={cls}>
      <slot />
    </a>
  ) : (
    <button type={type} class={cls} disabled={disabled}>
      <slot />
    </button>
  )
}
```

- [ ] **Step 2: `src/components/ui/Pill.astro`**

```astro
---
interface Props {
  active?: boolean;
  class?: string;
}
const { active = false, class: className = '' } = Astro.props;
const cls = active
  ? 'inline-block px-3 py-1.5 rounded-full font-display text-sm bg-navy text-cream border border-navy'
  : 'inline-block px-3 py-1.5 rounded-full font-display text-sm border border-navy/30 text-navy';
---

<span class:list={[cls, className]}><slot /></span>
```

- [ ] **Step 3: `src/components/ui/StarRating.astro`**

```astro
---
interface Props {
  value: number;
  count?: number;
  class?: string;
}
const { value, count, class: className = '' } = Astro.props;
const full = Math.floor(value);
const half = value - full >= 0.5;
---

<div class:list={['text-champagne inline-flex items-center gap-1 text-xs', className]}>
  {
    Array.from({ length: 5 }).map((_, i) => (
      <span>{i < full ? '★' : i === full && half ? '⯨' : '☆'}</span>
    ))
  }
  {count !== undefined && <span class="text-navy/60 ml-1">({count})</span>}
</div>
```

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui
git commit -m "feat(ui): Button, Pill, StarRating primitives

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Site header, footer, layout

**Files:** Create `src/components/layout/SiteHeader.astro`, `SiteFooter.astro`, `AnnouncementBar.astro`, `src/layouts/PublicLayout.astro`

- [ ] **Step 1: `src/components/layout/AnnouncementBar.astro`**

```astro
---
// Renders an active hero banner if one exists. Week 9 wires this to DB.
import { serverClient } from '../../lib/supabase/server';
const supabase = serverClient(Astro.cookies);
const { data: banner } = await supabase
  .from('banners')
  .select('headline, cta_text, cta_url')
  .eq('position', 'announcement')
  .or('active_from.is.null,active_from.lte.now()')
  .or('active_until.is.null,active_until.gt.now()')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
---

{
  banner?.headline && (
    <div class="bg-navy text-champagne px-4 py-2 text-center text-xs tracking-widest uppercase">
      {banner.headline}
      {banner.cta_url && banner.cta_text && (
        <a href={banner.cta_url} class="ml-2 underline">
          {banner.cta_text}
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `src/components/layout/SiteHeader.astro`**

```astro
---
import Logo from '../brand/Logo.astro';
import { getSession } from '../../lib/auth/session';
const session = await getSession(Astro.cookies);
const path = Astro.url.pathname;
---

<header class="bg-cream/90 border-navy/10 sticky top-0 z-30 border-b backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
    <a href="/" class="font-display text-navy text-2xl tracking-tight"
      ><span class="lowercase">qayra</span><span class="text-champagne">.</span></a
    >
    <nav class="text-navy/80 hidden gap-8 text-xs tracking-widest uppercase md:flex">
      <a
        href="/scents"
        class:list={[path.startsWith('/scent') && 'text-navy underline underline-offset-4']}
        >Scents</a
      >
      <a
        href="/bundles/starter-set"
        class:list={[path.startsWith('/bundles') && 'text-navy underline underline-offset-4']}
        >Bundles</a
      >
      <a href="/story" class:list={[path === '/story' && 'text-navy underline underline-offset-4']}
        >Story</a
      >
    </nav>
    <div class="flex items-center gap-4 text-xs tracking-widest uppercase">
      {
        session ? (
          <a href="/account" class="text-navy/80 hover:text-navy">
            Account
          </a>
        ) : (
          <a href="/auth/sign-in" class="text-navy/80 hover:text-navy">
            Sign in
          </a>
        )
      }
      <a href="/cart" class="text-navy font-medium">Bag (<span data-bag-count>0</span>)</a>
    </div>
  </div>
</header>
```

- [ ] **Step 3: `src/components/layout/SiteFooter.astro`**

```astro
---
const year = new Date().getFullYear();
---

<footer class="bg-near-black text-cream mt-24">
  <div class="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 text-sm sm:px-6 md:grid-cols-4">
    <div>
      <p class="font-display mb-2 text-2xl">qayra<span class="text-champagne">.</span></p>
      <p class="text-cream/60 text-xs leading-relaxed">
        Quiet scents, made slowly.<br />Hand-blended in Bengaluru, India.
      </p>
    </div>
    <div>
      <p class="text-champagne mb-3 text-xs tracking-widest uppercase">Shop</p>
      <ul class="text-cream/80 space-y-2">
        <li><a href="/scents">All scents</a></li>
        <li><a href="/bundles/starter-set">Starter Set</a></li>
      </ul>
    </div>
    <div>
      <p class="text-champagne mb-3 text-xs tracking-widest uppercase">qayra</p>
      <ul class="text-cream/80 space-y-2">
        <li><a href="/story">Our story</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <p class="text-champagne mb-3 text-xs tracking-widest uppercase">Help</p>
      <ul class="text-cream/80 space-y-2">
        <li><a href="/policies/shipping">Shipping</a></li>
        <li><a href="/policies/returns">Returns</a></li>
        <li><a href="/policies/privacy">Privacy</a></li>
        <li><a href="/policies/terms">Terms</a></li>
      </ul>
    </div>
  </div>
  <div class="border-cream/10 border-t">
    <p class="text-cream/40 mx-auto max-w-6xl px-4 py-4 text-center text-xs sm:px-6">
      © {year} qayra · Pan-India shipping · ₹ INR
    </p>
  </div>
</footer>
```

- [ ] **Step 4: `src/layouts/PublicLayout.astro`**

```astro
---
import '../styles/globals.css';
import SiteHeader from '../components/layout/SiteHeader.astro';
import SiteFooter from '../components/layout/SiteFooter.astro';
import AnnouncementBar from '../components/layout/AnnouncementBar.astro';
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}
const {
  title,
  description = 'Hand-blended car fragrances. Made slowly in India.',
  ogImage,
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} · qayra</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={`${title} · qayra`} />
    <meta property="og:description" content={description} />
    {ogImage && <meta property="og:image" content={ogImage} />}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Manrope:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-cream text-navy flex min-h-screen flex-col">
    <AnnouncementBar />
    <SiteHeader />
    <main class="flex-1"><slot /></main>
    <SiteFooter />
  </body>
</html>
```

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(layout): PublicLayout with header, footer, announcement bar

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Home page (shop-forward)

**Files:** Rewrite `src/pages/index.astro`; create `src/components/product/ScentCard.astro`

- [ ] **Step 1: `src/components/product/ScentCard.astro`**

```astro
---
import { formatINR } from '../../lib/format';
import type { Scent } from '../../lib/catalog';
interface Props {
  scent: Scent;
}
const { scent } = Astro.props;
const img = scent.image_urls[0] ?? null;
---

<a href={`/scent/${scent.slug}`} class="group bg-cream/0 block">
  <div class="bg-aubergine/20 relative mb-3 aspect-square overflow-hidden">
    {
      img ? (
        <img
          src={img}
          alt={scent.name}
          class="ease-qa-out h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div class="from-aubergine via-navy to-near-black absolute inset-0 bg-gradient-to-br" />
      )
    }
  </div>
  <p class="font-display text-navy text-xl">{scent.name}</p>
  <p class="text-navy/60 mt-1 text-xs">{formatINR(scent.base_price)}</p>
  <p class="text-champagne mt-3 text-xs tracking-widest uppercase group-hover:underline">
    Shop {scent.name.split(' ')[0]} →
  </p>
</a>
```

- [ ] **Step 2: Rewrite `src/pages/index.astro`**

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
import ScentCard from '../components/product/ScentCard.astro';
import Button from '../components/ui/Button.astro';
import StarRating from '../components/ui/StarRating.astro';
import { getActiveScents } from '../lib/catalog';
import { formatINR } from '../lib/format';

const scents = await getActiveScents(Astro.cookies);
---

<PublicLayout title="Quiet scents, long drives">
  <!-- Hero -->
  <section class="bg-near-black text-cream">
    <div
      class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24"
    >
      <div>
        <p class="text-champagne mb-4 text-xs tracking-[0.3em] uppercase">
          Vol. 1 — the collection
        </p>
        <h1 class="font-display mb-4 text-5xl leading-tight font-light md:text-6xl">
          Quiet scents.<br />Long drives.
        </h1>
        <p class="text-cream/70 mb-8 max-w-md">
          Four hand-blended fragrances for the inside of your car. Made in small batches in
          Bengaluru.
        </p>
        <Button variant="secondary" href="/scents">Shop the collection</Button>
      </div>
      <div class="from-aubergine via-navy to-near-black aspect-square rounded-sm bg-gradient-to-br">
      </div>
    </div>
  </section>

  <!-- Shipping banner -->
  <section class="bg-navy text-champagne py-3 text-center text-xs tracking-widest uppercase">
    Free shipping on prepaid orders over {formatINR(49900)}
  </section>

  <!-- Scent grid -->
  <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
    <p class="text-navy/60 mb-8 text-xs tracking-[0.3em] uppercase">All scents</p>
    <div class="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
      {scents.map((s) => <ScentCard scent={s} />)}
    </div>
  </section>

  <!-- Reviews placeholder (Week 9 makes this real) -->
  <section class="bg-cream/0 border-navy/10 border-t">
    <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p class="text-navy/60 mb-8 text-center text-xs tracking-[0.3em] uppercase">
        What our customers say
      </p>
      <div class="grid gap-6 md:grid-cols-2">
        <div class="border-navy/10 border bg-white p-6">
          <StarRating value={5} />
          <p class="text-navy/80 mt-3 text-sm">"Best scent I've had in any car. Long-lasting."</p>
          <p class="text-navy/50 mt-2 text-xs tracking-widest uppercase">Riya · Mumbai</p>
        </div>
        <div class="border-navy/10 border bg-white p-6">
          <StarRating value={5} />
          <p class="text-navy/80 mt-3 text-sm">
            "Velvet Midnight is unreal. Ordered the starter set next."
          </p>
          <p class="text-navy/50 mt-2 text-xs tracking-widest uppercase">Arjun · Delhi</p>
        </div>
      </div>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 3: Verify visually**

`npm run dev` → http://localhost:4321. Confirm: header, announcement bar if seeded, hero with CTA, banner, 4 scent cards (using gradient placeholders since no photos yet), reviews block, footer.

- [ ] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(home): shop-forward home page with hero, scent grid, reviews

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Scents collection page

**Files:** Create `src/pages/scents/index.astro`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import ScentCard from '../../components/product/ScentCard.astro';
import { getActiveScents } from '../../lib/catalog';
const scents = await getActiveScents(Astro.cookies);
---

<PublicLayout title="All scents">
  <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-20">
    <p class="text-navy/60 mb-3 text-xs tracking-[0.3em] uppercase">qayra</p>
    <h1 class="font-display mb-4 text-4xl font-light md:text-5xl">The collection</h1>
    <p class="text-navy/70 mb-12 max-w-md">
      Four scents. Each composed for a moment. Hand-blended in small batches in Bengaluru.
    </p>
    <div class="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
      {scents.map((s) => <ScentCard scent={s} />)}
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 2: Commit**

```powershell
git add .
git commit -m "feat(storefront): /scents collection page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Product detail page (PDP)

**Files:** Create `src/pages/scent/[slug].astro`; create `src/components/product/ScentSwitcher.astro`, `ScentNotes.astro`, `StickyBuyBar.astro`

- [ ] **Step 1: `src/components/product/ScentSwitcher.astro`**

```astro
---
import type { Scent } from '../../lib/catalog';
import Pill from '../ui/Pill.astro';
interface Props {
  scents: Scent[];
  activeSlug: string;
}
const { scents, activeSlug } = Astro.props;
---

<div>
  <p class="text-navy/60 mb-2 text-xs tracking-[0.2em] uppercase">Choose scent</p>
  <div class="flex flex-wrap gap-2">
    {
      scents.map((s) => (
        <a href={`/scent/${s.slug}`}>
          <Pill active={s.slug === activeSlug}>{s.name}</Pill>
        </a>
      ))
    }
  </div>
</div>
```

- [ ] **Step 2: `src/components/product/ScentNotes.astro`**

```astro
---
import type { Scent } from '../../lib/catalog';
interface Props {
  scent: Scent;
}
const { scent } = Astro.props;
---

<div class="border-navy/10 border bg-white p-5">
  <p class="font-display mb-3 text-lg">Scent notes</p>
  {
    scent.top_notes && (
      <div class="mb-2 flex gap-3 text-sm">
        <span class="text-champagne min-w-[60px] pt-0.5 text-xs tracking-widest uppercase">
          Top
        </span>
        <span class="text-navy/80">{scent.top_notes}</span>
      </div>
    )
  }
  {
    scent.heart_notes && (
      <div class="mb-2 flex gap-3 text-sm">
        <span class="text-champagne min-w-[60px] pt-0.5 text-xs tracking-widest uppercase">
          Heart
        </span>
        <span class="text-navy/80">{scent.heart_notes}</span>
      </div>
    )
  }
  {
    scent.base_notes && (
      <div class="flex gap-3 text-sm">
        <span class="text-champagne min-w-[60px] pt-0.5 text-xs tracking-widest uppercase">
          Base
        </span>
        <span class="text-navy/80">{scent.base_notes}</span>
      </div>
    )
  }
</div>
```

- [ ] **Step 3: `src/components/product/StickyBuyBar.astro`**

```astro
---
import { formatINR } from '../../lib/format';
import type { Scent } from '../../lib/catalog';
interface Props {
  scent: Scent;
}
const { scent } = Astro.props;
const inStock = scent.stock_qty > 0;
---

<div
  class="bg-navy text-cream fixed right-0 bottom-0 left-0 z-20 flex items-center justify-between gap-3 px-4 py-3 shadow-[0_-4px_14px_rgba(0,0,0,0.15)]"
>
  <div>
    <p class="font-display text-base leading-tight">{scent.name}</p>
    <p class="text-cream/80 text-xs">
      {formatINR(scent.base_price)} · {inStock ? 'in stock' : 'sold out'}
    </p>
  </div>
  <button
    type="button"
    data-add-to-bag
    data-scent-id={scent.id}
    disabled={!inStock}
    class="bg-champagne text-near-black px-5 py-2.5 text-xs font-semibold tracking-widest uppercase disabled:opacity-50"
  >
    Add to bag
  </button>
</div>
<script>
  // Cart wiring lands in Week 3. For now, prove the button is reachable.
  document.querySelectorAll('[data-add-to-bag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      console.log('add to bag', (btn as HTMLElement).dataset.scentId);
      btn.textContent = 'Added ✓';
      setTimeout(() => {
        btn.textContent = 'Add to bag';
      }, 1200);
    });
  });
</script>
```

- [ ] **Step 4: `src/pages/scent/[slug].astro`**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import ScentSwitcher from '../../components/product/ScentSwitcher.astro';
import ScentNotes from '../../components/product/ScentNotes.astro';
import StickyBuyBar from '../../components/product/StickyBuyBar.astro';
import StarRating from '../../components/ui/StarRating.astro';
import { getActiveScents, getScentBySlug } from '../../lib/catalog';

const { slug } = Astro.params;
const scent = await getScentBySlug(Astro.cookies, slug!);
if (!scent) return Astro.redirect('/404', 302);
const all = await getActiveScents(Astro.cookies);
const sortIndex = all.findIndex((s) => s.id === scent.id) + 1;
const padded = String(sortIndex).padStart(2, '0');
---

<PublicLayout title={scent.name} description={scent.description ?? undefined}>
  <article class="pb-32">
    <!-- bottom padding for sticky buy bar -->
    <nav class="text-navy/60 mx-auto max-w-3xl px-4 py-3 text-xs tracking-widest uppercase sm:px-6">
      <a href="/scents" class="hover:text-navy">Scents</a> · {scent.name}
    </nav>

    <!-- Big square image -->
    <div class="mx-auto max-w-3xl">
      <div class="from-aubergine via-navy to-near-black aspect-square w-full bg-gradient-to-br">
      </div>
    </div>

    <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p class="text-aubergine mb-2 text-xs tracking-[0.3em] uppercase">No. {padded}</p>
      <h1 class="font-display mb-2 text-4xl leading-tight font-light md:text-5xl">{scent.name}</h1>
      {scent.tagline && <p class="text-navy/70 mb-3 italic">{scent.tagline}</p>}
      <StarRating value={5} count={0} class="mb-6" />
      <div class="mb-6"><ScentSwitcher scents={all} activeSlug={scent.slug} /></div>
      {scent.description && <p class="text-navy/80 mb-6 leading-relaxed">{scent.description}</p>}
      <ScentNotes scent={scent} />
    </div>
  </article>
  <StickyBuyBar scent={scent} />
</PublicLayout>
```

- [ ] **Step 5: Verify**

`npm run dev` → visit each: `/scent/azeziya`, `/scent/velvet-midnight`, `/scent/blue-lotus-mist`, `/scent/imperial-musk`. Each should render with switcher, scent notes, sticky buy bar.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(pdp): /scent/[slug] PDP with switcher, notes, sticky buy bar

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Bundle PDP (basic)

**Files:** Create `src/pages/bundles/[slug].astro`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import Button from '../../components/ui/Button.astro';
import { serverClient } from '../../lib/supabase/server';
import { formatINR } from '../../lib/format';

const { slug } = Astro.params;
const supabase = serverClient(Astro.cookies);
const { data: bundle } = await supabase
  .from('bundles')
  .select('id, slug, name, description, price, image_url, bundle_items(scent:scents(slug, name))')
  .eq('slug', slug!)
  .eq('status', 'active')
  .maybeSingle();
if (!bundle) return Astro.redirect('/404', 302);
const items = (bundle.bundle_items as any[]).map((i) => i.scent);
---

<PublicLayout title={bundle.name} description={bundle.description ?? undefined}>
  <section class="mx-auto grid max-w-4xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
    <div class="from-champagne via-aubergine to-near-black aspect-square bg-gradient-to-br"></div>
    <div>
      <p class="text-aubergine mb-2 text-xs tracking-[0.3em] uppercase">Bundle</p>
      <h1 class="font-display mb-3 text-4xl font-light">{bundle.name}</h1>
      <p class="mb-4 text-2xl font-medium">{formatINR(bundle.price)}</p>
      {bundle.description && <p class="text-navy/80 mb-6">{bundle.description}</p>}
      <p class="text-navy/60 mb-2 text-xs tracking-widest uppercase">Includes</p>
      <ul class="text-navy/80 mb-8 space-y-1 text-sm">
        {
          items.map((it) => (
            <li>
              ·{' '}
              <a href={`/scent/${it.slug}`} class="underline-offset-2 hover:underline">
                {it.name}
              </a>
            </li>
          ))
        }
      </ul>
      <Button variant="primary" href="#">Add to bag</Button>
      <p class="text-navy/50 mt-3 text-xs">Cart wiring lands in Week 3.</p>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 2: Commit**

```powershell
git add .
git commit -m "feat(bundles): basic bundle PDP rendering bundle_items

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Story page

**Files:** Create `src/pages/story.astro`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
---

<PublicLayout title="Our story">
  <section class="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
    <p class="text-aubergine mb-3 text-xs tracking-[0.3em] uppercase">qayra</p>
    <h1 class="font-display mb-8 text-4xl leading-tight font-light md:text-5xl">
      Quiet scents,<br />made slowly.
    </h1>
    <div class="prose prose-navy text-navy/80 max-w-none space-y-6 leading-relaxed">
      <p>
        qayra began as a small experiment — a handful of fragrance compounds, a borrowed studio in
        Bengaluru, and one question: <em
          >why does every car air freshener smell like a chemistry set?</em>
      </p>
      <p>
        We make about 800 bottles a month. Each one is hand-blended, cold-filled, and slow-cured for
        two weeks before it leaves the workshop. No shortcuts. No mass-market base accord we've
        licensed from someone else. Just four scents we wanted to live with ourselves.
      </p>
      <p class="text-aubergine text-xs tracking-widest uppercase">
        Final story copy to be written collaboratively in Week 2 of the build.
      </p>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 2: Commit**

```powershell
git add .
git commit -m "feat(story): /story brand story page (copy placeholder)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Contact page (form, no backend submit yet)

**Files:** Create `src/pages/contact.astro`, `src/pages/api/contact.ts`

- [ ] **Step 1: `src/pages/contact.astro`**

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
import Button from '../components/ui/Button.astro';
const error = Astro.url.searchParams.get('error');
const sent = Astro.url.searchParams.get('sent') === '1';
---

<PublicLayout title="Contact">
  <section class="mx-auto max-w-xl px-4 py-16 sm:px-6">
    <h1 class="font-display mb-3 text-4xl font-light">Get in touch</h1>
    <p class="text-navy/70 mb-6">Questions, feedback, or anything else — we read every message.</p>
    {
      sent && (
        <p class="bg-champagne/20 border-champagne/40 mb-4 border p-3 text-sm">
          Thanks. We'll be in touch within a day.
        </p>
      )
    }
    {error && <p class="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form action="/api/contact" method="post" class="space-y-4">
      <div>
        <label class="mb-1 block text-xs tracking-widest uppercase" for="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxlength="80"
          class="border-navy/20 w-full border bg-white px-3 py-2"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs tracking-widest uppercase" for="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          class="border-navy/20 w-full border bg-white px-3 py-2"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs tracking-widest uppercase" for="message">Message</label>
        <textarea
          id="message"
          name="message"
          required
          rows="5"
          maxlength="2000"
          class="border-navy/20 w-full border bg-white px-3 py-2"></textarea>
      </div>
      <Button type="submit" variant="primary">Send</Button>
    </form>
  </section>
</PublicLayout>
```

- [ ] **Step 2: `src/pages/api/contact.ts`**

Writes the message to a Supabase table for the admin to read manually. Create migration first:

`supabase/migrations/20260524000001_contact_messages.sql`:

```sql
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "contact_messages: anyone inserts" on public.contact_messages for insert with check (true);
create policy "contact_messages: admin reads/updates" on public.contact_messages
  for all using (public.current_role() = 'admin');
```

Run: `npx supabase db push`. Regenerate types: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`.

`src/pages/api/contact.ts`:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../lib/supabase/server';

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  message: z.string().trim().min(1).max(2000),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return redirect(`/contact?error=${encodeURIComponent('Please fill all fields')}`, 303);
  const supabase = serverClient(cookies);
  const { error } = await supabase.from('contact_messages').insert(parsed.data);
  if (error) return redirect(`/contact?error=${encodeURIComponent('Something went wrong')}`, 303);
  return redirect('/contact?sent=1', 303);
};
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(contact): /contact form posting to contact_messages table

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Policy pages

**Files:** Create `src/components/policy/PolicyPage.astro`; create 4 markdown files in `src/content/policies/`; create 4 pages in `src/pages/policies/`

- [ ] **Step 1: `src/components/policy/PolicyPage.astro`**

```astro
---
interface Props {
  title: string;
  updated?: string;
}
const { title, updated } = Astro.props;
---

<article class="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-20">
  <p class="text-aubergine mb-3 text-xs tracking-[0.3em] uppercase">Policy</p>
  <h1 class="font-display mb-2 text-4xl font-light md:text-5xl">{title}</h1>
  {updated && <p class="text-navy/50 mb-8 text-xs">Last updated: {updated}</p>}
  <div class="prose prose-navy text-navy/80 max-w-none space-y-4 leading-relaxed"><slot /></div>
</article>
```

- [ ] **Step 2: Each policy page**

`src/pages/policies/shipping.astro`:

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import PolicyPage from '../../components/policy/PolicyPage.astro';
---

<PublicLayout title="Shipping & delivery">
  <PolicyPage title="Shipping & delivery" updated="2026-05-24">
    <h2 class="font-display text-xl">Where we ship</h2>
    <p>
      qayra ships pan-India via reputed couriers. All metro and non-metro PIN codes are serviceable.
    </p>
    <h2 class="font-display mt-6 text-xl">Delivery time</h2>
    <p>
      Metros: 3–5 business days. Non-metros: 5–8 business days. Festive seasons may add 1–2 days.
    </p>
    <h2 class="font-display mt-6 text-xl">Shipping charges</h2>
    <p>
      Free on prepaid orders over ₹499. ₹50 flat fee otherwise. COD orders carry an additional ₹50
      surcharge.
    </p>
    <p class="text-aubergine text-xs tracking-widest uppercase">
      Final policy copy to be confirmed with founder.
    </p>
  </PolicyPage>
</PublicLayout>
```

`src/pages/policies/returns.astro`:

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import PolicyPage from '../../components/policy/PolicyPage.astro';
---

<PublicLayout title="Returns & refunds">
  <PolicyPage title="Returns & refunds" updated="2026-05-24">
    <p>
      Due to the nature of fragrance products, we accept returns only for damaged, defective, or
      wrong items. Initiate within 7 days of delivery.
    </p>
    <h2 class="font-display mt-6 text-xl">How to request</h2>
    <p>
      Sign in, open the order under My Orders, and tap "Request return" with the reason. We'll
      respond within 1 business day.
    </p>
    <h2 class="font-display mt-6 text-xl">Refunds</h2>
    <p>
      Refunds are processed within 7 business days of receiving the returned item, to the original
      payment method.
    </p>
    <p class="text-aubergine text-xs tracking-widest uppercase">
      Final policy copy to be confirmed with founder.
    </p>
  </PolicyPage>
</PublicLayout>
```

`src/pages/policies/privacy.astro`:

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import PolicyPage from '../../components/policy/PolicyPage.astro';
---

<PublicLayout title="Privacy policy">
  <PolicyPage title="Privacy policy" updated="2026-05-24">
    <p>
      We collect your name, email, phone, and shipping address only to fulfil your order. We don't
      sell or share your information with third parties beyond couriers and payment processors
      required for delivery.
    </p>
    <p class="text-aubergine text-xs tracking-widest uppercase">
      Founder to review with legal counsel before launch.
    </p>
  </PolicyPage>
</PublicLayout>
```

`src/pages/policies/terms.astro`:

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import PolicyPage from '../../components/policy/PolicyPage.astro';
---

<PublicLayout title="Terms of service">
  <PolicyPage title="Terms of service" updated="2026-05-24">
    <p>
      By placing an order on qayra.in, you agree to these terms. Orders are subject to product
      availability. We reserve the right to cancel or refuse orders at our discretion.
    </p>
    <p class="text-aubergine text-xs tracking-widest uppercase">
      Founder to review with legal counsel before launch.
    </p>
  </PolicyPage>
</PublicLayout>
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(policies): shipping/returns/privacy/terms pages with placeholder copy

Final copy pending founder + legal review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Error pages

**Files:** Create `src/pages/404.astro`, `src/pages/500.astro`

- [ ] **Step 1: `src/pages/404.astro`**

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
import Button from '../components/ui/Button.astro';
---

<PublicLayout title="Not found">
  <section class="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
    <p class="font-display text-aubergine mb-4 text-8xl">404</p>
    <p class="font-display mb-2 text-2xl">This scent doesn't exist.</p>
    <p class="text-navy/70 mb-8">The page you're looking for isn't here.</p>
    <Button variant="primary" href="/scents">Browse our scents</Button>
  </section>
</PublicLayout>
```

- [ ] **Step 2: `src/pages/500.astro`**

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
import Button from '../components/ui/Button.astro';
---

<PublicLayout title="Something broke">
  <section class="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
    <p class="font-display text-aubergine mb-4 text-8xl">500</p>
    <p class="font-display mb-2 text-2xl">Something on our side broke.</p>
    <p class="text-navy/70 mb-8">Try again in a moment — and please tell us if it persists.</p>
    <Button variant="primary" href="/">Back home</Button>
  </section>
</PublicLayout>
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(errors): 404 and 500 pages

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: E2E coverage for storefront

**Files:** Create `tests/e2e/storefront.spec.ts`

- [ ] **Step 1: Tests**

```ts
import { test, expect } from '@playwright/test';

test.describe('storefront public pages', () => {
  test('home renders 4 scent cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /quiet scents/i })).toBeVisible();
    const cards = page.locator('main a[href^="/scent/"]');
    await expect(cards).toHaveCount(4);
  });

  test('collection page lists all 4 scents', async ({ page }) => {
    await page.goto('/scents');
    const cards = page.locator('main a[href^="/scent/"]');
    await expect(cards).toHaveCount(4);
  });

  test('each PDP renders with name, switcher, sticky buy bar', async ({ page }) => {
    for (const slug of ['azeziya', 'velvet-midnight', 'blue-lotus-mist', 'imperial-musk']) {
      await page.goto(`/scent/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/choose scent/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /add to bag/i })).toBeVisible();
    }
  });

  test('unknown scent slug 404s', async ({ page }) => {
    const r = await page.goto('/scent/does-not-exist');
    expect(r?.status()).toBeGreaterThanOrEqual(400);
  });

  test('story, contact, policy pages render', async ({ page }) => {
    for (const url of [
      '/story',
      '/contact',
      '/policies/shipping',
      '/policies/returns',
      '/policies/privacy',
      '/policies/terms',
    ]) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('contact form submission persists message', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel(/name/i).fill('E2E Bot');
    await page.getByLabel(/email/i).fill('e2e@qayra.test');
    await page.getByLabel(/message/i).fill('test message');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page).toHaveURL(/contact\?sent=1/);
  });
});
```

- [ ] **Step 2: Run**

```powershell
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "test(e2e): storefront pages, PDP, contact form

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Acceptance criteria — end of Week 2

- [ ] Home page renders with hero, banner, 4 scent cards, reviews block, footer.
- [ ] `/scents` lists all 4 scents.
- [ ] Each of `/scent/azeziya`, `/scent/velvet-midnight`, `/scent/blue-lotus-mist`, `/scent/imperial-musk` renders with switcher, notes, sticky buy bar.
- [ ] `/bundles/starter-set` renders with 4 included scents.
- [ ] `/story`, `/contact`, `/policies/*`, `/404`, `/500` all render.
- [ ] Contact form persists rows to `contact_messages`.
- [ ] `npm run test:unit` + `npm run test:e2e` pass.
- [ ] `npx astro check` 0 errors.
- [ ] CI green.

## What we did NOT do in Week 2

- Cart drawer / cart state — Week 3
- Real checkout flow — Week 3
- Cross-sell on PDP, reviews on PDP, banner CMS rendering on home (full) — Week 9
- Animations (hero stagger, card hover scale beyond CSS, scroll reveals) — Week 10
- Real product photos — depends on Week 4 photoshoot
- Story page final copy + photography — Week 10
