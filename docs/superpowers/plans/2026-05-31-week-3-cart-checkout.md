# Week 3 — Cart & Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Wire end-to-end commerce — persistent cart (guest + authenticated), `/cart` page + drawer, checkout flow (address → payment → review), Razorpay prepaid + COD with surcharge, order creation, `/checkout/success`.

**Architecture:** Cart state is server-side (Supabase `carts` + `cart_items`). Guests get an opaque `cart_token` cookie; authenticated users get a profile-linked cart. Cart merge on sign-in. Checkout is one Astro page with three accordion sections. Razorpay client-side checkout opens via the `Razorpay` JS SDK; server creates the Razorpay order and verifies the payment signature on callback.

**Tech Stack:** Astro 4 · Supabase · Razorpay (Standard Checkout) · Zod

**Spec reference:** §§ 7.3, 7.4, 12

---

## File structure

```
src/
├── components/
│   ├── cart/
│   │   ├── CartDrawer.astro
│   │   ├── CartLineItem.astro
│   │   ├── CartSummary.astro
│   │   └── BagButton.astro                 # header button + count
│   └── checkout/
│       ├── ContactSection.astro
│       ├── AddressSection.astro
│       ├── PaymentSection.astro
│       └── ReviewSection.astro
├── lib/
│   ├── cart.ts                              # getCart, addLine, updateQty, removeLine, mergeOnSignIn
│   ├── pricing.ts                           # computeTotals (subtotal, discount, shipping, surcharge, total)
│   ├── order-code.ts                        # nextOrderCode (Q-NNNN)
│   └── razorpay.ts                          # server SDK calls + signature verification
├── pages/
│   ├── cart.astro
│   ├── checkout/
│   │   ├── index.astro
│   │   └── success.astro
│   └── api/
│       ├── cart/
│       │   ├── add.ts
│       │   ├── update.ts
│       │   └── remove.ts
│       ├── checkout/
│       │   ├── create-order.ts             # creates Supabase order + Razorpay order, returns rzp_order_id
│       │   ├── verify.ts                   # webhook + client-side verify signature
│       │   └── cod-place.ts                # COD path skipping Razorpay
│       └── webhooks/razorpay.ts            # backup payment-status webhook
└── middleware.ts                            # extended to issue cart_token cookie
```

```
supabase/migrations/
└── 20260531000000_pincodes_and_settings.sql # store-wide settings (shipping rates, surcharge)
```

```
tests/e2e/
├── cart.spec.ts
└── checkout.spec.ts
```

---

## Task 1: Cart token middleware + lib

**Files:** Modify `src/middleware.ts`; create `src/lib/cart.ts`

- [ ] **Step 1: Extend middleware to issue `cart_token`**

In `src/middleware.ts`, before role-check block, add:

```ts
import crypto from 'node:crypto';
const COOKIE = 'qayra_cart';
if (!ctx.cookies.has(COOKIE)) {
  ctx.cookies.set(COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
}
ctx.locals.cartToken = ctx.cookies.get(COOKIE)!.value;
```

Update `src/env.d.ts` Locals interface:

```ts
declare namespace App {
  interface Locals {
    session?: import('./lib/auth/session').Session;
    cartToken: string;
  }
}
```

- [ ] **Step 2: `src/lib/cart.ts`**

