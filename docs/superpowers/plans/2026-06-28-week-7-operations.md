# Week 7 — Operations Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Ship the entire operations dashboard — dark Kanban board, order detail with action buttons, AWB entry, status transitions, returns queue, inventory low-stock view.

**Architecture:** All `/ops/*` routes gated to role >= operations. Dark theme, distinct from storefront and admin. Mutations go through `/api/ops/*` endpoints using the same service-role pattern as admin. Status transitions follow a strict state machine: `paid → packed → shipped → delivered` plus `→ cancelled` or `→ returned` from valid states.

**Tech Stack:** Astro 4 · Supabase service-role · Zod

**Spec reference:** §§ 6.3, 9

---

## File structure

```
src/
├── components/ops/
│   ├── OpsShell.astro
│   ├── OpsTopbar.astro
│   ├── KanbanColumn.astro
│   ├── OrderCard.astro
│   ├── ActionButton.astro
│   └── AwbForm.astro
├── layouts/OpsLayout.astro
├── lib/ops/
│   ├── queue.ts                  # groupOrdersByColumn
│   ├── transitions.ts            # canTransition, applyTransition (state machine)
│   └── shipments.ts              # createOrUpdateShipment, markDelivered
└── pages/
    ├── ops/
    │   ├── index.astro                # Kanban
    │   ├── orders/[code].astro
    │   ├── returns.astro
    │   ├── inventory.astro
    │   └── delivered.astro
    └── api/ops/
        ├── mark-packed.ts
        ├── enter-awb.ts
        ├── mark-shipped.ts
        ├── mark-delivered.ts
        ├── return-approve.ts
        ├── return-reject.ts
        └── return-refunded.ts
```

---

## Task 1: Ops shell

- [ ] **`OpsLayout.astro`** — dark `#0F1620` background, Inter font, no sidebar (queue is the focus), top bar with brand + role badge + logout.

```astro
---
import '../styles/globals.css';
import OpsTopbar from '../components/ops/OpsTopbar.astro';
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
    <title>{title} · ops · qayra</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="font-ui min-h-screen bg-[#0F1620] text-[#E8ECF0]">
    <OpsTopbar title={title} userEmail={session?.email ?? ''} />
    <main class="mx-auto max-w-7xl px-4 py-4"><slot /></main>
  </body>
</html>
```

- [ ] **`OpsTopbar.astro`**

```astro
---
interface Props {
  title: string;
  userEmail: string;
}
const { title, userEmail } = Astro.props;
---

<header class="flex items-center justify-between border-b border-[#2A3340] bg-[#1A2330] px-4 py-3">
  <div class="flex items-center gap-3">
    <span class="font-semibold">qayra ops</span>
    <span
      class="text-champagne bg-champagne/15 rounded px-2 py-0.5 text-[10px] tracking-widest uppercase"
      >Operations</span
    >
    <span class="ml-3 text-sm text-[#E8ECF0]/60">/ {title}</span>
  </div>
  <div class="flex items-center gap-3 text-sm">
    <a href="/ops" class="opacity-70 hover:opacity-100">Queue</a>
    <a href="/ops/returns" class="opacity-70 hover:opacity-100">Returns</a>
    <a href="/ops/inventory" class="opacity-70 hover:opacity-100">Inventory</a>
    <a href="/ops/delivered" class="opacity-70 hover:opacity-100">Delivered</a>
    <span class="mx-2 text-[#E8ECF0]/50">|</span>
    <span class="text-[#E8ECF0]/70">{userEmail}</span>
    <form action="/api/auth/sign-out" method="post">
      <button class="underline opacity-70 hover:opacity-100">Sign out</button>
    </form>
  </div>
</header>
```

- [ ] **Commit.**

---

## Task 2: State machine for order transitions (TDD)

- [ ] **`tests/unit/transitions.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { canTransition } from '../../src/lib/ops/transitions';

describe('canTransition', () => {
  it('paid → packed allowed', () => expect(canTransition('paid', 'packed')).toBe(true));
  it('paid → shipped NOT allowed (must pack first)', () =>
    expect(canTransition('paid', 'shipped')).toBe(false));
  it('packed → shipped allowed', () => expect(canTransition('packed', 'shipped')).toBe(true));
  it('shipped → delivered allowed', () => expect(canTransition('shipped', 'delivered')).toBe(true));
  it('delivered → returned allowed', () =>
    expect(canTransition('delivered', 'returned')).toBe(true));
  it('cancelled is terminal', () => expect(canTransition('cancelled', 'paid')).toBe(false));
  it('cannot move back', () => expect(canTransition('shipped', 'packed')).toBe(false));
});
```

