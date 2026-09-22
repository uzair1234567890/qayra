# Week 4 — Customer Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Ship the entire `/account` surface — dashboard, orders list, order detail (with reorder + return request + status timeline + AWB display), address book, profile editing, reviews list. Customer account is the _primary_ customer support channel since we have no email service.

**Architecture:** All `/account/*` pages are SSR, require an authenticated session (middleware redirects to `/auth/sign-in?next=…`). Reorder restores items to cart. Return requests insert into `returns` table; ops fulfils in Week 7.

**Tech Stack:** Astro 4 · Supabase · Zod

**Spec reference:** §§ 6.1, 7.5

**External milestone this week:** Product photoshoot. Drop photos into Supabase Storage `product-images/` and update `scents.image_urls`.

---

## File structure

```
src/
├── components/
│   ├── account/
│   │   ├── AccountNav.astro
│   │   ├── OrderStatusTimeline.astro
│   │   ├── AddressCard.astro
│   │   ├── AddressForm.astro
│   │   └── OrderSummary.astro
│   └── ui/
│       └── Field.astro                  # labeled input wrapper
├── lib/
│   ├── orders.ts                        # getCustomerOrders, getOrder, requestReturn, reorderToCart
│   └── addresses.ts                     # CRUD helpers
├── pages/
│   ├── account/
│   │   ├── index.astro                  # dashboard
│   │   ├── orders/
│   │   │   ├── index.astro              # list
│   │   │   └── [id].astro               # detail
│   │   ├── addresses/
│   │   │   ├── index.astro
│   │   │   ├── new.astro
│   │   │   └── [id]/edit.astro
│   │   ├── profile.astro
│   │   └── reviews.astro
│   └── api/account/
│       ├── address-create.ts
│       ├── address-update.ts
│       ├── address-delete.ts
│       ├── address-default.ts
│       ├── profile-update.ts
│       ├── reorder.ts
│       └── return-request.ts
└── tests/e2e/account.spec.ts
```

---

## Task 1: Account nav + dashboard

**Files:** Create `src/components/account/AccountNav.astro`, `src/pages/account/index.astro`

- [ ] **Step 1: `AccountNav.astro`**

```astro
---
const path = Astro.url.pathname;
const items = [
  { href: '/account', label: 'Overview', match: '/account' },
  { href: '/account/orders', label: 'Orders', match: '/account/orders' },
  { href: '/account/addresses', label: 'Addresses', match: '/account/addresses' },
  { href: '/account/reviews', label: 'Reviews', match: '/account/reviews' },
  { href: '/account/profile', label: 'Profile', match: '/account/profile' },
];
---

<aside class="flex-shrink-0 md:w-48">
  <nav class="flex gap-1 text-sm md:flex-col">
    {
      items.map((it) => {
        const active = path === it.match || (it.match !== '/account' && path.startsWith(it.match));
        return (
          <a
            href={it.href}
            class:list={['hover:bg-navy/5 px-3 py-2', active && 'bg-navy text-cream hover:bg-navy']}
          >
            {it.label}
          </a>
        );
      })
    }
    <form action="/api/auth/sign-out" method="post" class="mt-2">
      <button class="text-navy/70 hover:text-navy w-full px-3 py-2 text-left">Sign out</button>
    </form>
  </nav>
</aside>
```

- [ ] **Step 2: Account dashboard** — `src/pages/account/index.astro`

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import AccountNav from '../../components/account/AccountNav.astro';
import { requireRole } from '../../lib/auth/session';
import { serverClient } from '../../lib/supabase/server';
import { formatINR } from '../../lib/format';

const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const session = result;

const supabase = serverClient(Astro.cookies);
const { data: recent } = await supabase
  .from('orders')
  .select('code, status, total, created_at')
  .eq('profile_id', session.userId)
  .order('created_at', { ascending: false })
  .limit(3);
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', session.userId)
  .maybeSingle();
---