```ts
import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';
import { getSession } from './auth/session';

export interface CartLine {
  id: string;
  cart_id: string;
  scent_id: string | null;
  bundle_id: string | null;
  quantity: number;
  name: string;
  price: number; // paise
  image_url: string | null;
}

export async function getOrCreateCart(cookies: AstroCookies, anonToken: string) {
  const supabase = serverClient(cookies);
  const session = await getSession(cookies);

  if (session) {
    // Find or create a profile-linked cart
    let { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('profile_id', session.userId)
      .maybeSingle();
    if (!cart) {
      const ins = await supabase
        .from('carts')
        .insert({ profile_id: session.userId })
        .select('id')
        .single();
      cart = ins.data;
    }
    return cart!.id;
  }
  // Anon cart by token
  let { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('anon_token', anonToken)
    .maybeSingle();
  if (!cart) {
    const ins = await supabase
      .from('carts')
      .insert({ anon_token: anonToken })
      .select('id')
      .single();
    cart = ins.data;
  }
  return cart!.id;
}

export async function getCartLines(cookies: AstroCookies, cartId: string): Promise<CartLine[]> {
  const supabase = serverClient(cookies);
  const { data: items } = await supabase
    .from('cart_items')
    .select(
      'id, cart_id, scent_id, bundle_id, quantity, scent:scents(name, image_urls, products(base_price)), bundle:bundles(name, image_url, price)',
    )
    .eq('cart_id', cartId);
  return (items ?? []).map((row) => {
    if (row.scent_id) {
      const s = row.scent as any;
      return {
        id: row.id,
        cart_id: row.cart_id,
        scent_id: row.scent_id,
        bundle_id: null,
        quantity: row.quantity,
        name: s.name,
        price: s.products.base_price,
        image_url: s.image_urls?.[0] ?? null,
      };
    }
    const b = row.bundle as any;
    return {
      id: row.id,
      cart_id: row.cart_id,
      scent_id: null,
      bundle_id: row.bundle_id,
      quantity: row.quantity,
      name: b.name,
      price: b.price,
      image_url: b.image_url,
    };
  });
}

export async function addLine(
  cookies: AstroCookies,
  cartId: string,
  opts: { scent_id?: string; bundle_id?: string; quantity?: number },
) {
  const qty = opts.quantity ?? 1;
  const supabase = serverClient(cookies);
  // Try to find existing line
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .match(opts.scent_id ? { scent_id: opts.scent_id } : { bundle_id: opts.bundle_id! })
    .maybeSingle();
  if (existing) {
    await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + qty })
      .eq('id', existing.id);
  } else {
    await supabase.from('cart_items').insert({ cart_id: cartId, ...opts, quantity: qty });
  }
}

export async function updateQty(cookies: AstroCookies, lineId: string, quantity: number) {
  const supabase = serverClient(cookies);
  if (quantity <= 0) await supabase.from('cart_items').delete().eq('id', lineId);
  else await supabase.from('cart_items').update({ quantity }).eq('id', lineId);
}

export async function removeLine(cookies: AstroCookies, lineId: string) {
  const supabase = serverClient(cookies);
  await supabase.from('cart_items').delete().eq('id', lineId);
}

export async function mergeOnSignIn(cookies: AstroCookies, anonToken: string, profileId: string) {
  const supabase = serverClient(cookies);
  const { data: anon } = await supabase
    .from('carts')
    .select('id')
    .eq('anon_token', anonToken)
    .maybeSingle();
  const { data: profile } = await supabase
    .from('carts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (!anon) return;
  if (!profile) {
    // Promote anon cart
    await supabase
      .from('carts')
      .update({ profile_id: profileId, anon_token: null })
      .eq('id', anon.id);
    return;
  }
  // Move items from anon → profile, then delete anon
  await supabase.from('cart_items').update({ cart_id: profile.id }).eq('cart_id', anon.id);
  await supabase.from('carts').delete().eq('id', anon.id);
}
```

- [ ] **Step 3: Trigger merge on sign-in**

Modify `src/pages/api/auth/sign-in.ts` and `oauth-google.ts` callback: after a successful sign-in (and inside `/auth/callback.ts` after `exchangeCodeForSession`), call `mergeOnSignIn(cookies, ctx.locals.cartToken, session.userId)`.

For sign-in.ts add after `signInWithPassword`:

```ts
if (!error) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await mergeOnSignIn(cookies, locals.cartToken, user.id);
}
```

(`locals` is on `APIContext`; destructure it in the function signature.)

- [ ] **Step 4: Commit**

```powershell
git add .
git commit -m "feat(cart): cart_token cookie + getCart/addLine/updateQty/mergeOnSignIn

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Pricing helpers (TDD)

**Files:** Create `src/lib/pricing.ts`, `tests/unit/pricing.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeTotals } from '../../src/lib/pricing';

describe('computeTotals', () => {
  it('free shipping at or above ₹499 prepaid', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 2 }],
      paymentMethod: 'prepaid',
      discountPaise: 0,
    });
    expect(t.subtotal).toBe(69800);
    expect(t.shipping).toBe(0);
    expect(t.codSurcharge).toBe(0);
    expect(t.total).toBe(69800);
  });

  it('₹50 shipping below threshold', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 1 }],
      paymentMethod: 'prepaid',
      discountPaise: 0,
    });
    expect(t.shipping).toBe(5000);
    expect(t.total).toBe(39900);
  });

  it('COD adds ₹50 surcharge', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 2 }],
      paymentMethod: 'cod',
      discountPaise: 0,
    });
    expect(t.codSurcharge).toBe(5000);
    expect(t.total).toBe(74800);
  });

  it('subtracts discount, never below 0', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 1 }],
      paymentMethod: 'prepaid',
      discountPaise: 100000,
    });
    expect(t.total).toBe(0);
  });
});
```

- [ ] **Step 2: Implement**

```ts
export interface PricingInput {
  lines: { price: number; quantity: number }[];
  paymentMethod: 'prepaid' | 'cod';
  discountPaise: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  shipping: number;
  codSurcharge: number;
  total: number;
}

const FREE_SHIPPING_THRESHOLD = 49900;
const FLAT_SHIPPING = 5000;
const COD_SURCHARGE = 5000;