- [ ] **`src/lib/ops/transitions.ts`**

```ts
type Status = 'pending' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
const allowed: Record<Status, Status[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export function canTransition(from: string, to: string): boolean {
  return (allowed[from as Status] ?? []).includes(to as Status);
}
```

Run tests → PASS.

- [ ] **Commit.**

---

## Task 3: Queue (Kanban) dashboard

- [ ] **`src/lib/ops/queue.ts`**

```ts
import { supabaseAdmin } from '../supabase/admin';

export interface QueueOrder {
  id: string;
  code: string;
  status: string;
  payment_method: string;
  total: number;
  full_name: string | null;
  items_label: string;
  created_at: string;
}

export async function loadQueue(): Promise<{
  toPack: QueueOrder[];
  toAwb: QueueOrder[];
  inTransit: QueueOrder[];
}> {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(
      'id, code, status, payment_method, total, created_at, profile:profiles(full_name), order_items(name_snapshot, quantity)',
    )
    .in('status', ['paid', 'packed', 'shipped']);
  const map = (o: any): QueueOrder => ({
    id: o.id,
    code: o.code,
    status: o.status,
    payment_method: o.payment_method,
    total: o.total,
    full_name: o.profile?.full_name ?? null,
    items_label: (o.order_items ?? [])
      .map((i: any) => `${i.name_snapshot} × ${i.quantity}`)
      .join(', '),
    created_at: o.created_at,
  });
  return {
    toPack: (orders ?? []).filter((o: any) => o.status === 'paid').map(map),
    toAwb: (orders ?? []).filter((o: any) => o.status === 'packed').map(map),
    inTransit: (orders ?? []).filter((o: any) => o.status === 'shipped').map(map),
  };
}
```

- [ ] **`KanbanColumn.astro`**, **`OrderCard.astro`** — visual design from spec §9. Use dark surfaces, gold accents for urgent/COD.

- [ ] **`/ops/index.astro`**

```astro
---
import OpsLayout from '../../layouts/OpsLayout.astro';
import KanbanColumn from '../../components/ops/KanbanColumn.astro';
import OrderCard from '../../components/ops/OrderCard.astro';
import { loadQueue } from '../../lib/ops/queue';

const { toPack, toAwb, inTransit } = await loadQueue();
const totalQueue = toPack.length + toAwb.length + inTransit.length;
---

<OpsLayout title="Queue">
  <div
    class="text-champagne border-champagne/20 mb-4 flex items-center justify-between border bg-[#2A2010] px-4 py-3 text-sm"
  >
    <span>Today's queue: <strong>{totalQueue}</strong> orders need action</span>
    <span class="bg-champagne rounded-full px-2 py-0.5 text-xs font-semibold text-[#0F1620]"
      >{totalQueue}</span
    >
  </div>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
    <KanbanColumn title="To Pack" count={toPack.length} highlight>
      {
        toPack.map((o) => (
          <OrderCard order={o} action="Mark packed" actionHref={`/ops/orders/${o.code}`} urgent />
        ))
      }
    </KanbanColumn>
    <KanbanColumn title="Add AWB" count={toAwb.length}>
      {
        toAwb.map((o) => (
          <OrderCard order={o} action="+ Enter AWB" actionHref={`/ops/orders/${o.code}`} />
        ))
      }
    </KanbanColumn>
    <KanbanColumn title="In Transit" count={inTransit.length}>
      {
        inTransit.map((o) => (
          <OrderCard
            order={o}
            action="Mark delivered"
            actionHref={`/ops/orders/${o.code}`}
            secondary
          />
        ))
      }
    </KanbanColumn>
  </div>
</OpsLayout>
```

- [ ] **Commit.**

---

## Task 4: Order detail + action endpoints

- [ ] **`/ops/orders/[code].astro`** — full order info similar to admin's view but with **action buttons inline**:
  - If `status === 'paid'`: "Mark packed" button (POST `/api/ops/mark-packed`).
  - If `status === 'packed'`: Inline AWB form (courier name dropdown + AWB number input) → POST `/api/ops/enter-awb` which sets shipment + transitions status to `shipped`.
  - If `status === 'shipped'`: "Mark delivered" button.

  Courier dropdown values stored in `store_settings` (Week 6). Free-text fallback.

