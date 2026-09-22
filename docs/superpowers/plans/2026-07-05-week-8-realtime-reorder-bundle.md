# Week 8 — Realtime, Reorder, Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Wire Supabase Realtime so admin/ops dashboards reflect new orders without refresh; polish the reorder button (built in Week 4) with toast + inline cart preview; ship the full bundle PDP (add-to-cart, discount math, "saves ₹X" badge).

**Architecture:** Realtime via `@supabase/supabase-js` browser client subscribing to `orders` INSERT/UPDATE events. A small client-side island (Astro `client:load`) on the admin sidebar shows the live "New orders today" badge. Bundle add-to-cart inserts a `cart_items` row with `bundle_id` set; pricing already handles this from Week 3.

**Tech Stack:** Astro 4 (islands for live components) · Supabase Realtime · Zod

**Spec reference:** §§ 7.3, 8, 9, 12

---

## File structure

```
src/
├── components/
│   ├── live/
│   │   ├── NewOrdersBadge.tsx           # React island for admin/ops
│   │   └── ToastHost.astro              # passive toast container
│   ├── product/
│   │   └── BundleAddToCart.astro
│   └── cart/
│       └── ReorderToast.astro
├── lib/
│   ├── realtime.ts                      # subscribeToNewOrders()
│   └── bundle-pricing.ts                # itemwiseTotal, bundleSavings
└── pages/
    └── api/cart/
        └── add-bundle.ts                # explicit endpoint (vs scent variant)
```

Note: We add React only for the live badge — minimal cost since Astro keeps it as a tiny island.

---

## Task 1: Add React integration

- [ ] `npx astro add react --yes` — accepts installing `@astrojs/react`, `react`, `react-dom`, `@types/react*`.

- [ ] Verify dev server still starts cleanly.

- [ ] **Commit.**

---

## Task 2: Realtime helper + new-orders count

- [ ] **`src/lib/realtime.ts`** (browser only)

```ts
import { browserClient } from './supabase/client';

export type OrderEvent = { id: string; code: string; status: string; total: number };

export function subscribeToNewOrders(onChange: (e: OrderEvent, kind: 'insert'|'update') => void) {
  const supabase = browserClient();
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        payload => onChange(payload.new as any, 'insert'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        payload => onChange(payload.new as any, 'update'))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
```

- [ ] **Supabase dashboard step**: enable Realtime on the `orders` table. Database → Replication → toggle `orders` on.

- [ ] **Commit.**

---

## Task 3: New-orders badge in admin sidebar (live)

- [ ] **`src/components/live/NewOrdersBadge.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { subscribeToNewOrders } from '../../lib/realtime';

export default function NewOrdersBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    return subscribeToNewOrders((_evt, kind) => {
      if (kind === 'insert') setCount(c => c + 1);
    });
  }, []);
  if (count === 0) return null;
  return (
    <span className="ml-2 bg-champagne text-near-black text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
      {count}
    </span>
  );
}
```

- [ ] **Wire it into `AdminSidebar.astro`** (Week 5):

In the "Orders" line:
```astro
import NewOrdersBadge from '../live/NewOrdersBadge';
import { supabaseAdmin } from '../../lib/supabase/admin';

const since = new Date(new Date().toDateString()).toISOString();
const { count: ordersToday } = await supabaseAdmin
  .from('orders').select('id', { count: 'exact', head: true })
  .gte('created_at', since)
  .in('status', ['paid','packed','shipped','delivered']);
```
Then in the JSX where `Orders` link is rendered:
```astro
<a href="/admin/orders" class:list={[...]}>
  Orders <NewOrdersBadge client:load initial={ordersToday ?? 0} />
</a>
```

- [ ] **Do the same for ops topbar** — the queue count number should react to inserts.

- [ ] **Commit.**

---

## Task 4: Bundle pricing helpers (TDD)

- [ ] **`tests/unit/bundle-pricing.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { bundleSavings } from '../../src/lib/bundle-pricing';

describe('bundleSavings', () => {
  it('returns 0 if bundle priced at or above sum of items', () => {
    expect(bundleSavings(140000, [{ price: 34900, quantity: 1 }, { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 }])).toBe(0);
  });
  it('returns positive saving when bundle priced below sum', () => {
    expect(bundleSavings(99900, [{ price: 34900, quantity: 1 }, { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 }])).toBe(39700);
  });
});
```

- [ ] **`src/lib/bundle-pricing.ts`**

```ts
export function itemwiseTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}
export function bundleSavings(bundlePrice: number, items: { price: number; quantity: number }[]): number {
  return Math.max(0, itemwiseTotal(items) - bundlePrice);
}
```

Run tests → PASS.

- [ ] **Commit.**

---