export function computeTotals(input: PricingInput): PricingResult {
  const subtotal = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.min(input.discountPaise, subtotal);
  const afterDiscount = subtotal - discount;
  const shipping =
    afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : afterDiscount === 0 ? 0 : FLAT_SHIPPING;
  const codSurcharge = input.paymentMethod === 'cod' ? COD_SURCHARGE : 0;
  return {
    subtotal,
    discount,
    shipping,
    codSurcharge,
    total: afterDiscount + shipping + codSurcharge,
  };
}
```

Run tests, PASS.

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(pricing): computeTotals with free-shipping threshold + COD surcharge

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Cart UI (drawer + /cart page)

**Files:** Create `src/components/cart/CartDrawer.astro`, `CartLineItem.astro`, `CartSummary.astro`, `BagButton.astro`; create `src/pages/cart.astro`

- [ ] **Step 1: `CartLineItem.astro`**

```astro
---
import { formatINR } from '../../lib/format';
import type { CartLine } from '../../lib/cart';
interface Props {
  line: CartLine;
}
const { line } = Astro.props;
---

<div class="border-navy/10 flex gap-3 border-b py-4" data-line-id={line.id}>
  <div class="bg-aubergine/20 h-20 w-20 flex-shrink-0">
    {
      line.image_url ? (
        <img src={line.image_url} alt={line.name} class="h-full w-full object-cover" />
      ) : (
        <div class="from-aubergine to-navy h-full w-full bg-gradient-to-br" />
      )
    }
  </div>
  <div class="min-w-0 flex-1">
    <p class="font-display text-base">{line.name}</p>
    <p class="text-navy/60 text-xs">{formatINR(line.price)}</p>
    <div class="mt-2 flex items-center gap-2 text-xs">
      <button data-qty-dec class="border-navy/30 h-7 w-7 border">−</button>
      <span data-qty class="min-w-[1.5rem] text-center">{line.quantity}</span>
      <button data-qty-inc class="border-navy/30 h-7 w-7 border">+</button>
      <button data-remove class="text-navy/60 hover:text-navy ml-3 underline">Remove</button>
    </div>
  </div>
  <p class="font-medium" data-line-total>{formatINR(line.price * line.quantity)}</p>
</div>
```

- [ ] **Step 2: `CartSummary.astro`**

```astro
---
import { formatINR } from '../../lib/format';
import type { PricingResult } from '../../lib/pricing';
interface Props {
  totals: PricingResult;
  cta: string;
  href: string;
}
const { totals, cta, href } = Astro.props;
const remaining = Math.max(0, 49900 - (totals.subtotal - totals.discount));
---

<div class="space-y-2 text-sm">
  <div class="flex justify-between">
    <span>Subtotal</span><span>{formatINR(totals.subtotal)}</span>
  </div>
  {
    totals.discount > 0 && (
      <div class="text-aubergine flex justify-between">
        <>
          <span>Discount</span>
          <span>−{formatINR(totals.discount)}</span>
        </>
      </div>
    )
  }
  <div class="flex justify-between">
    <span>Shipping</span><span>{totals.shipping === 0 ? 'Free' : formatINR(totals.shipping)}</span>
  </div>
  {
    totals.codSurcharge > 0 && (
      <div class="flex justify-between">
        <>
          <span>COD surcharge</span>
          <span>{formatINR(totals.codSurcharge)}</span>
        </>
      </div>
    )
  }
  <div class="border-navy/20 mt-2 flex justify-between border-t pt-2 text-base font-medium">
    <span>Total</span><span>{formatINR(totals.total)}</span>
  </div>
  {
    remaining > 0 && (
      <p class="text-aubergine text-xs">Add {formatINR(remaining)} more for free shipping</p>
    )
  }
  <a
    href={href}
    class="bg-navy text-cream mt-4 block py-3 text-center text-xs tracking-widest uppercase"
    >{cta}</a
  >
</div>
```

- [ ] **Step 3: `src/pages/cart.astro`**

```astro
---
import PublicLayout from '../layouts/PublicLayout.astro';
import CartLineItem from '../components/cart/CartLineItem.astro';
import CartSummary from '../components/cart/CartSummary.astro';
import { getOrCreateCart, getCartLines } from '../lib/cart';
import { computeTotals } from '../lib/pricing';

const cartId = await getOrCreateCart(Astro.cookies, Astro.locals.cartToken);
const lines = await getCartLines(Astro.cookies, cartId);
const totals = computeTotals({
  lines: lines.map((l) => ({ price: l.price, quantity: l.quantity })),
  paymentMethod: 'prepaid',
  discountPaise: 0,
});
---