- [ ] **`/api/ops/mark-packed.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { canTransition } from '../../../lib/ops/transitions';

const Body = z.object({ order_id: z.string().uuid() });

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success) return new Response('bad request', { status: 400 });
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status, code')
    .eq('id', parsed.data.order_id)
    .single();
  if (!order || !canTransition(order.status, 'packed'))
    return new Response('invalid transition', { status: 409 });
  await supabaseAdmin.from('orders').update({ status: 'packed' }).eq('id', parsed.data.order_id);
  await supabaseAdmin
    .from('order_status_history')
    .insert({ order_id: parsed.data.order_id, status: 'packed', actor_id: me.userId });
  return ctx.redirect(`/ops/orders/${order.code}?info=Marked+packed`, 303);
};
```

- [ ] **`/api/ops/enter-awb.ts`**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { canTransition } from '../../../lib/ops/transitions';

const Body = z.object({
  order_id: z.string().uuid(),
  courier_name: z.string().min(1).max(80),
  awb_number: z.string().min(3).max(60),
});

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success) return new Response('bad request', { status: 400 });

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status, code')
    .eq('id', parsed.data.order_id)
    .single();
  if (!order || !canTransition(order.status, 'shipped'))
    return new Response('invalid transition', { status: 409 });

  await supabaseAdmin.from('shipments').upsert({
    order_id: parsed.data.order_id,
    courier_name: parsed.data.courier_name,
    awb_number: parsed.data.awb_number,
    dispatched_at: new Date().toISOString(),
  });
  await supabaseAdmin.from('orders').update({ status: 'shipped' }).eq('id', parsed.data.order_id);
  await supabaseAdmin.from('order_status_history').insert({
    order_id: parsed.data.order_id,
    status: 'shipped',
    actor_id: me.userId,
    note: `AWB ${parsed.data.awb_number} via ${parsed.data.courier_name}`,
  });
  return ctx.redirect(`/ops/orders/${order.code}?info=Shipped`, 303);
};
```

- [ ] **`/api/ops/mark-delivered.ts`** — same pattern: validates transition, updates status, sets `shipments.delivered_at`, logs history.

- [ ] **Commit.**

---

## Task 5: Returns queue

- [ ] **`/ops/returns.astro`** — list returns in status `requested` and `approved` with action buttons.
  - **Approve** → status `approved`. (Refund still pending physical return.)
  - **Reject** → status `rejected` with reason note.
  - **Mark refunded** → status `refunded`, sets order status `returned`, stores `refund_amount`.

- [ ] **Endpoints `return-approve.ts`, `return-reject.ts`, `return-refunded.ts`** — same shape.

- [ ] **Commit.**

---

## Task 6: Inventory low-stock + Delivered archive

- [ ] **`/ops/inventory.astro`** — read-only list of scents with stock_qty; same data as admin's inventory but ops can't edit (admin only). Highlight rows with stock < 20 in gold.

- [ ] **`/ops/delivered.astro`** — paginated archive of `delivered` and `returned` orders. Read-only.

- [ ] **Commit.**

---

## Task 7: E2E coverage

- [ ] **`tests/e2e/ops.spec.ts`** — sign in as a manually-promoted operations user (helper to upgrade role via service-role); place a COD order as customer; verify it shows in To Pack; click Mark packed; verify it shows in Add AWB; submit AWB form; verify in In Transit; mark delivered; verify in Delivered.

Helper to elevate a user during tests:

```ts
import { createClient } from '@supabase/supabase-js';
export async function setRoleForTest(userId: string, role: string) {
  const admin = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await admin.from('profiles').update({ role }).eq('id', userId);
}
```

- [ ] **Commit.**

---

## Acceptance criteria — end of Week 7

- [ ] `/ops` Kanban shows 3 columns with real counts; COD orders highlighted.
- [ ] Mark packed → moves to Add AWB column.
- [ ] AWB form sets courier_name + awb_number; status transitions to shipped.
- [ ] Mark delivered → moves to Delivered archive.
- [ ] Returns queue shows requested returns; approve/reject/refund all work.
- [ ] State machine prevents invalid transitions (verified by 409 from API).
- [ ] As customer, `/ops/*` returns 403.
- [ ] All unit tests pass; E2E full ops flow passes.

## What we did NOT do in Week 7

- Realtime subscription so a new order pings the ops Kanban without refresh — Week 8
- Reorder button (customer-side already exists; Week 8 adds polish)