<PublicLayout title="My account">
  <section class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <h1 class="font-display mb-8 text-3xl font-light">
      Welcome back, {profile?.full_name || 'there'}
    </h1>
    <div class="flex flex-col gap-8 md:flex-row">
      <AccountNav />
      <div class="flex-1 space-y-8">
        <div class="border-navy/10 border bg-white p-5">
          <p class="text-navy/60 mb-3 text-xs tracking-widest uppercase">Recent orders</p>
          {
            (recent ?? []).length === 0 ? (
              <p class="text-navy/70">
                No orders yet.{' '}
                <a href="/scents" class="underline">
                  Shop scents
                </a>
                .
              </p>
            ) : (
              (recent ?? []).map((o) => (
                <a
                  href={`/account/orders/${o.code}`}
                  class="border-navy/10 hover:bg-navy/5 flex justify-between border-b px-2 py-3"
                >
                  <span class="font-mono text-sm">{o.code}</span>
                  <span class="text-xs tracking-widest uppercase">{o.status}</span>
                  <span class="text-sm">{formatINR(o.total)}</span>
                </a>
              ))
            )
          }
          <a
            href="/account/orders"
            class="mt-3 inline-block text-xs tracking-widest uppercase underline">All orders →</a
          >
        </div>
      </div>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(account): /account dashboard + AccountNav

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Orders list + order helpers

**Files:** Create `src/lib/orders.ts`, `src/pages/account/orders/index.astro`

- [ ] **Step 1: `src/lib/orders.ts`**

```ts
import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';

export async function getCustomerOrders(cookies: AstroCookies, profileId: string) {
  const supabase = serverClient(cookies);
  const { data } = await supabase
    .from('orders')
    .select('code, status, total, payment_method, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getOrderByCode(cookies: AstroCookies, profileId: string, code: string) {
  const supabase = serverClient(cookies);
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(status, note, created_at), shipments(*)')
    .eq('code', code)
    .eq('profile_id', profileId)
    .maybeSingle();
  return order;
}

export async function requestReturn(
  cookies: AstroCookies,
  profileId: string,
  orderId: string,
  reason: string,
) {
  const supabase = serverClient(cookies);
  // Confirm ownership via RLS
  const { error } = await supabase.from('returns').insert({ order_id: orderId, reason });
  if (error) throw error;
}

export async function reorderToCart(
  cookies: AstroCookies,
  profileId: string,
  code: string,
  cartId: string,
) {
  const supabase = serverClient(cookies);
  const { data: items } = await supabase
    .from('order_items')
    .select('scent_id, bundle_id, quantity, orders!inner(profile_id, code)')
    .eq('orders.profile_id', profileId)
    .eq('orders.code', code);
  for (const it of items ?? []) {
    await supabase.from('cart_items').insert({
      cart_id: cartId,
      scent_id: it.scent_id,
      bundle_id: it.bundle_id,
      quantity: it.quantity,
    });
  }
}
```

- [ ] **Step 2: Orders list** — `src/pages/account/orders/index.astro`

```astro
---
import PublicLayout from '../../../layouts/PublicLayout.astro';
import AccountNav from '../../../components/account/AccountNav.astro';
import { requireRole } from '../../../lib/auth/session';
import { getCustomerOrders } from '../../../lib/orders';
import { formatINR } from '../../../lib/format';

const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const orders = await getCustomerOrders(Astro.cookies, result.userId);
---

<PublicLayout title="My orders">
  <section class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <div class="flex flex-col gap-8 md:flex-row">
      <AccountNav />
      <div class="flex-1">
        <h1 class="font-display mb-6 text-3xl font-light">My orders</h1>
        {
          orders.length === 0 ? (
            <p class="text-navy/70">
              No orders yet.{' '}
              <a href="/scents" class="underline">
                Shop scents
              </a>
              .
            </p>
          ) : (
            <table class="w-full text-sm">
              <thead>
                <tr class="text-navy/60 text-left text-xs tracking-widest uppercase">
                  <>
                    <th class="py-2">Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th />
                  </>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr class="border-navy/10 border-t">
                    <td class="py-3 font-mono">{o.code}</td>
                    <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td class="text-xs tracking-widest uppercase">{o.status}</td>
                    <td>{formatINR(o.total)}</td>
                    <td>
                      <a
                        href={`/account/orders/${o.code}`}
                        class="text-xs tracking-widest uppercase underline"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(account): /account/orders list

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Order detail page (status timeline + AWB + reorder + return)

**Files:** Create `src/components/account/OrderStatusTimeline.astro`, `src/pages/account/orders/[id].astro`, `src/pages/api/account/reorder.ts`, `src/pages/api/account/return-request.ts`

- [ ] **Step 1: `OrderStatusTimeline.astro`**

```astro
---
interface Props {
  current: string;
}
const { current } = Astro.props;
const STEPS = ['paid', 'packed', 'shipped', 'delivered'] as const;
const idx = STEPS.indexOf(current as any);
---