<PublicLayout title="Your bag">
  <section class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <h1 class="font-display mb-8 text-4xl font-light">Your bag</h1>
    {
      lines.length === 0 ? (
        <div class="py-16 text-center">
          <p class="text-navy/70 mb-6">Your bag is empty.</p>
          <a
            href="/scents"
            class="bg-navy text-cream inline-block px-6 py-3 text-xs tracking-widest uppercase"
          >
            Shop scents
          </a>
        </div>
      ) : (
        <div class="grid gap-10 md:grid-cols-3">
          <div class="md:col-span-2">
            {lines.map((l) => (
              <CartLineItem line={l} />
            ))}
          </div>
          <aside class="border-navy/10 self-start border bg-white p-5 md:sticky md:top-24">
            <CartSummary totals={totals} cta="Checkout" href="/checkout" />
          </aside>
        </div>
      )
    }
  </section>
</PublicLayout>
<script>
  document.querySelectorAll('[data-line-id]').forEach((el) => {
    const id = (el as HTMLElement).dataset.lineId!;
    const qtyEl = el.querySelector('[data-qty]')!;
    const refresh = async (quantity: number) => {
      const r = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, quantity }),
      });
      if (r.ok) location.reload();
    };
    el.querySelector('[data-qty-dec]')?.addEventListener('click', () =>
      refresh(Math.max(0, parseInt(qtyEl.textContent!) - 1)),
    );
    el.querySelector('[data-qty-inc]')?.addEventListener('click', () =>
      refresh(parseInt(qtyEl.textContent!) + 1),
    );
    el.querySelector('[data-remove]')?.addEventListener('click', () => refresh(0));
  });
</script>
```

- [ ] **Step 4: Cart API endpoints**

`src/pages/api/cart/add.ts`:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { addLine, getOrCreateCart } from '../../../lib/cart';

const Body = z
  .object({
    scent_id: z.string().uuid().optional(),
    bundle_id: z.string().uuid().optional(),
    quantity: z.number().int().positive().max(50).default(1),
  })
  .refine((v) => !!v.scent_id !== !!v.bundle_id, 'one of scent_id/bundle_id');

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const body = Body.safeParse(await request.json());
  if (!body.success)
    return new Response(JSON.stringify({ error: body.error.issues }), { status: 400 });
  const cartId = await getOrCreateCart(cookies, locals.cartToken);
  await addLine(cookies, cartId, body.data);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

`src/pages/api/cart/update.ts`:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { updateQty } from '../../../lib/cart';

const Body = z.object({ id: z.string().uuid(), quantity: z.number().int().min(0).max(50) });

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = Body.safeParse(await request.json());
  if (!body.success) return new Response('bad request', { status: 400 });
  await updateQty(cookies, body.data.id, body.data.quantity);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

`src/pages/api/cart/remove.ts`:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { removeLine } from '../../../lib/cart';

const Body = z.object({ id: z.string().uuid() });

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = Body.safeParse(await request.json());
  if (!body.success) return new Response('bad request', { status: 400 });
  await removeLine(cookies, body.data.id);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 5: Wire the PDP "Add to bag" button**

Update `src/components/product/StickyBuyBar.astro` `<script>`:

```ts
document.querySelectorAll('[data-add-to-bag]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const scent_id = (btn as HTMLElement).dataset.scentId;
    const r = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scent_id, quantity: 1 }),
    });
    if (!r.ok) return;
    btn.textContent = 'Added ✓';
    // Update header bag count by hitting /cart but cheap path: just bump it
    const counter = document.querySelector('[data-bag-count]');
    if (counter) counter.textContent = String(parseInt(counter.textContent || '0') + 1);
    setTimeout(() => {
      btn.textContent = 'Add to bag';
    }, 1200);
  });
});
```

Update `SiteHeader.astro` to compute initial bag count server-side: import `getOrCreateCart` + `getCartLines`, sum quantities, render in the badge.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(cart): /cart page, line item UI, add/update/remove API, PDP wiring

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Razorpay server SDK + order code generator

**Files:** Create `src/lib/razorpay.ts`, `src/lib/order-code.ts`

- [ ] **Step 1: Install SDK**

```powershell
npm install razorpay
```

- [ ] **Step 2: Add env vars**

Update `src/lib/env.ts` schema:

```ts
RAZORPAY_KEY_ID: z.string().min(1),
RAZORPAY_KEY_SECRET: z.string().min(1),
PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
```

Add same keys to `.env.example` and `.env` (use test-mode keys from Razorpay dashboard).

- [ ] **Step 3: `src/lib/razorpay.ts`**

```ts
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { env } from './env';

export const rzp = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export interface CreateRzpOrderInput {
  amountPaise: number;
  receipt: string;
}

