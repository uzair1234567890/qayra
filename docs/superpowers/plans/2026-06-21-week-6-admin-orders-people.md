
# Week 6 — Admin: Orders & People Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Wire admin's order management view (read-mostly — ops handles fulfilment in Week 7), customer list + detail, review moderation, reports, team management (granting operations/admin roles), and global store settings.

**Architecture:** Same `AdminLayout` shell from Week 5. All writes go through service-role client via `/api/admin/*`. Audit log entries written for sensitive actions (role changes, refunds, review hide).

**Tech Stack:** Astro 4 · Supabase service-role · Zod

**Spec reference:** §§ 6.2, 8

---

## File structure

```
src/
├── lib/admin/
│   ├── orders.ts
│   ├── customers.ts
│   ├── reviews.ts
│   ├── reports.ts
│   ├── team.ts
│   └── audit.ts
├── pages/admin/
│   ├── orders/
│   │   ├── index.astro
│   │   └── [code].astro
│   ├── customers/
│   │   ├── index.astro
│   │   └── [id].astro
│   ├── reviews.astro
│   ├── reports.astro
│   ├── team.astro
│   └── settings.astro
└── pages/api/admin/
    ├── order-add-note.ts
    ├── order-cancel.ts
    ├── review-publish.ts
    ├── review-hide.ts
    ├── team-grant-role.ts
    ├── team-revoke-role.ts
    └── settings-update.ts

supabase/migrations/
└── 20260621000000_store_settings.sql       # key/value JSON store
```

---

## Task 1: Store settings table + audit helper

- [ ] **Migration**: create `public.store_settings` (singleton key-value):

```sql
create table public.store_settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;
create policy "store_settings: admin all" on public.store_settings for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
-- Seed defaults
insert into public.store_settings (key, value) values
  ('shipping',     '{"flat_paise":5000,"free_threshold_paise":49900}'::jsonb),
  ('cod',          '{"surcharge_paise":5000,"enabled":true}'::jsonb),
  ('store_name',   '"qayra"'::jsonb),
  ('support_email','"hello@qayra.in"'::jsonb);
```

Run `npx supabase db push` + regenerate types.

- [ ] **`src/lib/admin/audit.ts`**

```ts
import { supabaseAdmin } from '../supabase/admin';
export async function audit(
  actorId: string,
  action: string,
  target: { table: string; id: string },
  payload?: any,
) {
  await supabaseAdmin.from('audit_log').insert({
    actor_id: actorId,
    action,
    target_table: target.table,
    target_id: target.id,
    payload: payload ?? null,
  });
}
```

- [ ] **Commit.**

---

## Task 2: Orders list + detail (admin view)

- [ ] **`src/lib/admin/orders.ts`** — `listOrders({status?, search?, page, pageSize})`, `getOrder(code)` returning full order incl. items, history, shipment, return.

- [ ] **`/admin/orders/index.astro`** — table of orders, filters (status pills, date range, search by code/customer), pagination (20 per page). Use DataTable + StatusPill from Week 5.

- [ ] **`/admin/orders/[code].astro`** — full order view: KPIs (total, profit not yet, payment method), items, address, status history timeline, shipment block, return block, internal notes section, "Cancel order" button (only for `pending`/`paid` and before `packed`). All status mutations (mark packed, enter AWB, etc.) are handled by ops in Week 7 — admin view is read-mostly here.

- [ ] **`order-add-note.ts`** endpoint — insert into `order_status_history` with status unchanged + note text + actor_id.

- [ ] **`order-cancel.ts`** endpoint — update status to `cancelled`, audit log, refund flag (full implementation Week 11).

- [ ] **Commit.**

---

## Task 3: Customers list + detail

- [ ] **`src/lib/admin/customers.ts`** — `listCustomers({search, page, pageSize})`, `getCustomer(id)` joining profile + orders count + lifetime spend + addresses + last seen.

- [ ] **`/admin/customers/index.astro`** — table: name, email, orders, lifetime spend, last order, joined.

- [ ] **`/admin/customers/[id].astro`** — left panel customer info, right panel orders list with link to order detail. No editing in v1 (founder concession — manual via Supabase if needed).

- [ ] **Commit.**

---

## Task 4: Reviews moderation

- [ ] **`/admin/reviews.astro`** — three tabs: Pending, Published, Hidden. Each shows reviews with scent name, customer, rating, body, photos, status. Buttons: Publish, Hide.

- [ ] **`review-publish.ts` / `review-hide.ts`** — update status + audit.

- [ ] **Commit.**

---

## Task 5: Reports

