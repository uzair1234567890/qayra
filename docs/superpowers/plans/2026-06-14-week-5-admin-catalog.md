# Week 5 — Admin: Catalog & Marketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Ship the admin shell (light theme, sidebar nav, data-dense) and all catalog/marketing CRUD pages: dashboard, products, scents, bundles, inventory, discounts, auto-offers, banners.

**Architecture:** All `/admin/*` routes are role-gated to `admin`. Distinct visual system from storefront — Inter + JetBrains Mono, white surfaces, gold accent only on KPIs. Forms post to `/api/admin/*` endpoints that go through `service_role` client for writes (cleaner than relying solely on RLS for admin actions).

**Tech Stack:** Astro 4 · Supabase (service-role client for admin writes) · Zod · Tailwind

**Spec reference:** §§ 6.2, 8

---

## File structure

```
src/
├── components/admin/
│   ├── AdminShell.astro
│   ├── AdminSidebar.astro
│   ├── AdminTopbar.astro
│   ├── KPICard.astro
│   ├── DataTable.astro
│   ├── EmptyState.astro
│   ├── StatusPill.astro
│   └── DangerZone.astro
├── layouts/AdminLayout.astro
├── lib/
│   ├── supabase/admin.ts                  # service_role client (server-only)
│   └── admin/
│       ├── dashboard.ts                   # KPI aggregations
│       ├── products.ts
│       ├── scents.ts
│       ├── bundles.ts
│       ├── inventory.ts
│       ├── discounts.ts
│       ├── offers.ts
│       └── banners.ts
└── pages/
    ├── admin/
    │   ├── index.astro                    # dashboard
    │   ├── products/
    │   │   ├── index.astro
    │   │   └── [id].astro
    │   ├── scents/
    │   │   ├── index.astro
    │   │   ├── new.astro
    │   │   └── [id].astro
    │   ├── bundles/
    │   │   ├── index.astro
    │   │   ├── new.astro
    │   │   └── [id].astro
    │   ├── inventory.astro
    │   ├── discounts/
    │   │   ├── index.astro
    │   │   ├── new.astro
    │   │   └── [code].astro
    │   ├── offers/
    │   │   ├── index.astro
    │   │   ├── new.astro
    │   │   └── [id].astro
    │   └── banners/
    │       ├── index.astro
    │       ├── new.astro
    │       └── [id].astro
    └── api/admin/
        ├── product-update.ts
        ├── scent-create.ts
        ├── scent-update.ts
        ├── scent-toggle.ts
        ├── bundle-create.ts
        ├── bundle-update.ts
        ├── bundle-delete.ts
        ├── inventory-set.ts
        ├── discount-create.ts
        ├── discount-update.ts
        ├── discount-delete.ts
        ├── offer-create.ts
        ├── offer-update.ts
        ├── offer-delete.ts
        ├── banner-create.ts
        ├── banner-update.ts
        └── banner-delete.ts
```

---

## Task 1: Admin shell + service-role client + shared components

- [ ] **`src/lib/supabase/admin.ts`** — service-role client, NEVER imported by browser code

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '../env';