export async function createRzpOrder(input: CreateRzpOrderInput) {
  return await rzp.orders.create({
    amount: input.amountPaise,
    currency: 'INR',
    receipt: input.receipt,
    payment_capture: true,
  });
}

export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

- [ ] **Step 4: `src/lib/order-code.ts`**

```ts
import { serverClient } from './supabase/server';
import type { AstroCookies } from 'astro';

// Q-NNNN, monotonically increasing across the table.
export async function nextOrderCode(cookies: AstroCookies): Promise<string> {
  const supabase = serverClient(cookies);
  // Service-role bypass would be cleaner; this is good enough for v1.
  const { data } = await supabase
    .from('orders')
    .select('code')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = data?.code?.replace(/^Q-/, '') ?? '0';
  const n = parseInt(last, 10) + 1;
  return `Q-${String(n).padStart(4, '0')}`;
}
```

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(razorpay): server SDK wrapper + Q-NNNN order code generator

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Checkout page (UI)

**Files:** Create `src/pages/checkout/index.astro`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import CartSummary from '../../components/cart/CartSummary.astro';
import { getOrCreateCart, getCartLines } from '../../lib/cart';
import { computeTotals } from '../../lib/pricing';
import { getSession } from '../../lib/auth/session';
import { formatINR } from '../../lib/format';
import { env } from '../../lib/env';

const session = await getSession(Astro.cookies);
const cartId = await getOrCreateCart(Astro.cookies, Astro.locals.cartToken);
const lines = await getCartLines(Astro.cookies, cartId);
if (lines.length === 0) return Astro.redirect('/cart', 302);

const totalsPrepaid = computeTotals({
  lines: lines.map((l) => ({ price: l.price, quantity: l.quantity })),
  paymentMethod: 'prepaid',
  discountPaise: 0,
});
const totalsCod = computeTotals({
  lines: lines.map((l) => ({ price: l.price, quantity: l.quantity })),
  paymentMethod: 'cod',
  discountPaise: 0,
});
---

<PublicLayout title="Checkout">
  <section class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <h1 class="font-display mb-8 text-3xl font-light">Checkout</h1>

    <form id="checkout-form" class="space-y-8">
      <!-- Contact -->
      <fieldset class="border-navy/10 border bg-white p-5">
        <legend class="text-navy/60 px-2 text-xs tracking-widest uppercase">Contact</legend>
        <div class="mt-2 grid gap-4 md:grid-cols-2">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            value={session?.email ?? ''}
            class="border-navy/20 border px-3 py-2"
          />
          <input
            name="phone"
            type="tel"
            required
            placeholder="Phone (10 digits)"
            pattern="[0-9]{10}"
            class="border-navy/20 border px-3 py-2"
          />
        </div>
      </fieldset>

      <!-- Address -->
      <fieldset class="border-navy/10 border bg-white p-5">
        <legend class="text-navy/60 px-2 text-xs tracking-widest uppercase">Shipping address</legend
        >
        <div class="mt-2 grid gap-4 md:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Full name"
            class="border-navy/20 border px-3 py-2 md:col-span-2"
          />
          <input
            name="line1"
            required
            placeholder="Address line 1"
            class="border-navy/20 border px-3 py-2 md:col-span-2"
          />
          <input
            name="line2"
            placeholder="Address line 2"
            class="border-navy/20 border px-3 py-2 md:col-span-2"
          />
          <input name="city" required placeholder="City" class="border-navy/20 border px-3 py-2" />
          <input
            name="state"
            required
            placeholder="State"
            class="border-navy/20 border px-3 py-2"
          />
          <input
            name="pincode"
            required
            placeholder="PIN code"
            pattern="[0-9]{6}"
            class="border-navy/20 border px-3 py-2"
          />
        </div>
      </fieldset>

      <!-- Payment -->
      <fieldset class="border-navy/10 border bg-white p-5">
        <legend class="text-navy/60 px-2 text-xs tracking-widest uppercase">Payment</legend>
        <label class="border-navy/20 mt-2 flex cursor-pointer items-start gap-3 border p-3">
          <input type="radio" name="payment_method" value="prepaid" checked />
          <div>
            <p class="font-medium">Prepaid (UPI / Cards / Net Banking)</p>
            <p class="text-navy/60 text-xs">Total: {formatINR(totalsPrepaid.total)}</p>
          </div>
        </label>
        <label class="border-navy/20 mt-2 flex cursor-pointer items-start gap-3 border p-3">
          <input type="radio" name="payment_method" value="cod" />
          <div>
            <p class="font-medium">Cash on Delivery (+{formatINR(5000)} surcharge)</p>
            <p class="text-navy/60 text-xs">Total: {formatINR(totalsCod.total)}</p>
          </div>
        </label>
      </fieldset>

      <button
        type="submit"
        class="bg-navy text-cream w-full py-4 text-xs font-semibold tracking-widest uppercase"
        >Place order</button
      >
      <p id="checkout-error" class="hidden text-center text-sm text-red-700"></p>
    </form>
  </section>