<ol class="flex items-start justify-between text-xs tracking-widest uppercase">
  {
    STEPS.map((s, i) => (
      <li class="relative flex flex-1 flex-col items-center text-center">
        {i > 0 && (
          <span
            class:list={[
              'absolute top-3 right-1/2 h-px w-full',
              i <= idx ? 'bg-champagne' : 'bg-navy/15',
            ]}
          />
        )}
        <span
          class:list={[
            'relative z-10 flex h-6 w-6 items-center justify-center rounded-full',
            i <= idx ? 'bg-champagne text-near-black' : 'bg-navy/10 text-navy/40',
          ]}
        >
          {i <= idx ? '✓' : ''}
        </span>
        <span class="text-navy/70 mt-2">{s}</span>
      </li>
    ))
  }
</ol>
```

- [ ] **Step 2: `src/pages/account/orders/[id].astro`**

```astro
---
import PublicLayout from '../../../layouts/PublicLayout.astro';
import AccountNav from '../../../components/account/AccountNav.astro';
import OrderStatusTimeline from '../../../components/account/OrderStatusTimeline.astro';
import { requireRole } from '../../../lib/auth/session';
import { getOrderByCode } from '../../../lib/orders';
import { formatINR } from '../../../lib/format';

const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const code = Astro.params.id!;
const order = await getOrderByCode(Astro.cookies, result.userId, code);
if (!order) return Astro.redirect('/account/orders', 302);
const addr = order.address_snapshot as any;
const shipment = (order as any).shipments?.[0];
---

<PublicLayout title={`Order ${order.code}`}>
  <section class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <div class="flex flex-col gap-8 md:flex-row">
      <AccountNav />
      <div class="flex-1 space-y-8">
        <header>
          <p class="text-navy/60 font-mono text-xs tracking-widest uppercase">{order.code}</p>
          <h1 class="font-display text-3xl font-light">
            Order placed {
              new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            }
          </h1>
        </header>

        <div class="border-navy/10 border bg-white p-5">
          <OrderStatusTimeline current={order.status} />
          {
            shipment && (
              <div class="border-navy/10 mt-6 border-t pt-4 text-sm">
                <p>
                  Courier: <strong>{shipment.courier_name}</strong>
                </p>
                <p>
                  AWB: <span class="font-mono">{shipment.awb_number}</span>
                </p>
              </div>
            )
          }
        </div>

        <div class="border-navy/10 border bg-white p-5">
          <p class="text-navy/60 mb-3 text-xs tracking-widest uppercase">Items</p>
          {
            (order as any).order_items.map((it: any) => (
              <div class="border-navy/10 flex justify-between border-t py-2 text-sm first:border-0">
                <span>
                  {it.name_snapshot} × {it.quantity}
                </span>
                <span>{formatINR(it.price_snapshot * it.quantity)}</span>
              </div>
            ))
          }
          <div class="border-navy/20 mt-2 flex justify-between border-t pt-2 font-medium">
            <span>Total</span><span>{formatINR(order.total)}</span>
          </div>
        </div>

        <div class="border-navy/10 border bg-white p-5 text-sm">
          <p class="text-navy/60 mb-2 text-xs tracking-widest uppercase">Ship to</p>
          <p>{addr.name}</p>
          <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
          <p>{addr.city}, {addr.state} {addr.pincode}</p>
          <p class="text-navy/60 mt-1">{addr.phone}</p>
        </div>

        <div class="flex flex-wrap gap-3">
          <form action="/api/account/reorder" method="post">
            <input type="hidden" name="code" value={order.code} />
            <button class="bg-navy text-cream px-5 py-3 text-xs tracking-widest uppercase"
              >Reorder this</button
            >
          </form>
          {
            order.status === 'delivered' && (
              <details class="border-navy/10 border bg-white">
                <summary class="cursor-pointer px-5 py-3 text-xs tracking-widest uppercase">
                  Request return
                </summary>
                <form action="/api/account/return-request" method="post" class="space-y-3 p-5">
                  <input type="hidden" name="order_id" value={order.id} />
                  <textarea
                    name="reason"
                    required
                    rows="3"
                    placeholder="Reason"
                    class="border-navy/20 w-full border px-3 py-2 text-sm"
                  />
                  <button class="bg-aubergine text-cream px-4 py-2 text-xs tracking-widest uppercase">
                    Submit return request
                  </button>
                </form>
              </details>
            )
          }
        </div>
      </div>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 3: Reorder endpoint**

