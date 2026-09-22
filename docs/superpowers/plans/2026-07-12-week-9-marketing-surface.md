# Week 9 — Marketing Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Make the marketing CRUD built in Week 5 _actually show up_ on the storefront — discount codes at checkout, auto-offer evaluator at cart, banner CMS rendering on home, cross-sell + reviews on PDP, low-stock badges, settings-driven shipping rates.

**Architecture:** Add a server-side offer evaluator that turns `offers.rule_json` rows into pricing adjustments. Reviews submission form on PDP. Cross-sell widget queries "other active scents" for v1 (no purchase-pattern data yet). Banner row with `position='hero'` overrides the homepage hero image/headline.

**Tech Stack:** Astro 4 · Supabase · Zod

**Spec reference:** §§ 7.1, 7.2, 12

---

## File structure

```
src/
├── components/
│   ├── product/
│   │   ├── ReviewForm.astro
│   │   ├── ReviewList.astro
│   │   ├── CrossSellRow.astro
│   │   └── LowStockBadge.astro
│   └── home/
│       └── HeroFromBanner.astro
├── lib/
│   ├── offers.ts                 # evaluateOffers(input) → discounts/free shipping
│   ├── reviews.ts                # listForScent, aggregateForScent
│   └── settings.ts               # readSetting<T>(key)
└── pages/api/
    ├── reviews/create.ts
    └── checkout/apply-code.ts
```

---

## Task 1: Settings reader + use it for shipping

- [ ] **`src/lib/settings.ts`**

```ts
import { serverClient } from './supabase/server';
import type { AstroCookies } from 'astro';

export async function readSetting<T>(cookies: AstroCookies, key: string, fallback: T): Promise<T> {
  const supabase = serverClient(cookies);
  const { data } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data?.value as T) ?? fallback;
}
```

- [ ] **Update `src/lib/pricing.ts`** to accept settings rather than hardcoded thresholds:

```ts
export function computeTotals(input: {
  lines: { price: number; quantity: number }[];
  paymentMethod: 'prepaid' | 'cod';
  discountPaise: number;
  freeShippingPaise: number; // new
  flatShippingPaise: number; // new
  codSurchargePaise: number; // new
}) {
  /* same math, parameterised */
}
```

Update callers (`/cart`, `/checkout/*`) to pass values from `readSetting`. Update unit tests accordingly.

- [ ] **Commit.**

---

## Task 2: Auto-offer evaluator

- [ ] **`src/lib/offers.ts`**

```ts
import { serverClient } from './supabase/server';
import type { AstroCookies } from 'astro';

export interface OfferInput {
  lines: { scent_id: string | null; bundle_id: string | null; price: number; quantity: number }[];
  subtotalAfterDiscount: number;
}
export interface OfferResult {
  freeShipping: boolean;
  extraDiscount: number; // paise applied on top
  notes: string[]; // e.g. ["Free shipping unlocked"]
}

export async function evaluateOffers(
  cookies: AstroCookies,
  input: OfferInput,
): Promise<OfferResult> {
  const supabase = serverClient(cookies);
  const { data: offers } = await supabase.from('offers').select('rule_json').eq('active', true);
  let result: OfferResult = { freeShipping: false, extraDiscount: 0, notes: [] };
  for (const o of offers ?? []) {
    const rule = o.rule_json as any;
    if (rule?.kind === 'free_shipping' && input.subtotalAfterDiscount >= rule.min_subtotal) {
      result.freeShipping = true;
      result.notes.push('Free shipping unlocked');
    }
    if (rule?.kind === 'buy_x_get_y_pct') {
      const matching = input.lines.find((l) => l.scent_id === rule.scent_id);
      if (matching && matching.quantity >= rule.min_qty) {
        const extraCount = Math.floor(matching.quantity / rule.min_qty);
        const discountPerExtra = Math.round(matching.price * (rule.pct_off_extra / 100));
        result.extraDiscount += extraCount * discountPerExtra;
        result.notes.push(`Buy-${rule.min_qty} discount applied`);
      }
    }
  }
  return result;
}
```

- [ ] **Wire into cart + checkout** — call `evaluateOffers`, fold `extraDiscount` into pricing's `discountPaise`, override shipping if `freeShipping`.

- [ ] **Surface notes** in cart sidebar and checkout review section.

- [ ] **Commit.**

---

## Task 3: Discount code application at checkout

- [ ] **Add a "Have a code?" field to checkout** that POSTs to `/api/checkout/apply-code` (server validates against `discounts` row, returns `{ discountPaise, code, message }`).

- [ ] **`/api/checkout/apply-code.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { getOrCreateCart, getCartLines } from '../../../lib/cart';

const Body = z.object({ code: z.string().min(1).max(40) });

export const POST: APIRoute = async (ctx) => {
  const body = Body.safeParse(await ctx.request.json());
  if (!body.success) return new Response(JSON.stringify({ error: 'bad code' }), { status: 400 });
  const supabase = serverClient(ctx.cookies);
  const { data: d } = await supabase
    .from('discounts')
    .select('*')
    .eq('code', body.data.code.toUpperCase())
    .maybeSingle();
  if (!d) return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 404 });
  if (d.active_from && new Date(d.active_from) > new Date())
    return new Response(JSON.stringify({ error: 'Not yet active' }), { status: 400 });
  if (d.active_until && new Date(d.active_until) <= new Date())
    return new Response(JSON.stringify({ error: 'Expired' }), { status: 400 });
  if (d.max_uses != null && d.used_count >= d.max_uses)
    return new Response(JSON.stringify({ error: 'Limit reached' }), { status: 400 });

  const cartId = await getOrCreateCart(ctx.cookies, ctx.locals.cartToken);
  const lines = await getCartLines(ctx.cookies, cartId);
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  if (subtotal < (d.min_subtotal ?? 0))
    return new Response(JSON.stringify({ error: 'Subtotal too low' }), { status: 400 });

  const paise = d.type === 'percent' ? Math.round(subtotal * (d.value / 100)) : d.value; // already paise

  return new Response(JSON.stringify({ code: d.code, discountPaise: paise }), { status: 200 });
};
```