</PublicLayout>

<script define:vars={{ rzpKey: env.PUBLIC_RAZORPAY_KEY_ID }}>
  const form = document.getElementById('checkout-form');
  const errEl = document.getElementById('checkout-error');
  const showErr = (m) => {
    errEl.textContent = m;
    errEl.classList.remove('hidden');
  };

  function loadRzp() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve();
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve();
      document.body.appendChild(s);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd);
    if (payload.payment_method === 'cod') {
      const r = await fetch('/api/checkout/cod-place', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return showErr('Could not place order');
      const j = await r.json();
      window.location.href = `/checkout/success?code=${j.code}`;
      return;
    }
    // Prepaid
    const create = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!create.ok) return showErr('Could not create order');
    const { rzp_order_id, order_id, amount, code, contact } = await create.json();
    await loadRzp();
    const rzp = new window.Razorpay({
      key: rzpKey,
      order_id: rzp_order_id,
      amount,
      currency: 'INR',
      name: 'qayra',
      prefill: { email: contact.email, contact: contact.phone, name: contact.name },
      theme: { color: '#231840' },
      handler: async (resp) => {
        const v = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ order_id, ...resp }),
        });
        if (!v.ok) return showErr('Payment verification failed');
        window.location.href = `/checkout/success?code=${code}`;
      },
      modal: { ondismiss: () => showErr('Payment cancelled') },
    });
    rzp.open();
  });
</script>
```

- [ ] **Step 2: Commit**

```powershell
git add .
git commit -m "feat(checkout): /checkout page with contact, address, payment sections

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Checkout API — create-order, verify, cod-place

**Files:** Create `src/pages/api/checkout/create-order.ts`, `verify.ts`, `cod-place.ts`

- [ ] **Step 1: Shared helper to validate + create the Supabase order**

Create `src/lib/checkout.ts`:

```ts
import type { AstroCookies } from 'astro';
import { z } from 'zod';
import { serverClient } from './supabase/server';
import { getOrCreateCart, getCartLines } from './cart';
import { computeTotals } from './pricing';
import { nextOrderCode } from './order-code';
import { getSession } from './auth/session';

export const CheckoutInput = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{10}$/),
  name: z.string().min(1).max(80),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pincode: z.string().regex(/^[0-9]{6}$/),
  payment_method: z.enum(['prepaid', 'cod']),
});
export type CheckoutPayload = z.infer<typeof CheckoutInput>;

export async function buildPendingOrder(
  cookies: AstroCookies,
  anonToken: string,
  payload: CheckoutPayload,
) {
  const supabase = serverClient(cookies);
  const session = await getSession(cookies);

  // Guest path: auto-create account at order time
  let profileId = session?.userId;
  if (!profileId) {
    // Create magic-link / passwordless account via signup with random password
    const tempPassword = crypto.randomUUID();
    const { data: created, error } = await supabase.auth.signUp({
      email: payload.email,
      password: tempPassword,
      options: { data: { full_name: payload.name } },
    });
    if (error || !created.user) throw new Error('Could not create account: ' + error?.message);
    profileId = created.user.id;
    // Email confirmation goes out automatically — guest can claim later via forgot-password.
  }

  const cartId = await getOrCreateCart(cookies, anonToken);
  const lines = await getCartLines(cookies, cartId);
  if (lines.length === 0) throw new Error('Cart is empty');

  const totals = computeTotals({
    lines: lines.map((l) => ({ price: l.price, quantity: l.quantity })),
    paymentMethod: payload.payment_method,
    discountPaise: 0,
  });

  const code = await nextOrderCode(cookies);

  const address_snapshot = {
    name: payload.name,
    line1: payload.line1,
    line2: payload.line2 ?? null,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    phone: payload.phone,
  };

  const { data: order, error: oerr } = await supabase
    .from('orders')
    .insert({
      code,
      profile_id: profileId,
      status: 'pending',
      payment_method: payload.payment_method,
      payment_status: payload.payment_method === 'cod' ? 'pending' : 'pending',
      subtotal: totals.subtotal,
      discount_total: totals.discount,
      shipping_total: totals.shipping,
      cod_surcharge: totals.codSurcharge,
      total: totals.total,
      address_snapshot,
    })
    .select('id')
    .single();
  if (oerr || !order) throw new Error('Could not create order: ' + oerr?.message);

  await supabase.from('order_items').insert(
    lines.map((l) => ({
      order_id: order.id,
      scent_id: l.scent_id,
      bundle_id: l.bundle_id,
      name_snapshot: l.name,
      price_snapshot: l.price,
      quantity: l.quantity,
    })),
  );

  return { orderId: order.id, code, profileId, totals };
}

export async function emptyCart(cookies: AstroCookies, anonToken: string) {
  const supabase = serverClient(cookies);
  const cartId = await getOrCreateCart(cookies, anonToken);
  await supabase.from('cart_items').delete().eq('cart_id', cartId);
}
```