export const supabaseAdmin = createClient<Database>(
  env.PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

- [ ] **`AdminLayout.astro`**

```astro
---
import '../styles/globals.css';
import AdminSidebar from '../components/admin/AdminSidebar.astro';
import AdminTopbar from '../components/admin/AdminTopbar.astro';
interface Props {
  title: string;
}
const { title } = Astro.props;
const session = Astro.locals.session;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} · admin · qayra</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="font-ui flex min-h-screen bg-[#FAFAF8] text-[#1A1A1A]">
    <AdminSidebar />
    <div class="flex min-h-screen flex-1 flex-col">
      <AdminTopbar title={title} userEmail={session?.email ?? ''} />
      <main class="mx-auto w-full max-w-7xl flex-1 px-6 py-6"><slot /></main>
    </div>
  </body>
</html>
```

- [ ] **`AdminSidebar.astro`**

```astro
---
const path = Astro.url.pathname;
const groups = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/reports', label: 'Reports' }, // Week 6
    ],
  },
  {
    title: 'Sell',
    items: [
      { href: '/admin/orders', label: 'Orders' }, // Week 6
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/scents', label: 'Scents' },
      { href: '/admin/bundles', label: 'Bundles' },
      { href: '/admin/inventory', label: 'Inventory' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/discounts', label: 'Discounts' },
      { href: '/admin/offers', label: 'Auto-offers' },
      { href: '/admin/banners', label: 'Banners' },
      { href: '/admin/reviews', label: 'Reviews' }, // Week 6
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers' }, // Week 6
      { href: '/admin/team', label: 'Team' }, // Week 6
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/admin/settings', label: 'Settings' }, // Week 6
    ],
  },
];
---

<aside class="w-52 flex-shrink-0 bg-[#1A1A1A] py-4 text-sm text-white">
  <a href="/admin" class="block px-4 pb-4 font-semibold"
    >qayra<span class="text-champagne">.</span></a
  >
  {
    groups.map((g) => (
      <div class="mt-4">
        <p class="mb-1 px-4 text-[10px] tracking-widest text-white/40 uppercase">{g.title}</p>
        {g.items.map((it) => {
          const active = path === it.href || (it.href !== '/admin' && path.startsWith(it.href));
          return (
            <a
              href={it.href}
              class:list={[
                'block px-4 py-1.5 hover:bg-white/5',
                active && 'text-champagne border-champagne border-l-2 bg-white/10 pl-[14px]',
              ]}
            >
              {it.label}
            </a>
          );
        })}
      </div>
    ))
  }
</aside>
```

- [ ] **`AdminTopbar.astro`**

```astro
---
interface Props {
  title: string;
  userEmail: string;
}
const { title, userEmail } = Astro.props;
---

<header class="flex items-center justify-between border-b border-[#EAEAEA] bg-white px-6 py-3">
  <h1 class="text-lg font-semibold">{title}</h1>
  <div class="flex items-center gap-3 text-xs text-[#666]">
    <span>{userEmail}</span>
    <form action="/api/auth/sign-out" method="post">
      <button class="underline">Sign out</button>
    </form>
  </div>
</header>
```

- [ ] **`KPICard.astro`**

```astro
---
interface Props {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'flat';
}
const { label, value, delta, deltaDirection = 'flat' } = Astro.props;
const color = { up: 'text-[#0A8A00]', down: 'text-[#C44]', flat: 'text-[#888]' }[deltaDirection];
---

<div class="rounded border border-[#EAEAEA] bg-white p-4">
  <p class="text-[9px] tracking-widest text-[#888] uppercase">{label}</p>
  <p class="mt-1 font-mono text-2xl font-semibold">{value}</p>
  {delta && <p class:list={['mt-1 text-xs', color]}>{delta}</p>}
</div>
```

- [ ] **`DataTable.astro`** (slot-based shell)

```astro
---
interface Props {
  columns: string[];
}
const { columns } = Astro.props;
---

<div class="rounded border border-[#EAEAEA] bg-white">
  <table class="w-full text-sm">
    <thead>
      <tr
        class="border-b border-[#EAEAEA] text-left text-[10px] tracking-widest text-[#888] uppercase"
      >
        {columns.map((c) => <th class="px-3 py-2">{c}</th>)}
      </tr>
    </thead>
    <tbody><slot /></tbody>
  </table>
</div>
```

- [ ] **`StatusPill.astro`**

```astro
---
interface Props {
  value: string;
}
const { value } = Astro.props;
const map: Record<string, string> = {
  active: 'bg-[#E8F5E9] text-[#0A8A00]',
  draft: 'bg-[#FFF4E0] text-[#A67700]',
  archived: 'bg-[#F0F0F0] text-[#666]',
  paid: 'bg-[#E8F5E9] text-[#0A8A00]',
  pending: 'bg-[#FFF4E0] text-[#A67700]',
  shipped: 'bg-[#E3F2FD] text-[#0066CC]',
  delivered: 'bg-[#E8F5E9] text-[#0A8A00]',
  cancelled: 'bg-[#FFEAEA] text-[#C44]',
  returned: 'bg-[#FFEAEA] text-[#C44]',
};
const cls = map[value] ?? 'bg-[#F0F0F0] text-[#666]';
---

<span class:list={['inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', cls]}
  >{value}</span
>
```

- [ ] **`EmptyState.astro`**, **`DangerZone.astro`** — analogous, simple wrappers.

- [ ] **Commit**

```powershell
git add .
git commit -m "feat(admin): shell — AdminLayout, Sidebar, Topbar, KPI/Table/Pill primitives, service-role client

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Admin dashboard

**Files:** `src/lib/admin/dashboard.ts`, `src/pages/admin/index.astro`

- [ ] **`dashboard.ts`**

```ts
import { supabaseAdmin } from '../supabase/admin';

export async function getKpis(rangeDays: number) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('total, status, payment_method, payment_status')
    .gte('created_at', since)
    .in('status', ['paid', 'packed', 'shipped', 'delivered']);
  const revenue = (orders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const count = (orders ?? []).length;
  const aov = count ? Math.round(revenue / count) : 0;
  return { revenue, count, aov };
}

export async function recentOrders(limit = 5) {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('code, status, total, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function lowStock(threshold = 20) {
  const { data } = await supabaseAdmin
    .from('scents')
    .select('name, stock_qty')
    .lt('stock_qty', threshold)
    .order('stock_qty');
  return data ?? [];
}
```

- [ ] **`src/pages/admin/index.astro`**

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import KPICard from '../../components/admin/KPICard.astro';
import StatusPill from '../../components/admin/StatusPill.astro';
import { getKpis, recentOrders, lowStock } from '../../lib/admin/dashboard';
import { formatINR } from '../../lib/format';

const range = parseInt(Astro.url.searchParams.get('range') ?? '1', 10);
const k = await getKpis(range);
const recent = await recentOrders(5);
const stock = await lowStock(20);
---

<AdminLayout title="Dashboard">
  <div class="mb-6 flex gap-2 text-xs">
    {
      [
        ['Today', 1],
        ['7 days', 7],
        ['30 days', 30],
        ['90 days', 90],
      ].map(([label, n]) => (
        <a
          href={`?range=${n}`}
          class:list={[
            'border-b-2 px-3 py-1',
            range === n ? 'border-[#1A1A1A] font-medium' : 'border-transparent text-[#666]',
          ]}
        >
          {label}
        </a>
      ))
    }
  </div>

  <div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
    <KPICard label="Revenue" value={formatINR(k.revenue)} />
    <KPICard label="Orders" value={String(k.count)} />
    <KPICard label="AOV" value={formatINR(k.aov)} />
    <KPICard label="Low stock items" value={String(stock.length)} />
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div class="rounded border border-[#EAEAEA] bg-white p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold">Latest orders</h3>
        <a href="/admin/orders" class="text-xs text-[#0066CC]">View all →</a>
      </div>
      <table class="w-full text-sm">
        <thead
          ><tr class="text-[10px] tracking-widest text-[#888] uppercase"
            ><th class="py-1 text-left">Order</th><th class="text-left">Customer</th><th
              class="text-left">Status</th
            ><th class="text-right">Total</th></tr
          ></thead
        >
        <tbody>
          {
            recent.map((o) => (
              <tr class="border-t border-[#F4F4F4]">
                <td class="py-2 font-mono text-[#0066CC]">{o.code}</td>
                <td>{(o.profile as any)?.full_name ?? '—'}</td>
                <td>
                  <StatusPill value={o.status} />
                </td>
                <td class="text-right font-mono">{formatINR(o.total)}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
    <div class="rounded border border-[#EAEAEA] bg-white p-4">
      <h3 class="mb-3 text-sm font-semibold">Low stock (&lt; 20)</h3>
      {
        stock.length === 0 ? (
          <p class="text-sm text-[#888]">All scents healthy.</p>
        ) : (
          stock.map((s) => (
            <div class="flex justify-between border-t border-[#F4F4F4] py-1.5 text-sm first:border-0">
              <span>{s.name}</span>
              <span class="font-mono text-[#C44]">{s.stock_qty} left</span>
            </div>
          ))
        )
      }
    </div>
  </div>
</AdminLayout>
```

- [ ] **Commit**

```powershell
git add .
git commit -m "feat(admin): dashboard with KPIs, latest orders, low stock

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Products + Scents CRUD

Files for products are minimal (we only have one product) — admin can edit base_price, description, status.

- [ ] **`src/pages/admin/products/index.astro`** — table of products with link to `[id].astro`. Implement: query products, render with DataTable, columns Name/Status/Base price/Edit.

- [ ] **`src/pages/admin/products/[id].astro`** — form: name, description, base_price (rupees input converted to paise), status select. POST to `/api/admin/product-update`.

- [ ] **`src/pages/api/admin/product-update.ts`**:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  base_price_rupees: z.coerce.number().int().positive(),
  status: z.enum(['draft', 'active', 'archived']),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success)
    return ctx.redirect(`/admin/products?error=${encodeURIComponent('Invalid input')}`, 303);
  await supabaseAdmin
    .from('products')
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      base_price: parsed.data.base_price_rupees * 100,
      status: parsed.data.status,
    })
    .eq('id', parsed.data.id);
  return ctx.redirect(`/admin/products/${parsed.data.id}?info=Saved`, 303);
};
```

- [ ] **Scents**: `index.astro` (table), `new.astro`, `[id].astro` — fields: name, slug, tagline, description, top/heart/base notes, image_urls (multiline), stock_qty, sort_order, active toggle. POST to `scent-create.ts` / `scent-update.ts`. Pattern identical to products.

- [ ] **`scent-toggle.ts`** for quick activate/deactivate from list.

- [ ] **Commit** after each subgroup with descriptive messages.

---

## Task 4: Bundles CRUD

**Files:** `src/pages/admin/bundles/{index,new,[id]}.astro`, `src/lib/admin/bundles.ts`, 3 API endpoints

- [ ] **List** — query bundles, show name, price, status, count of scents.

- [ ] **Form** (new + edit) — name, slug, description, price (rupees), image_url, status; then multi-select of scents with quantity each.

- [ ] **`bundle-create.ts` / `bundle-update.ts`** — write bundle row + bulk replace `bundle_items`.

```ts
// inside bundle-update.ts after upserting the bundle
await supabaseAdmin.from('bundle_items').delete().eq('bundle_id', bundleId);
await supabaseAdmin
  .from('bundle_items')
  .insert(items.map((i) => ({ bundle_id: bundleId, scent_id: i.scent_id, quantity: i.quantity })));
```

- [ ] **Commit.**

---

## Task 5: Inventory page

**Files:** `src/pages/admin/inventory.astro`, `src/pages/api/admin/inventory-set.ts`

- [ ] **Page**: table of scents with current stock_qty + inline number input + Save button per row. Optimistic UI not needed — full page refresh after save is fine.

- [ ] **Endpoint**: validate id + stock_qty (≥ 0), update.

- [ ] **Commit.**

---

## Task 6: Discounts CRUD

**Files:** `src/pages/admin/discounts/{index,new,[code]}.astro`, 3 API endpoints

- [ ] **Schema** for discount input:

```ts
const Discount = z.object({
  code: z.string().regex(/^[A-Z0-9_-]{3,40}$/),
  type: z.enum(['percent', 'fixed']),
  value_rupees_or_percent: z.coerce.number().int().positive(),
  min_subtotal_rupees: z.coerce.number().int().min(0),
  max_uses: z.coerce.number().int().positive().optional().nullable(),
  active_from: z.string().datetime().optional().nullable(),
  active_until: z.string().datetime().optional().nullable(),
});
```

- [ ] **List page** — table of codes, type, value, used_count/max_uses, active window, edit/delete.

- [ ] **New/Edit page** — form with all fields; for `percent` value is whole percent (1–100), for `fixed` it's rupees (converted to paise on save).

- [ ] **Endpoints** — insert/update discounts table; for `fixed` store `value` in paise, for `percent` store the percent integer.

- [ ] **Commit.**

---

## Task 7: Auto-offers CRUD

**Files:** `src/pages/admin/offers/{index,new,[id]}.astro`, 3 API endpoints

Auto-offers are rule-based JSON. For v1, support exactly two rule shapes:

- `{ kind: 'free_shipping', min_subtotal: <paise> }`
- `{ kind: 'buy_x_get_y_pct', scent_id: <uuid>, min_qty: 2, pct_off_extra: 50 }` (placeholder; evaluator wired in Week 9)

- [ ] **New/Edit page**: pick rule kind via dropdown, fields adapt accordingly.

- [ ] **Endpoint**: store `rule_json` as JSONB.

- [ ] **Commit.**

---

## Task 8: Banners CRUD

**Files:** `src/pages/admin/banners/{index,new,[id]}.astro`, 3 API endpoints

- [ ] **Fields:** position (announcement | hero), image_url (optional), headline, cta_text, cta_url, active_from, active_until.

- [ ] **List** + **form** pages, **3 endpoints**.

- [ ] **Commit.**

---

## Acceptance criteria — end of Week 5

- [ ] `/admin` dashboard renders KPIs, latest orders, low-stock list with real DB data.
- [ ] All catalog CRUD pages work (products, scents, bundles, inventory) — create, edit, soft-archive.
- [ ] Discount codes, auto-offers, and banners can be created/edited/deleted from admin.
- [ ] Banner with `position='announcement'` appears on storefront via AnnouncementBar component.
- [ ] As a non-admin user, every `/admin/*` route returns 403.
- [ ] Service-role client is ONLY imported by `src/pages/api/admin/*` and `src/lib/admin/*` (grep to verify).
- [ ] `npx astro check` 0 errors; CI green.

## What we did NOT do in Week 5

- Orders / customers / reviews / reports / team / settings — Week 6
- Banner CMS rendering on home hero (full design) — Week 9
- Auto-offer evaluator logic at cart — Week 9