## Task 5: Bundle PDP — full add-to-cart + savings UI

- [ ] **Replace** placeholder `src/pages/bundles/[slug].astro` with full version:

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import { serverClient } from '../../lib/supabase/server';
import { formatINR } from '../../lib/format';
import { bundleSavings, itemwiseTotal } from '../../lib/bundle-pricing';

const { slug } = Astro.params;
const supabase = serverClient(Astro.cookies);
const { data: bundle } = await supabase
  .from('bundles')
  .select('id, slug, name, description, price, image_url, bundle_items(quantity, scent:scents(slug, name, image_urls, products(base_price)))')
  .eq('slug', slug!)
  .eq('status', 'active')
  .maybeSingle();
if (!bundle) return Astro.redirect('/404', 302);

const items = (bundle.bundle_items as any[]).map(bi => ({
  slug: bi.scent.slug, name: bi.scent.name, image: bi.scent.image_urls?.[0] ?? null,
  price: bi.scent.products.base_price, quantity: bi.quantity,
}));
const fullPrice = itemwiseTotal(items);
const savings   = bundleSavings(bundle.price, items);
---
<PublicLayout title={bundle.name} description={bundle.description ?? undefined}>
  <section class="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 grid md:grid-cols-2 gap-10">
    <div class="aspect-square bg-gradient-to-br from-champagne via-aubergine to-near-black"></div>
    <div>
      <p class="text-xs uppercase tracking-[0.3em] text-aubergine mb-2">Bundle</p>
      <h1 class="font-display text-4xl font-light mb-3">{bundle.name}</h1>
      <div class="flex items-baseline gap-3 mb-4">
        <span class="text-2xl font-medium">{formatINR(bundle.price)}</span>
        {savings > 0 && <span class="line-through text-navy/40">{formatINR(fullPrice)}</span>}
        {savings > 0 && <span class="bg-champagne text-near-black text-xs uppercase tracking-widest px-2 py-0.5">Save {formatINR(savings)}</span>}
      </div>
      {bundle.description && <p class="text-navy/80 mb-6">{bundle.description}</p>}
      <p class="text-xs uppercase tracking-widest text-navy/60 mb-2">Includes</p>
      <ul class="mb-8 text-navy/80 text-sm space-y-2">
        {items.map(it => (
          <li class="flex items-center gap-3">
            <div class="w-10 h-10 bg-aubergine/30 flex-shrink-0">{it.image && <img src={it.image} alt="" class="w-full h-full object-cover" />}</div>
            <span class="flex-1">{it.name} × {it.quantity}</span>
            <span class="text-navy/50 text-xs">{formatINR(it.price)}</span>
          </li>
        ))}
      </ul>
      <button type="button" data-add-bundle data-bundle-id={bundle.id}
              class="bg-navy text-cream px-6 py-3 text-xs uppercase tracking-widest w-full md:w-auto">
        Add bundle to bag
      </button>
    </div>
  </section>
</PublicLayout>
<script>
  document.querySelector('[data-add-bundle]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const id = btn.dataset.bundleId;
    const r = await fetch('/api/cart/add', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bundle_id: id, quantity: 1 }) });
    if (!r.ok) return;
    btn.textContent = 'Added ✓';
    const counter = document.querySelector('[data-bag-count]');
    if (counter) counter.textContent = String(parseInt(counter.textContent || '0') + 1);
    setTimeout(() => { btn.textContent = 'Add bundle to bag'; }, 1200);
  });
</script>
```

- [ ] **Commit.**

---

## Task 6: Reorder polish — toast + cart redirect

In Week 4 reorder simply redirected to `/cart`. Now show a toast on `/cart`:

- [ ] **`/api/account/reorder.ts`** — modify redirect to `/cart?reordered=1`.

- [ ] **`src/pages/cart.astro`** — read `reordered` query, render a top banner: "Your items are back in the bag — review and check out."

- [ ] **Commit.**

---

## Acceptance criteria — end of Week 8

- [ ] React island integration added; bundle and storefront sizes still pass Lighthouse.
- [ ] New orders inserted via the storefront cause the admin sidebar badge + ops queue counter to update without refresh.
- [ ] Realtime is enabled on `orders` in Supabase dashboard.
- [ ] Bundle PDP shows savings, itemwise total, full bundle composition.
- [ ] "Add bundle to bag" inserts a `cart_items` row with `bundle_id`; cart page displays it.
- [ ] Bundle in cart → checkout → order_items row with `bundle_id` set.
- [ ] Reorder produces a banner on `/cart`.
- [ ] All tests pass; CI green.

## What we did NOT do in Week 8

- Realtime for shipments / returns — out of scope for v1
- Cross-sell / reviews on PDP / banner CMS rendering — Week 9