- [ ] **Step 2: `src/pages/api/checkout/create-order.ts`**

```ts
import type { APIRoute } from 'astro';
import { CheckoutInput, buildPendingOrder } from '../../../lib/checkout';
import { createRzpOrder } from '../../../lib/razorpay';
import { serverClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const body = CheckoutInput.safeParse(await request.json());
  if (!body.success)
    return new Response(JSON.stringify({ error: body.error.issues }), { status: 400 });
  if (body.data.payment_method !== 'prepaid') return new Response('use cod-place', { status: 400 });

  const { orderId, code, totals } = await buildPendingOrder(cookies, locals.cartToken, body.data);
  const rzp = await createRzpOrder({ amountPaise: totals.total, receipt: code });

  const supabase = serverClient(cookies);
  await supabase.from('orders').update({ razorpay_order_id: rzp.id }).eq('id', orderId);

  return new Response(
    JSON.stringify({
      rzp_order_id: rzp.id,
      order_id: orderId,
      amount: totals.total,
      code,
      contact: { email: body.data.email, phone: body.data.phone, name: body.data.name },
    }),
    { status: 200 },
  );
};
```

- [ ] **Step 3: `src/pages/api/checkout/verify.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { verifySignature } from '../../../lib/razorpay';
import { serverClient } from '../../../lib/supabase/server';
import { emptyCart } from '../../../lib/checkout';

const Body = z.object({
  order_id: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const body = Body.safeParse(await request.json());
  if (!body.success) return new Response('bad request', { status: 400 });
  const ok = verifySignature(
    body.data.razorpay_order_id,
    body.data.razorpay_payment_id,
    body.data.razorpay_signature,
  );
  if (!ok) return new Response('invalid signature', { status: 400 });

  const supabase = serverClient(cookies);
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_status: 'paid',
      razorpay_payment_id: body.data.razorpay_payment_id,
    })
    .eq('id', body.data.order_id);

  await supabase.from('order_status_history').insert({
    order_id: body.data.order_id,
    status: 'paid',
    note: 'Razorpay payment verified',
  });

  await emptyCart(cookies, locals.cartToken);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 4: `src/pages/api/checkout/cod-place.ts`**

```ts
import type { APIRoute } from 'astro';
import { CheckoutInput, buildPendingOrder, emptyCart } from '../../../lib/checkout';
import { serverClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const body = CheckoutInput.safeParse(await request.json());
  if (!body.success)
    return new Response(JSON.stringify({ error: body.error.issues }), { status: 400 });
  if (body.data.payment_method !== 'cod') return new Response('use create-order', { status: 400 });

  const { orderId, code } = await buildPendingOrder(cookies, locals.cartToken, body.data);
  const supabase = serverClient(cookies);
  await supabase
    .from('orders')
    .update({ status: 'paid' /* paid = confirmed for COD path */, payment_status: 'pending' })
    .eq('id', orderId);
  await supabase
    .from('order_status_history')
    .insert({ order_id: orderId, status: 'paid', note: 'COD order placed' });
  await emptyCart(cookies, locals.cartToken);
  return new Response(JSON.stringify({ ok: true, code }), { status: 200 });
};
```

- [ ] **Step 5: Razorpay webhook backup**

`src/pages/api/webhooks/razorpay.ts`:

```ts
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { env } from '../../../lib/env';
import { serverClient } from '../../../lib/supabase/server';