`src/pages/api/account/reorder.ts`:

```ts
import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { getOrCreateCart } from '../../../lib/cart';
import { reorderToCart } from '../../../lib/orders';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const code = String(form.get('code') ?? '');
  if (!code) return new Response('bad request', { status: 400 });
  const cartId = await getOrCreateCart(ctx.cookies, ctx.locals.cartToken);
  await reorderToCart(ctx.cookies, result.userId, code, cartId);
  return ctx.redirect('/cart', 303);
};
```

- [ ] **Step 4: Return-request endpoint**

`src/pages/api/account/return-request.ts`:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { requestReturn } from '../../../lib/orders';

const Body = z.object({ order_id: z.string().uuid(), reason: z.string().min(5).max(2000) });

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect(`/account/orders?error=invalid`, 303);
  await requestReturn(ctx.cookies, result.userId, parsed.data.order_id, parsed.data.reason);
  return ctx.redirect(
    `/account/orders?info=${encodeURIComponent('Return request submitted')}`,
    303,
  );
};
```

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat(account): order detail page — timeline, items, address, reorder, return

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Address book CRUD

**Files:** Create `src/lib/addresses.ts`, `src/components/account/AddressCard.astro`, `AddressForm.astro`, `src/pages/account/addresses/index.astro`, `new.astro`, `[id]/edit.astro`, and 4 API endpoints

- [ ] **Step 1: `src/lib/addresses.ts`**

```ts
import { z } from 'zod';
import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';

export const AddressInput = z.object({
  name: z.string().min(1).max(80),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pincode: z.string().regex(/^[0-9]{6}$/),
  phone: z.string().regex(/^[0-9]{10}$/),
});
export type AddressInputT = z.infer<typeof AddressInput>;

export async function listAddresses(cookies: AstroCookies, profileId: string) {
  const supabase = serverClient(cookies);
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('profile_id', profileId)
    .order('is_default', { ascending: false });
  return data ?? [];
}

export async function getAddress(cookies: AstroCookies, profileId: string, id: string) {
  const supabase = serverClient(cookies);
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', id)
    .eq('profile_id', profileId)
    .maybeSingle();
  return data;
}

export async function createAddress(
  cookies: AstroCookies,
  profileId: string,
  input: AddressInputT,
) {
  const supabase = serverClient(cookies);
  await supabase.from('addresses').insert({ ...input, profile_id: profileId });
}

export async function updateAddress(
  cookies: AstroCookies,
  profileId: string,
  id: string,
  input: AddressInputT,
) {
  const supabase = serverClient(cookies);
  await supabase.from('addresses').update(input).eq('id', id).eq('profile_id', profileId);
}

export async function deleteAddress(cookies: AstroCookies, profileId: string, id: string) {
  const supabase = serverClient(cookies);
  await supabase.from('addresses').delete().eq('id', id).eq('profile_id', profileId);
}

export async function setDefaultAddress(cookies: AstroCookies, profileId: string, id: string) {
  const supabase = serverClient(cookies);
  await supabase.from('addresses').update({ is_default: false }).eq('profile_id', profileId);
  await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('profile_id', profileId);
}
```

- [ ] **Step 2: `AddressForm.astro`**

```astro
---
interface Props {
  address?: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  action: string;
}
const { address, action } = Astro.props;
const a = address;
---

<form method="post" action={action} class="max-w-md space-y-3">
  <input
    name="name"
    required
    placeholder="Full name"
    value={a?.name ?? ''}
    class="border-navy/20 w-full border px-3 py-2"
  />
  <input
    name="line1"
    required
    placeholder="Address line 1"
    value={a?.line1 ?? ''}
    class="border-navy/20 w-full border px-3 py-2"
  />
  <input
    name="line2"
    placeholder="Address line 2"
    value={a?.line2 ?? ''}
    class="border-navy/20 w-full border px-3 py-2"
  />
  <div class="grid grid-cols-3 gap-3">
    <input
      name="city"
      required
      placeholder="City"
      value={a?.city ?? ''}
      class="border-navy/20 border px-3 py-2"
    />
    <input
      name="state"
      required
      placeholder="State"
      value={a?.state ?? ''}
      class="border-navy/20 border px-3 py-2"
    />
    <input
      name="pincode"
      required
      pattern="[0-9]{6}"
      placeholder="PIN"
      value={a?.pincode ?? ''}
      class="border-navy/20 border px-3 py-2"
    />
  </div>
  <input
    name="phone"
    required
    pattern="[0-9]{10}"
    placeholder="Phone (10 digits)"
    value={a?.phone ?? ''}
    class="border-navy/20 w-full border px-3 py-2"
  />
  <button class="bg-navy text-cream px-6 py-3 text-xs tracking-widest uppercase">Save</button>