- [ ] **Client-side**: on Apply, store `code` + `discountPaise` in a hidden field; recompute displayed totals via small JS; on Place order send the code so server can re-validate + increment `used_count` after successful payment.

- [ ] **Server**: increment `used_count` in `verify.ts` and `cod-place.ts` if a code is on the order; also store the code in `orders.discount_code` (add a column via migration).

- [ ] **Commit.**

---

## Task 4: Reviews on PDP — list + submit form

- [ ] **`src/lib/reviews.ts`**

```ts
import { serverClient } from './supabase/server';
import type { AstroCookies } from 'astro';

export async function listForScent(cookies: AstroCookies, scentId: string) {
  const supabase = serverClient(cookies);
  const { data } = await supabase
    .from('reviews')
    .select('rating, title, body, photo_urls, created_at, profile:profiles(full_name)')
    .eq('scent_id', scentId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function aggregateForScent(cookies: AstroCookies, scentId: string) {
  const supabase = serverClient(cookies);
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('scent_id', scentId)
    .eq('status', 'published');
  const n = (data ?? []).length;
  const avg = n === 0 ? 0 : (data ?? []).reduce((s, r) => s + r.rating, 0) / n;
  return { count: n, average: Math.round(avg * 10) / 10 };
}
```

- [ ] **`ReviewList.astro`** — render reviews; stars + title + body + name + date.

- [ ] **`ReviewForm.astro`** — only renders if `Astro.locals.session` exists AND user has a delivered order for this scent (server-side check). Stars 1–5, title, body, optional photos (Supabase Storage upload). POSTs to `/api/reviews/create`.

- [ ] **`/api/reviews/create.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { serverClient } from '../../../lib/supabase/server';

const Body = z.object({
  scent_id: z.string().uuid(),
  order_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success) return ctx.redirect('/account/reviews?error=Invalid', 303);

  const supabase = serverClient(ctx.cookies);
  const { error } = await supabase.from('reviews').insert({
    ...parsed.data,
    profile_id: result.userId,
    status: 'pending',
  });
  if (error)
    return ctx.redirect(`/account/reviews?error=${encodeURIComponent(error.message)}`, 303);
  return ctx.redirect('/account/reviews?info=Submitted+for+review', 303);
};
```

- [ ] **Wire** `ReviewList` + `ReviewForm` + `aggregateForScent` into `/scent/[slug].astro` (replace the placeholder StarRating).

- [ ] **Commit.**

---

## Task 5: Cross-sell on PDP

- [ ] **`CrossSellRow.astro`** — fetch other active scents (excluding current), show 3 in a horizontal row.

```astro
---
import { serverClient } from '../../lib/supabase/server';
import ScentCard from './ScentCard.astro';
interface Props {
  excludeId: string;
}
const { excludeId } = Astro.props;
const supabase = serverClient(Astro.cookies);
const { data } = await supabase
  .from('scents')
  .select('*, products!inner(base_price, status)')
  .neq('id', excludeId)
  .eq('active', true)
  .eq('products.status', 'active')
  .limit(3);
const scents = (data ?? []).map((r) => ({ ...r, base_price: (r.products as any).base_price }));
---

<section class="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
  <p class="text-navy/60 mb-4 text-xs tracking-[0.3em] uppercase">Pairs well with</p>
  <div class="grid grid-cols-3 gap-3">
    {scents.map((s) => <ScentCard scent={s as any} />)}
  </div>
</section>
```

Add to `/scent/[slug].astro` after the notes section.

- [ ] **Commit.**

---

## Task 6: Low-stock badge on PDP + cart

- [ ] **`LowStockBadge.astro`** — if stock_qty in 1..10, render small "Only N left" gold pill.

- [ ] **Use** in PDP near price and in cart line item.

- [ ] **Commit.**

---

## Task 7: Banner CMS rendering on home

- [ ] **`HeroFromBanner.astro`** — read the active `position='hero'` banner. If present, override the hero with banner's headline + image + CTA. Otherwise, use the default hero from Week 2.

- [ ] **Wire** into `src/pages/index.astro`.

- [ ] **Commit.**

---

## Acceptance criteria — end of Week 9

- [ ] Free-shipping rule from `offers` lifts shipping to 0 at cart and checkout once subtotal ≥ rule's min.
- [ ] Discount codes from `discounts` validate and apply at checkout; `used_count` increments after successful order.
- [ ] PDP shows real review list + avg rating from `reviews` table.
- [ ] Customer with a delivered order for that scent can submit a review.
- [ ] Cross-sell shows 3 other scents on each PDP.
- [ ] Low-stock badge shows when stock_qty ≤ 10.
- [ ] Hero banner created in admin shows up on home page hero.
- [ ] Shipping/COD-surcharge values come from `store_settings`.
- [ ] All tests pass.

## What we did NOT do in Week 9

- Animations / micro-interactions on these surfaces — Week 10
- Accessibility audit — Week 10
- Email-based review prompts — explicitly out of v1 scope