const WEBHOOK_SECRET = env.RAZORPAY_KEY_SECRET; // for v1, reuse; in prod set a dedicated webhook secret

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.text();
  const sig = request.headers.get('x-razorpay-signature') ?? '';
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return new Response('invalid', { status: 400 });
  }
  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    const orderId = event.payload.payment.entity.order_id;
    const supabase = serverClient(cookies);
    await supabase
      .from('orders')
      .update({ status: 'paid', payment_status: 'paid' })
      .eq('razorpay_order_id', orderId);
  }
  return new Response('ok', { status: 200 });
};
```

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(checkout): create-order, verify, cod-place endpoints + webhook backup

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Success page

**Files:** Create `src/pages/checkout/success.astro`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import Button from '../../components/ui/Button.astro';
import { serverClient } from '../../lib/supabase/server';
import { formatINR } from '../../lib/format';

const code = Astro.url.searchParams.get('code');
if (!code) return Astro.redirect('/', 302);
const supabase = serverClient(Astro.cookies);
const { data: order } = await supabase
  .from('orders')
  .select('code, total, payment_method, address_snapshot')
  .eq('code', code)
  .maybeSingle();
---

<PublicLayout title="Order placed">
  <section class="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
    <p class="text-champagne mb-4 text-6xl">✓</p>
    <h1 class="font-display mb-2 text-3xl font-light">Order placed</h1>
    {
      order ? (
        <>
          <p class="text-navy/70 mb-1">
            Order <span class="font-mono">{order.code}</span>
          </p>
          <p class="text-navy/70 mb-1">Total: {formatINR(order.total)}</p>
          <p class="text-navy/70 mb-8">Shipping to {(order.address_snapshot as any).city}.</p>
          <p class="text-navy/60 mb-6 text-xs">
            You'll find live status, AWB, and a reorder button in your account.
          </p>
          <Button variant="primary" href="/account/orders">
            View my orders
          </Button>
        </>
      ) : (
        <p class="text-navy/70">Order details not found — please check your email.</p>
      )
    }
  </section>
</PublicLayout>
```

- [ ] **Step 2: Commit**

```powershell
git add .
git commit -m "feat(checkout): /checkout/success thank-you page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: E2E tests for cart + checkout (test mode)

**Files:** Create `tests/e2e/cart.spec.ts`, `tests/e2e/checkout.spec.ts`

- [ ] **Step 1: Cart tests**

```ts
import { test, expect } from '@playwright/test';

test('add to bag from PDP → /cart shows the line', async ({ page }) => {
  await page.goto('/scent/azeziya');
  await page.getByRole('button', { name: /add to bag/i }).click();
  await page.waitForTimeout(800);
  await page.goto('/cart');
  await expect(page.getByText(/Azeziya/)).toBeVisible();
  await expect(page.getByText(/₹349/)).toBeVisible();
});

test('quantity increment updates total', async ({ page }) => {
  await page.goto('/scent/velvet-midnight');
  await page.getByRole('button', { name: /add to bag/i }).click();
  await page.waitForTimeout(800);
  await page.goto('/cart');
  await page.locator('[data-qty-inc]').first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/₹698/)).toBeVisible();
});
```

- [ ] **Step 2: COD checkout E2E**

```ts
import { test, expect } from '@playwright/test';

test('cod order end-to-end places successfully', async ({ page }) => {
  await page.goto('/scent/azeziya');
  await page.getByRole('button', { name: /add to bag/i }).click();
  await page.waitForTimeout(800);

  await page.goto('/checkout');
  await page.fill('input[name="email"]', `e2e+${Date.now()}@qayra.test`);
  await page.fill('input[name="phone"]', '9999999999');
  await page.fill('input[name="name"]', 'E2E Buyer');
  await page.fill('input[name="line1"]', '12 Test Lane');
  await page.fill('input[name="city"]', 'Bengaluru');
  await page.fill('input[name="state"]', 'Karnataka');
  await page.fill('input[name="pincode"]', '560001');
  await page.locator('input[value="cod"]').check();
  await page.getByRole('button', { name: /place order/i }).click();

  await expect(page).toHaveURL(/checkout\/success/);
  await expect(page.getByText(/Order placed/i)).toBeVisible();
});
```

Prepaid Razorpay E2E requires Razorpay's test card flow inside an iframe — defer full E2E to Week 11. For now, manually verify prepaid in dev.

- [ ] **Step 3: Run tests**

```powershell
npm run test:e2e
```

- [ ] **Step 4: Commit**

```powershell
git add .
git commit -m "test(e2e): cart add/qty + COD checkout end-to-end

Prepaid Razorpay E2E deferred to Week 11 — manually verified in dev.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Acceptance criteria — end of Week 3

- [ ] PDP "Add to bag" persists to DB; header bag count reflects it.
- [ ] `/cart` shows lines, updates qty, removes, computes correct totals.
- [ ] `/checkout` form validates; prepaid path opens Razorpay modal in test mode; payment of ₹X test card → success page.
- [ ] COD path skips Razorpay, ₹50 surcharge applied, order code generated.
- [ ] Orders appear in Supabase `orders` table with correct `address_snapshot`, totals, payment_method, payment_status.
- [ ] `order_items` rows created.
- [ ] Guest checkout creates a Supabase Auth user (verifiable in dashboard).
- [ ] Signing in on a different device merges anon cart into profile cart.
- [ ] Unit + E2E tests pass.

## What we did NOT do in Week 3

- Discount code application UI — Week 9
- Auto-offer rule evaluator beyond free-shipping threshold — Week 9
- Address book (saved addresses) — Week 4
- Customer's `/account/orders/[id]` page — Week 4
- Real production Razorpay activation — wait for KYC