</form>
```

- [ ] **Step 3: `AddressCard.astro`**

```astro
---
interface Props {
  address: any;
}
const { address: a } = Astro.props;
---

<div
  class:list={['border bg-white p-4 text-sm', a.is_default ? 'border-champagne' : 'border-navy/10']}
>
  {a.is_default && <p class="text-champagne mb-2 text-[10px] tracking-widest uppercase">Default</p>}
  <p class="font-medium">{a.name}</p>
  <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
  <p>{a.city}, {a.state} {a.pincode}</p>
  <p class="text-navy/60">{a.phone}</p>
  <div class="mt-3 flex gap-3 text-xs tracking-widest uppercase">
    <a href={`/account/addresses/${a.id}/edit`} class="underline">Edit</a>
    {
      !a.is_default && (
        <form action="/api/account/address-default" method="post">
          <input type="hidden" name="id" value={a.id} />
          <button class="underline">Set default</button>
        </form>
      )
    }
    <form
      action="/api/account/address-delete"
      method="post"
      onsubmit="return confirm('Delete this address?')"
    >
      <input type="hidden" name="id" value={a.id} />
      <button class="text-red-700 underline">Delete</button>
    </form>
  </div>
</div>
```

- [ ] **Step 4: Pages**

`src/pages/account/addresses/index.astro`:

```astro
---
import PublicLayout from '../../../layouts/PublicLayout.astro';
import AccountNav from '../../../components/account/AccountNav.astro';
import AddressCard from '../../../components/account/AddressCard.astro';
import { requireRole } from '../../../lib/auth/session';
import { listAddresses } from '../../../lib/addresses';

const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const addresses = await listAddresses(Astro.cookies, result.userId);
---

<PublicLayout title="My addresses">
  <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row">
    <AccountNav />
    <div class="flex-1">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="font-display text-3xl font-light">My addresses</h1>
        <a
          href="/account/addresses/new"
          class="bg-navy text-cream px-4 py-2 text-xs tracking-widest uppercase">+ New address</a
        >
      </div>
      {
        addresses.length === 0 ? (
          <p class="text-navy/70">No addresses saved.</p>
        ) : (
          <div class="grid gap-4 md:grid-cols-2">
            {addresses.map((a) => (
              <AddressCard address={a} />
            ))}
          </div>
        )
      }
    </div>
  </section>
</PublicLayout>
```

`src/pages/account/addresses/new.astro`:

```astro
---
import PublicLayout from '../../../layouts/PublicLayout.astro';
import AccountNav from '../../../components/account/AccountNav.astro';
import AddressForm from '../../../components/account/AddressForm.astro';
import { requireRole } from '../../../lib/auth/session';
const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
---

<PublicLayout title="New address">
  <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row">
    <AccountNav />
    <div class="flex-1">
      <h1 class="font-display mb-6 text-3xl font-light">New address</h1>
      <AddressForm action="/api/account/address-create" />
    </div>
  </section>
</PublicLayout>
```

`src/pages/account/addresses/[id]/edit.astro`:

```astro
---
import PublicLayout from '../../../../layouts/PublicLayout.astro';
import AccountNav from '../../../../components/account/AccountNav.astro';
import AddressForm from '../../../../components/account/AddressForm.astro';
import { requireRole } from '../../../../lib/auth/session';
import { getAddress } from '../../../../lib/addresses';
const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const a = await getAddress(Astro.cookies, result.userId, Astro.params.id!);
if (!a) return Astro.redirect('/account/addresses', 302);
---

<PublicLayout title="Edit address">
  <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row">
    <AccountNav />
    <div class="flex-1">
      <h1 class="font-display mb-6 text-3xl font-light">Edit address</h1>
      <AddressForm address={a} action={`/api/account/address-update?id=${a.id}`} />
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 5: API endpoints**

`src/pages/api/account/address-create.ts`:

```ts
import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { AddressInput, createAddress } from '../../../lib/addresses';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = AddressInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/account/addresses/new?error=invalid', 303);
  await createAddress(ctx.cookies, result.userId, parsed.data);
  return ctx.redirect('/account/addresses', 303);
};
```

`address-update.ts`, `address-delete.ts`, `address-default.ts`: same pattern. Create each, calling `updateAddress`, `deleteAddress`, `setDefaultAddress` respectively, with id taken from query or form.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat(account): address book CRUD + default

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Profile editing

**Files:** Create `src/pages/account/profile.astro`, `src/pages/api/account/profile-update.ts`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import AccountNav from '../../components/account/AccountNav.astro';
import { requireRole } from '../../lib/auth/session';
import { serverClient } from '../../lib/supabase/server';
const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const supabase = serverClient(Astro.cookies);
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, phone')
  .eq('id', result.userId)
  .single();
const info = Astro.url.searchParams.get('info');
const error = Astro.url.searchParams.get('error');
---

<PublicLayout title="Profile">
  <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row">
    <AccountNav />
    <div class="max-w-md flex-1">
      <h1 class="font-display mb-6 text-3xl font-light">Profile</h1>
      {info && <p class="bg-champagne/20 border-champagne/40 mb-4 border p-3 text-sm">{info}</p>}
      {
        error && (
          <p class="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )
      }
      <form action="/api/account/profile-update" method="post" class="space-y-3">
        <input
          name="full_name"
          placeholder="Full name"
          value={profile?.full_name ?? ''}
          required
          class="border-navy/20 w-full border px-3 py-2"
        />
        <input
          name="phone"
          placeholder="Phone (10 digits)"
          pattern="[0-9]{10}"
          value={profile?.phone ?? ''}
          class="border-navy/20 w-full border px-3 py-2"
        />
        <p class="text-navy/50 text-xs">Email: {result.email} (cannot be changed)</p>
        <button class="bg-navy text-cream px-6 py-3 text-xs tracking-widest uppercase">Save</button>
      </form>
      <hr class="border-navy/10 my-8" />
      <a href="/auth/forgot-password" class="text-sm underline">Change password</a>
    </div>
  </section>
</PublicLayout>
```

- [ ] **Step 2: Endpoint**

`src/pages/api/account/profile-update.ts`:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { serverClient } from '../../../lib/supabase/server';

const Body = z.object({
  full_name: z.string().min(1).max(80),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/)
    .optional()
    .or(z.literal('')),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/account/profile?error=Invalid', 303);
  const supabase = serverClient(ctx.cookies);
  await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
    })
    .eq('id', result.userId);
  return ctx.redirect('/account/profile?info=Saved', 303);
};
```

- [ ] **Step 3: Commit**

```powershell
git add .
git commit -m "feat(account): profile edit page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Reviews list

**Files:** Create `src/pages/account/reviews.astro`

- [ ] **Step 1: Page**

```astro
---
import PublicLayout from '../../layouts/PublicLayout.astro';
import AccountNav from '../../components/account/AccountNav.astro';
import { requireRole } from '../../lib/auth/session';
import { serverClient } from '../../lib/supabase/server';

const result = await requireRole(Astro as any, 'customer');
if (result instanceof Response) return result;
const supabase = serverClient(Astro.cookies);

// Delivered orders the customer has not reviewed for at least one of the items
const { data: pending } = await supabase
  .from('orders')
  .select('code, order_items(scent_id, name_snapshot, scent:scents(slug, name))')
  .eq('profile_id', result.userId)
  .eq('status', 'delivered');

const { data: mine } = await supabase
  .from('reviews')
  .select('order_id, scent_id, rating, status, created_at, scent:scents(slug, name)')
  .eq('profile_id', result.userId)
  .order('created_at', { ascending: false });
---

<PublicLayout title="My reviews">
  <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row">
    <AccountNav />
    <div class="flex-1 space-y-10">
      <div>
        <h1 class="font-display mb-4 text-3xl font-light">Awaiting your review</h1>
        {
          (pending ?? []).length === 0 ? (
            <p class="text-navy/70">Nothing waiting.</p>
          ) : (
            <ul class="space-y-3">
              {(pending ?? []).flatMap((o: any) =>
                o.order_items.map((it: any) => (
                  <li class="border-navy/10 flex items-center justify-between border bg-white p-4">
                    <span>
                      {it.scent?.name ?? it.name_snapshot}{' '}
                      <span class="text-navy/50 ml-2 text-xs">{o.code}</span>
                    </span>
                    <a
                      href={`/scent/${it.scent?.slug}?review_order=${o.code}`}
                      class="bg-navy text-cream px-4 py-2 text-xs tracking-widest uppercase"
                    >
                      Write review
                    </a>
                  </li>
                )),
              )}
            </ul>
          )
        }
      </div>
      <div>
        <h2 class="font-display mb-4 text-2xl font-light">My reviews</h2>
        {
          (mine ?? []).length === 0 ? (
            <p class="text-navy/70">None yet.</p>
          ) : (
            <ul class="space-y-2">
              {(mine ?? []).map((r: any) => (
                <li class="border-navy/10 flex justify-between border bg-white p-3 text-sm">
                  <span>
                    {r.scent?.name} — {r.rating}★
                  </span>
                  <span class="text-navy/50 text-xs tracking-widest uppercase">{r.status}</span>
                </li>
              ))}
            </ul>
          )
        }
      </div>
    </div>
  </section>
</PublicLayout>
```

_(Review submission form on PDP — wired in Week 9.)_

- [ ] **Step 2: Commit**

```powershell
git add .
git commit -m "feat(account): /account/reviews — pending + submitted list

Review submission form lives on PDP, wired in Week 9.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Photoshoot (external) + image upload

External task — not code, but tracked here so the founder doesn't forget.

- [ ] **Step 1: Photoshoot delivered** — at least 1 hero + 3 angle photos per scent (16 photos minimum) + 4 mood/lifestyle (1 per scent).

- [ ] **Step 2: Create Supabase Storage bucket**

In Supabase dashboard → Storage → create bucket `product-images` (public read).

- [ ] **Step 3: Upload photos**

Use Supabase Studio's UI or `npx supabase storage cp` to upload. Naming: `<scent-slug>/01-hero.webp`, `<scent-slug>/02-side.webp`, etc.

- [ ] **Step 4: Update each scent's `image_urls`**

In Studio → Table Editor → scents. For each row, set `image_urls` to a JSON array of public URLs.

- [ ] **Step 5: Verify**

Reload `/scents` and each `/scent/[slug]` — gradients should be replaced with real photos.

- [ ] **Step 6: Commit (no code change, just docs)**

```powershell
git commit --allow-empty -m "chore(content): product photos uploaded to Supabase Storage

16 hero/angle + 4 mood photos for Azeziya, Velvet Midnight, Blue Lotus
Mist, Imperial Musk. image_urls populated on each scents row.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: E2E tests

**Files:** Create `tests/e2e/account.spec.ts`

```ts
import { test, expect } from '@playwright/test';

async function signUpAndSignIn(page) {
  const email = `e2e+${Date.now()}@qayra.test`;
  await page.goto('/auth/sign-up');
  await page.fill('input[name="full_name"]', 'E2E User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'testtest12');
  await page.getByRole('button', { name: /create account/i }).click();
  // Supabase requires email confirmation by default — to keep the test
  // sane, disable "Confirm email" in Supabase dashboard for the test env.
  await page.goto('/auth/sign-in');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'testtest12');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  return email;
}

test('account dashboard loads', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('address create / edit / delete', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/account/addresses/new');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="line1"]', '123 Test Lane');
  await page.fill('input[name="city"]', 'Bengaluru');
  await page.fill('input[name="state"]', 'Karnataka');
  await page.fill('input[name="pincode"]', '560001');
  await page.fill('input[name="phone"]', '9999999999');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('123 Test Lane')).toBeVisible();
});
```

- [ ] **Run**: `npm run test:e2e`. Commit.

---

## Acceptance criteria — end of Week 4

- [ ] `/account`, `/account/orders`, `/account/orders/[code]`, `/account/addresses` (+ new/edit), `/account/profile`, `/account/reviews` all render and gate to signed-in.
- [ ] Reorder restores items to cart, redirects to `/cart`.
- [ ] Return request inserts to `returns` table.
- [ ] Address default-toggle works (only one default at a time).
- [ ] Profile name/phone update persists.
- [ ] All 4 scents now display real photos on `/scents` and PDP.
- [ ] E2E suite passes.

## What we did NOT do in Week 4

- Admin / ops UI — Weeks 5–7
- Review submission form on PDP — Week 9
- Animations — Week 10