- [ ] **`src/lib/admin/reports.ts`** — aggregate functions: revenueByDay(rangeDays), topScents(rangeDays), codVsPrepaidSplit(rangeDays), aovOverTime(rangeDays), rtoRate(rangeDays) [phase-2 placeholder].

```ts
import { supabaseAdmin } from '../supabase/admin';

export async function revenueByDay(rangeDays: number) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data } = await supabaseAdmin
    .from('orders')
    .select('created_at, total, status, payment_status')
    .gte('created_at', since)
    .in('status', ['paid', 'packed', 'shipped', 'delivered']);
  const buckets = new Map<string, number>();
  for (const o of data ?? []) {
    const day = o.created_at.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + (o.total ?? 0));
  }
  return Array.from(buckets.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export async function topScents(rangeDays: number, limit = 5) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data } = await supabaseAdmin
    .from('order_items')
    .select('quantity, price_snapshot, scent:scents(name), order:orders!inner(created_at, status)')
    .gte('order.created_at', since)
    .in('order.status', ['paid', 'packed', 'shipped', 'delivered']);
  const agg = new Map<string, { qty: number; revenue: number }>();
  for (const it of data ?? []) {
    const name = (it.scent as any)?.name ?? '—';
    const a = agg.get(name) ?? { qty: 0, revenue: 0 };
    a.qty += it.quantity;
    a.revenue += it.price_snapshot * it.quantity;
    agg.set(name, a);
  }
  return Array.from(agg.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function codVsPrepaidSplit(rangeDays: number) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data } = await supabaseAdmin
    .from('orders')
    .select('payment_method')
    .gte('created_at', since);
  const cod = (data ?? []).filter((o) => o.payment_method === 'cod').length;
  const prepaid = (data ?? []).length - cod;
  return { cod, prepaid };
}
```

- [ ] **`/admin/reports.astro`** — range selector, KPIs grid, three sections: Revenue by day (simple inline bar chart with divs), Top scents (table), Payment split (donut via two divs sized by ratio).

- [ ] **Commit.**

---

## Task 6: Team management

- [ ] **`/admin/team.astro`** — table of profiles where role in (operations, admin). Form at top: invite by email (creates a Supabase Auth user via service-role and immediately sets role).

```ts
// in team-grant-role.ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { audit } from '../../../lib/admin/audit';

const Body = z.object({
  email: z.string().email(),
  role: z.enum(['operations', 'admin']),
});

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'admin');
  if (me instanceof Response) return me;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success) return ctx.redirect('/admin/team?error=Invalid', 303);

  // Find or invite user
  const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    parsed.data.email,
  );
  if (error && !error.message.includes('already'))
    return ctx.redirect(`/admin/team?error=${encodeURIComponent(error.message)}`, 303);

  // Look up profile id (existing or freshly created)
  const { data: user } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', invited?.user?.id ?? '')
    .maybeSingle();
  if (!user) return ctx.redirect('/admin/team?error=Could+not+resolve+user', 303);

  await supabaseAdmin.from('profiles').update({ role: parsed.data.role }).eq('id', user.id);
  await audit(
    me.userId,
    'team.grant_role',
    { table: 'profiles', id: user.id },
    { role: parsed.data.role },
  );
  return ctx.redirect('/admin/team?info=Role+granted', 303);
};
```

- [ ] **`team-revoke-role.ts`** — set role back to `customer`, audit log. Block revoking own role.

- [ ] **Commit.**

---

## Task 7: Settings

- [ ] **`/admin/settings.astro`** — read `store_settings` for each key, render labeled inputs:
  - Store name (text)
  - Support email (email)
  - Shipping: flat rate (rupees), free threshold (rupees)
  - COD: enabled (toggle), surcharge (rupees)

- [ ] **`settings-update.ts`** — accept partial settings, validate per key, upsert with audit log.

- [ ] **Commit.**

---

## Acceptance criteria — end of Week 6

- [ ] `/admin/orders` lists every order; filter by status works; pagination works.
- [ ] `/admin/orders/[code]` shows full order detail with notes/cancel.
- [ ] `/admin/customers` table + detail page show real data.
- [ ] `/admin/reviews` lets admin publish/hide.
- [ ] `/admin/reports` shows revenue/top-scents/COD-split.
- [ ] `/admin/team` lets admin invite ops/admin users, role granting writes to `profiles` and `audit_log`.
- [ ] `/admin/settings` reads/writes `store_settings` table.
- [ ] As a customer or operations role, `/admin/team` and `/admin/settings` return 403.
- [ ] CI green; tests pass.

## What we did NOT do in Week 6

- Operations dashboard — Week 7
- Realtime new-order banner in admin nav — Week 8
- Settings effect on customer-facing pages (shipping rate read from settings) — Week 9
