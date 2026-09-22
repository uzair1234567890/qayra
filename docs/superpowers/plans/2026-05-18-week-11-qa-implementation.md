# Week 11 — QA & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the QA & Hardening spec at `docs/superpowers/specs/2026-05-18-week-11-qa-design.md` end-to-end — fulfilment E2E, 8-file RLS audit, two CI workflows, DSN-guarded Sentry, full SEO surface (sitemap + JSON-LD + robots), mobile emulation + hand-test checklist, copy review, secrets checklist.

**Architecture:** Two test runtimes — Playwright for browser flows (fulfilment, mobile), Vitest for RLS (direct JWT calls). All external services degrade gracefully: Sentry no-op without DSN, Razorpay prepaid spec skips without `rzp_` key, Lighthouse uses temporary public storage.

**Tech Stack:** Astro 6 · Tailwind v4 · Supabase · Playwright · Vitest · @sentry/astro · @astrojs/sitemap · Lighthouse CI

**Already complete (do not re-do):** Original-plan Tasks 1, 2, 4 (test user fixture, full purchase E2E, admin CRUD smoke) + partial RLS helpers scaffold.

---

## File structure (created or modified by this plan)

```
tests/
├── e2e/
│   ├── full-fulfilment-flow.spec.ts   [MODIFY — replace 12-line stub]
│   ├── mobile.spec.ts                 [CREATE]
│   └── mobile-checklist.md            [CREATE]
├── rls/
│   ├── COVERAGE.md                    [CREATE]
│   ├── profiles.rls.test.ts           [CREATE]
│   ├── catalog.rls.test.ts            [CREATE]
│   ├── cart.rls.test.ts               [CREATE]
│   ├── orders.rls.test.ts             [CREATE]
│   ├── marketing.rls.test.ts          [CREATE]
│   ├── reviews.rls.test.ts            [CREATE]
│   ├── admin.rls.test.ts              [CREATE]
│   └── public-write.rls.test.ts       [CREATE]
└── unit/
    ├── seo/jsonld.test.ts             [CREATE]
    └── sentry/scrubber.test.ts        [CREATE]

sentry.client.config.ts                 [CREATE — repo root]
sentry.server.config.ts                 [CREATE — repo root]

src/
├── lib/
│   ├── sentry.ts                      [CREATE]
│   └── seo/jsonld.ts                  [CREATE]
├── components/
│   └── seo/
│       ├── OrgJsonLd.astro            [CREATE]
│       ├── ProductJsonLd.astro        [CREATE]
│       └── BreadcrumbJsonLd.astro     [CREATE]
├── layouts/
│   └── PublicLayout.astro             [MODIFY — add canonical + OrgJsonLd + default OG]
└── pages/
    ├── scent/[slug].astro             [MODIFY — add ProductJsonLd + BreadcrumbJsonLd]
    └── bundles/[slug].astro           [MODIFY — add ProductJsonLd + BreadcrumbJsonLd]

public/
├── robots.txt                          [CREATE]
└── og-default.svg                      [CREATE — vector placeholder, swap to .png later]

docs/superpowers/
├── secrets-checklist.md                [CREATE]
└── copy-review-checklist.md            [CREATE]

astro.config.mjs                        [MODIFY — add site, @astrojs/sitemap, @sentry/astro]
lighthouserc.cjs                        [CREATE]
.env.example                            [MODIFY — add PUBLIC_SENTRY_DSN]
package.json                            [MODIFY — new deps via npm install]

.github/workflows/
├── e2e.yml                             [CREATE]
└── lighthouse.yml                      [CREATE]
```

---

# Task 1: Fulfilment E2E — replace the stub

**Files:**
- Modify: `tests/e2e/full-fulfilment-flow.spec.ts` (currently a 12-line stub)
- Reference (do not modify): `tests/fixtures/users.ts`, `tests/e2e/full-purchase-flow.spec.ts`

This is an E2E test. We don't write a "failing assertion first" — the test IS the assertion. The discipline is:
1. Write the spec.
2. Run it; expect any failure to be an actual UI/wiring bug, fix it.
3. Re-run until green.
4. Commit.

### Why this design

- **One linear test** rather than 7 sub-tests so the order is guaranteed and one cleanup pass handles everything.
- **Three separate `BrowserContext`s** (customer, ops, admin) prevent storage-state collisions; we switch by activating the right page instead of signing out.
- **Per-run tag** in `orders.notes` lets `afterAll` clean up exactly what this run created, even if a step crashed.
- **Reuses the seeded `azeziya` scent** — no catalog mutation, no race with other tests.

### Step 1: Write the test

- [ ] **Replace the entire contents of `tests/e2e/full-fulfilment-flow.spec.ts` with:**

```ts
/**
 * Full fulfilment flow — customer → ops → admin → customer → admin → anonymous.
 *
 * One COD order walked through every role lifecycle in a single linear test.
 * Three persistent BrowserContexts (one per role) avoid mid-test sign-in/out.
 * Cleanup is keyed on a per-run tag stored in orders.notes so failures never
 * leak rows.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';

const SCENT_SLUG = 'azeziya';
const RUN_TAG = `qa-fulfilment-${Date.now()}`;

const admin: SupabaseClient = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let customer: TestUser;
let ops: TestUser;
let adminUser: TestUser;

async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/sign-in'), {
    timeout: 15_000,
  });
}

test.describe('full fulfilment flow', () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    [customer, ops, adminUser] = await Promise.all([
      makeUser('customer'),
      makeUser('operations'),
      makeUser('admin'),
    ]);
  });

  test.afterAll(async () => {
    // Clean up rows tagged with RUN_TAG (orders.notes uses ILIKE match).
    try {
      const { data: tagged } = await admin
        .from('orders')
        .select('id')
        .ilike('notes', `%${RUN_TAG}%`);
      const ids = (tagged ?? []).map((r) => r.id);
      if (ids.length) {
        // Cascade: shipments + order_items + order_status_history + reviews.
        await admin.from('reviews').delete().in('order_id', ids);
        await admin.from('shipments').delete().in('order_id', ids);
        await admin.from('order_status_history').delete().in('order_id', ids);
        await admin.from('order_items').delete().in('order_id', ids);
        await admin.from('orders').delete().in('id', ids);
      }
    } finally {
      await Promise.allSettled([
        dropUser(customer.id),
        dropUser(ops.id),
        dropUser(adminUser.id),
      ]);
    }
  });

  test('order travels customer → ops → admin → customer → admin → anon', async ({
    browser,
  }) => {
    const customerCtx: BrowserContext = await browser.newContext();
    const opsCtx: BrowserContext = await browser.newContext();
    const adminCtx: BrowserContext = await browser.newContext();
    const anonCtx: BrowserContext = await browser.newContext();

    try {
      const customerPage = await customerCtx.newPage();
      const opsPage = await opsCtx.newPage();
      const adminPage = await adminCtx.newPage();
      const anonPage = await anonCtx.newPage();

      // Sign in the three roles in parallel.
      await Promise.all([
        signIn(customerPage, customer),
        signIn(opsPage, ops),
        signIn(adminPage, adminUser),
      ]);

      // -----------------------------------------------------------------
      // Step 1: customer places a COD order tagged with RUN_TAG.
      // -----------------------------------------------------------------
      await customerPage.goto(`/scent/${SCENT_SLUG}`);
      const addResp = customerPage.waitForResponse(
        (r) => r.url().includes('/api/cart/add') && r.status() === 200,
      );
      await customerPage.getByRole('button', { name: /add to bag/i }).click();
      await addResp;

      await customerPage.goto('/checkout');
      await customerPage.fill('input[name=email]', customer.email);
      await customerPage.fill('input[name=phone]', '9876543210');
      await customerPage.fill('input[name=name]', 'QA Fulfilment');
      await customerPage.fill('input[name=line1]', '42 Test Street');
      await customerPage.fill('input[name=city]', 'Mumbai');
      await customerPage.fill('input[name=state]', 'Maharashtra');
      await customerPage.fill('input[name=pincode]', '400001');
      await customerPage.locator('input[name=payment_method][value=cod]').check();

      const codResp = customerPage.waitForResponse(
        (r) => r.url().includes('/api/checkout/cod-place') && r.status() === 200,
      );
      await customerPage.getByRole('button', { name: /place order/i }).click();
      const { code: orderCode } = (await (await codResp).json()) as {
        code: string;
      };
      expect(orderCode).toBeTruthy();
      await expect(customerPage).toHaveURL(/checkout\/success\?code=/, {
        timeout: 15_000,
      });

      // Tag the order so afterAll can find it. Look up id by code.
      const { data: orderRow } = await admin
        .from('orders')
        .select('id, status, payment_method')
        .eq('code', orderCode)
        .maybeSingle();
      expect(orderRow).toBeTruthy();
      expect(orderRow!.status).toBe('placed');
      expect(orderRow!.payment_method).toBe('cod');
      await admin
        .from('orders')
        .update({ notes: RUN_TAG })
        .eq('id', orderRow!.id);
      const orderId = orderRow!.id;

      // -----------------------------------------------------------------
      // Step 2: ops sees order in To Pack, marks packed.
      // -----------------------------------------------------------------
      await opsPage.goto('/ops');
      await expect(
        opsPage.getByRole('heading', { name: /to pack/i }),
      ).toBeVisible({ timeout: 10_000 });
      // Click into the order detail.
      await opsPage.goto(`/ops/orders/${orderCode}`);
      const packResp = opsPage.waitForResponse(
        (r) => r.url().includes('/api/ops/orders/') && r.status() < 400,
      );
      await opsPage.getByRole('button', { name: /mark packed/i }).click();
      await packResp;
      const { data: afterPack } = await admin
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      expect(afterPack!.status).toBe('packed');

      // -----------------------------------------------------------------
      // Step 3: ops enters AWB, marks delivered.
      // -----------------------------------------------------------------
      await opsPage.fill('input[name=awb]', `TEST-AWB-${Date.now()}`);
      await opsPage.fill('input[name=carrier]', 'TestCarrier');
      const awbResp = opsPage.waitForResponse(
        (r) => r.url().includes('/api/ops/orders/') && r.status() < 400,
      );
      await opsPage.getByRole('button', { name: /enter awb|save awb/i }).click();
      await awbResp;
      const { data: shipmentRow } = await admin
        .from('shipments')
        .select('id, awb')
        .eq('order_id', orderId)
        .maybeSingle();
      expect(shipmentRow).toBeTruthy();
      expect(shipmentRow!.awb).toMatch(/TEST-AWB-/);

      const deliverResp = opsPage.waitForResponse(
        (r) => r.url().includes('/api/ops/orders/') && r.status() < 400,
      );
      await opsPage.getByRole('button', { name: /mark delivered/i }).click();
      await deliverResp;
      const { data: afterDeliver } = await admin
        .from('orders')
        .select('status, delivered_at')
        .eq('id', orderId)
        .single();
      expect(afterDeliver!.status).toBe('delivered');
      expect(afterDeliver!.delivered_at).toBeTruthy();

      // -----------------------------------------------------------------
      // Step 4: customer sees delivered timeline + AWB visible.
      // -----------------------------------------------------------------
      await customerPage.goto(`/account/orders/${orderCode}`);
      await expect(customerPage.getByText(/delivered/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(customerPage.getByText(/TEST-AWB-/i)).toBeVisible();

      // -----------------------------------------------------------------
      // Step 5: customer submits a 5-star review.
      // -----------------------------------------------------------------
      await customerPage.goto(`/scent/${SCENT_SLUG}`);
      // The review form is rendered for customers who have a delivered order.
      await customerPage.locator('input[name=rating][value="5"]').check();
      await customerPage.fill(
        'textarea[name=body]',
        `QA fulfilment review ${RUN_TAG}`,
      );
      const reviewResp = customerPage.waitForResponse(
        (r) => r.url().includes('/api/reviews/create') && r.status() < 400,
      );
      await customerPage
        .getByRole('button', { name: /submit review|post review/i })
        .click();
      await reviewResp;
      const { data: reviewRow } = await admin
        .from('reviews')
        .select('id, published')
        .ilike('body', `%${RUN_TAG}%`)
        .single();
      expect(reviewRow).toBeTruthy();
      expect(reviewRow!.published).toBe(false);

      // -----------------------------------------------------------------
      // Step 6: admin publishes the review.
      // -----------------------------------------------------------------
      await adminPage.goto('/admin/reviews?tab=pending');
      // Find the row for our review and click its publish form/button.
      const reviewRowLocator = adminPage.locator(
        `tr:has-text("${RUN_TAG}")`,
      );
      await expect(reviewRowLocator).toBeVisible({ timeout: 10_000 });
      const publishResp = adminPage.waitForResponse(
        (r) => r.url().includes('/api/admin/reviews/') && r.status() < 400,
      );
      await reviewRowLocator
        .getByRole('button', { name: /publish/i })
        .click();
      await publishResp;
      const { data: afterPublish } = await admin
        .from('reviews')
        .select('published')
        .eq('id', reviewRow!.id)
        .single();
      expect(afterPublish!.published).toBe(true);

      // -----------------------------------------------------------------
      // Step 7: anonymous PDP shows the published review.
      // -----------------------------------------------------------------
      await anonPage.goto(`/scent/${SCENT_SLUG}`);
      await expect(anonPage.getByText(RUN_TAG)).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await Promise.allSettled([
        customerCtx.close(),
        opsCtx.close(),
        adminCtx.close(),
        anonCtx.close(),
      ]);
    }
  });
});
```

- [ ] **Step 2: Stage the file and run it**

```bash
git add tests/e2e/full-fulfilment-flow.spec.ts
npm run test:e2e -- tests/e2e/full-fulfilment-flow.spec.ts
```

Expected: test runs end-to-end. If it fails, the failure is almost certainly one of:
- A button name mismatch — use `npm run test:e2e:ui` to inspect the actual button text and update the regex.
- An API path mismatch on the ops detail page — grep `src/pages/api/ops/orders/` for the actual endpoint names and update `waitForResponse` URL fragments.
- The review form not showing because the order is not yet "delivered" in the user's session view — check that `Astro.cookies` propagation is happening; reloading `customerPage.goto('/account/orders/<code>')` before going back to the PDP usually fixes timing.

- [ ] **Step 3: Iterate until green.** Capture trace on first failure with `--trace on` and use `npx playwright show-trace test-results/.../trace.zip` if needed.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/full-fulfilment-flow.spec.ts
git commit -m "test(e2e): full fulfilment flow — customer → ops → admin → review publish"
```

---

# Task 2: RLS audit — 8 grouped files + COVERAGE.md

The 8 files all follow the same shape. We build them in dependency order (profiles first, since orders/reviews depend on a customer profile existing), running each file's tests before committing.

## Task 2.0: Add `vitest.config.ts` setup for RLS test path

**Files:**
- Read: `vitest.config.ts` (verify it picks up `tests/rls/**` and `tests/unit/**`)

- [ ] **Step 1: Inspect current vitest config**

```bash
cat vitest.config.ts
```

If `tests/rls/**` and `tests/unit/**` are NOT both included, update the `include` glob to:

```ts
include: ['tests/unit/**/*.test.ts', 'tests/rls/**/*.test.ts', 'src/**/*.test.ts'],
```

Set a longer timeout for RLS tests (Supabase round-trips):

```ts
test: {
  testTimeout: 15_000,
  hookTimeout: 30_000,
  // ...existing config...
},
```

- [ ] **Step 2: Run vitest to confirm config still loads**

```bash
npm run test:unit -- --run
```

Expected: existing unit tests still pass; no new tests yet.

- [ ] **Step 3: Commit if config changed**

```bash
git add vitest.config.ts
git commit -m "test(rls): widen vitest include + bump timeouts for RLS round-trips"
```

## Task 2.1: profiles + addresses RLS

**Files:**
- Create: `tests/rls/profiles.rls.test.ts`

### Why

`profiles` is the gateway table — every other table has a `profile_id` FK. Auth + role escalation attacks start here.

### Step 1: Write the test file

- [ ] **Create `tests/rls/profiles.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;
let ops: TestUser;
let adminUser: TestUser;

beforeAll(async () => {
  [buyer, other, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(other.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('profiles RLS', () => {
  it('anon: SELECT returns empty', async () => {
    const { data } = await anonClient().from('profiles').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: sees only own profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('profiles').select('id').limit(10);
    expect(data?.map((r) => r.id)).toEqual([buyer.id]);
  });

  it('customer: cannot UPDATE another customer profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error, count } = await c
      .from('profiles')
      .update({ full_name: 'HACKED' })
      .eq('id', other.id)
      .select('id', { count: 'exact' });
    // Either explicit RLS denial OR silent no-op (count === 0).
    expect(error !== null || count === 0).toBe(true);
  });

  it('customer: cannot change own role', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', buyer.id);
    const { data } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', buyer.id)
      .single();
    expect(data!.role).toBe('customer');
  });

  it('ops: sees all profiles', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data } = await c.from('profiles').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('admin: sees all profiles', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { data } = await c.from('profiles').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

describe('addresses RLS', () => {
  let addrId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('addresses')
      .insert({
        profile_id: buyer.id,
        full_name: 'QA Buyer',
        phone: '9999999999',
        line1: '1 Test',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        is_default: true,
      })
      .select('id')
      .single();
    addrId = data!.id;
  });

  afterAll(async () => {
    await adminClient.from('addresses').delete().eq('id', addrId);
  });

  it('anon: SELECT returns empty', async () => {
    const { data } = await anonClient().from('addresses').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: sees only own address', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('addresses').select('id, profile_id');
    expect((data ?? []).every((r) => r.profile_id === buyer.id)).toBe(true);
  });

  it('customer: cannot see another customer address', async () => {
    const c = await signedInAs(other.email, other.password);
    const { data } = await c
      .from('addresses')
      .select('id')
      .eq('id', addrId);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot INSERT address for another profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('addresses').insert({
      profile_id: other.id,
      full_name: 'Spoof',
      phone: '0000000000',
      line1: 'x',
      city: 'x',
      state: 'x',
      pincode: '000000',
    });
    expect(error).not.toBeNull();
  });

  it('ops: sees all addresses', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data } = await c.from('addresses').select('id');
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the file**

```bash
npm run test:unit -- tests/rls/profiles.rls.test.ts
```

Expected: every test passes. If any assertion fails, the failure is a real RLS gap — fix the policy in a new migration, not the test.

- [ ] **Step 3: Commit**

```bash
git add tests/rls/profiles.rls.test.ts
git commit -m "test(rls): profiles + addresses — anon/customer/cross-customer/ops/admin matrix"
```

## Task 2.2: catalog RLS (products, scents, bundles, bundle_items)

**Files:**
- Create: `tests/rls/catalog.rls.test.ts`

### Why

Catalog is publicly readable but only admin should write. Cross-cutting: bundle_items joins bundles + scents and needs RLS at both layers.

### Step 1: Write the test file

- [ ] **Create `tests/rls/catalog.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let ops: TestUser;
let adminUser: TestUser;
const suffix = Date.now();

beforeAll(async () => {
  [buyer, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('products RLS', () => {
  it('anon: can SELECT active products', async () => {
    const { data, error } = await anonClient()
      .from('products')
      .select('id, status')
      .eq('status', 'active')
      .limit(5);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT product', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('products').insert({
      slug: `qa-rls-${suffix}`,
      name: 'qa',
      base_price: 100,
      status: 'active',
    });
    expect(error).not.toBeNull();
  });

  it('ops: cannot INSERT product', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c.from('products').insert({
      slug: `qa-ops-${suffix}`,
      name: 'qa',
      base_price: 100,
      status: 'active',
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT product', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const slug = `qa-admin-${suffix}`;
    const { error } = await c.from('products').insert({
      slug,
      name: 'qa',
      base_price: 100,
      status: 'active',
    });
    expect(error).toBeNull();
    await adminClient.from('products').delete().eq('slug', slug);
  });
});

describe('scents RLS', () => {
  it('anon: can SELECT active scents', async () => {
    const { data } = await anonClient()
      .from('scents')
      .select('id')
      .eq('active', true)
      .limit(5);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot UPDATE stock', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data: any_scent } = await adminClient
      .from('scents')
      .select('id, stock_qty')
      .limit(1)
      .single();
    const original = any_scent!.stock_qty;
    await c
      .from('scents')
      .update({ stock_qty: 99999 })
      .eq('id', any_scent!.id);
    const { data: after } = await adminClient
      .from('scents')
      .select('stock_qty')
      .eq('id', any_scent!.id)
      .single();
    expect(after!.stock_qty).toBe(original);
  });

  it('ops: can UPDATE stock_qty (inventory page)', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data: any_scent } = await adminClient
      .from('scents')
      .select('id, stock_qty')
      .limit(1)
      .single();
    const original = any_scent!.stock_qty;
    const { error } = await c
      .from('scents')
      .update({ stock_qty: original })
      .eq('id', any_scent!.id);
    expect(error).toBeNull();
  });
});

describe('bundles + bundle_items RLS', () => {
  it('anon: can SELECT active bundles', async () => {
    const { data } = await anonClient()
      .from('bundles')
      .select('id')
      .eq('status', 'active');
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('anon: can SELECT bundle_items (read-through for PDP)', async () => {
    const { data } = await anonClient().from('bundle_items').select('id').limit(1);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT bundle', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('bundles').insert({
      slug: `qa-bundle-${suffix}`,
      name: 'qa',
      price: 100,
      status: 'active',
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT bundle', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const slug = `qa-admin-bundle-${suffix}`;
    const { error } = await c.from('bundles').insert({
      slug,
      name: 'qa',
      price: 100,
      status: 'active',
    });
    expect(error).toBeNull();
    await adminClient.from('bundles').delete().eq('slug', slug);
  });
});
```

- [ ] **Step 2: Run the file**

```bash
npm run test:unit -- tests/rls/catalog.rls.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/rls/catalog.rls.test.ts
git commit -m "test(rls): catalog — public-read, admin-write, ops-stock-only"
```

## Task 2.3: cart RLS (carts, cart_items)

**Files:**
- Create: `tests/rls/cart.rls.test.ts`

### Step 1: Write the test file

- [ ] **Create `tests/rls/cart.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;

beforeAll(async () => {
  [buyer, other] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([dropUser(buyer.id), dropUser(other.id)]);
});

describe('carts RLS', () => {
  it('customer: can INSERT own cart', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('carts').insert({ profile_id: buyer.id });
    expect(error).toBeNull();
  });

  it('customer: cannot INSERT cart for another profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('carts').insert({ profile_id: other.id });
    expect(error).not.toBeNull();
  });

  it('customer: cannot SELECT another buyer cart', async () => {
    // Seed a cart for `other` via service-role.
    const { data: othersCart } = await adminClient
      .from('carts')
      .insert({ profile_id: other.id })
      .select('id')
      .single();
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('carts')
      .select('id')
      .eq('id', othersCart!.id);
    expect(data ?? []).toHaveLength(0);
    await adminClient.from('carts').delete().eq('id', othersCart!.id);
  });

  it('anon: cannot SELECT authenticated carts', async () => {
    const { data: anonCart } = await adminClient
      .from('carts')
      .insert({ profile_id: buyer.id })
      .select('id')
      .single();
    const { data } = await anonClient()
      .from('carts')
      .select('id')
      .eq('id', anonCart!.id);
    expect(data ?? []).toHaveLength(0);
    await adminClient.from('carts').delete().eq('id', anonCart!.id);
  });
});

describe('cart_items RLS', () => {
  let buyerCartId: string;
  let scentId: string;

  beforeAll(async () => {
    const { data: cart } = await adminClient
      .from('carts')
      .insert({ profile_id: buyer.id })
      .select('id')
      .single();
    buyerCartId = cart!.id;
    const { data: scent } = await adminClient
      .from('scents')
      .select('id')
      .eq('active', true)
      .limit(1)
      .single();
    scentId = scent!.id;
  });

  afterAll(async () => {
    await adminClient.from('cart_items').delete().eq('cart_id', buyerCartId);
    await adminClient.from('carts').delete().eq('id', buyerCartId);
  });

  it('customer: can INSERT item in own cart', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('cart_items').insert({
      cart_id: buyerCartId,
      scent_id: scentId,
      quantity: 1,
    });
    expect(error).toBeNull();
  });

  it('customer: cannot INSERT item in another buyer cart', async () => {
    const { data: othersCart } = await adminClient
      .from('carts')
      .insert({ profile_id: other.id })
      .select('id')
      .single();
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('cart_items').insert({
      cart_id: othersCart!.id,
      scent_id: scentId,
      quantity: 1,
    });
    expect(error).not.toBeNull();
    await adminClient.from('carts').delete().eq('id', othersCart!.id);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:unit -- tests/rls/cart.rls.test.ts
git add tests/rls/cart.rls.test.ts
git commit -m "test(rls): carts + cart_items — owner-only writes, no cross-customer reads"
```

## Task 2.4: orders RLS (orders, order_items, order_status_history, shipments, returns)

**Files:**
- Create: `tests/rls/orders.rls.test.ts`

### Step 1: Write the test file

- [ ] **Create `tests/rls/orders.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;
let ops: TestUser;
let adminUser: TestUser;
let orderId: string;
let othersOrderId: string;
let scentId: string;
const RUN_TAG = `qa-rls-orders-${Date.now()}`;

beforeAll(async () => {
  [buyer, other, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
  const { data: scent } = await adminClient
    .from('scents')
    .select('id')
    .eq('active', true)
    .limit(1)
    .single();
  scentId = scent!.id;
  const { data: o1 } = await adminClient
    .from('orders')
    .insert({
      profile_id: buyer.id,
      code: `QA-${Date.now()}-A`,
      status: 'placed',
      payment_method: 'cod',
      subtotal: 100,
      shipping: 0,
      total: 100,
      notes: RUN_TAG,
    })
    .select('id')
    .single();
  orderId = o1!.id;
  const { data: o2 } = await adminClient
    .from('orders')
    .insert({
      profile_id: other.id,
      code: `QA-${Date.now()}-B`,
      status: 'placed',
      payment_method: 'cod',
      subtotal: 100,
      shipping: 0,
      total: 100,
      notes: RUN_TAG,
    })
    .select('id')
    .single();
  othersOrderId = o2!.id;
});

afterAll(async () => {
  const { data: tagged } = await adminClient
    .from('orders')
    .select('id')
    .ilike('notes', `%${RUN_TAG}%`);
  const ids = (tagged ?? []).map((r) => r.id);
  if (ids.length) {
    await adminClient.from('shipments').delete().in('order_id', ids);
    await adminClient.from('order_items').delete().in('order_id', ids);
    await adminClient.from('order_status_history').delete().in('order_id', ids);
    await adminClient.from('orders').delete().in('id', ids);
  }
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(other.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('orders RLS', () => {
  it('anon: SELECT returns empty', async () => {
    const { data } = await anonClient().from('orders').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: sees only own orders', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('orders').select('id, profile_id');
    expect((data ?? []).every((r) => r.profile_id === buyer.id)).toBe(true);
  });

  it('customer: cannot see another buyer order by id', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('orders')
      .select('id')
      .eq('id', othersOrderId);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot INSERT order for another profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('orders').insert({
      profile_id: other.id,
      code: `QA-FORGE-${Date.now()}`,
      status: 'placed',
      payment_method: 'cod',
      subtotal: 100,
      shipping: 0,
      total: 100,
      notes: RUN_TAG,
    });
    expect(error).not.toBeNull();
  });

  it('customer: cannot UPDATE status', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);
    const { data: after } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    expect(after!.status).toBe('placed');
  });

  it('ops: sees all orders', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data } = await c.from('orders').select('id').limit(10);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('ops: can UPDATE status', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('orders')
      .update({ status: 'packed' })
      .eq('id', orderId);
    expect(error).toBeNull();
    const { data: after } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    expect(after!.status).toBe('packed');
  });

  it('admin: sees all orders', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { data } = await c.from('orders').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('no role: can DELETE order', async () => {
    for (const u of [buyer, ops, adminUser]) {
      const c = await signedInAs(u.email, u.password);
      await c.from('orders').delete().eq('id', orderId);
    }
    const { data: still } = await adminClient
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();
    expect(still).not.toBeNull();
  });
});

describe('order_items RLS', () => {
  let itemId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('order_items')
      .insert({
        order_id: orderId,
        scent_id: scentId,
        quantity: 1,
        unit_price: 100,
      })
      .select('id')
      .single();
    itemId = data!.id;
  });

  it('customer: sees own order items', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('order_items')
      .select('id')
      .eq('id', itemId);
    expect((data ?? []).length).toBe(1);
  });

  it('customer: cannot see other order items', async () => {
    const c = await signedInAs(other.email, other.password);
    const { data } = await c
      .from('order_items')
      .select('id')
      .eq('id', itemId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('shipments RLS', () => {
  let shipmentId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('shipments')
      .insert({
        order_id: orderId,
        awb: `RLS-${Date.now()}`,
        carrier: 'test',
      })
      .select('id')
      .single();
    shipmentId = data!.id;
  });

  it('customer: sees own shipment', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('shipments')
      .select('id')
      .eq('id', shipmentId);
    expect((data ?? []).length).toBe(1);
  });

  it('customer: cannot UPDATE shipment', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('shipments')
      .update({ awb: 'HACK' })
      .eq('id', shipmentId);
    const { data: after } = await adminClient
      .from('shipments')
      .select('awb')
      .eq('id', shipmentId)
      .single();
    expect(after!.awb).not.toBe('HACK');
  });

  it('ops: can UPDATE shipment', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('shipments')
      .update({ awb: `RLS-OPS-${Date.now()}` })
      .eq('id', shipmentId);
    expect(error).toBeNull();
  });
});

describe('order_status_history RLS', () => {
  it('customer: sees only own history rows', async () => {
    await adminClient
      .from('order_status_history')
      .insert({ order_id: orderId, status: 'placed' });
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('order_status_history')
      .select('id, order_id');
    expect((data ?? []).every((r) => r.order_id === orderId)).toBe(true);
  });

  it('customer: cannot INSERT history', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c
      .from('order_status_history')
      .insert({ order_id: orderId, status: 'delivered' });
    expect(error).not.toBeNull();
  });
});

describe('returns RLS', () => {
  let returnId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('returns')
      .insert({
        order_id: orderId,
        reason: 'damaged',
        status: 'pending',
      })
      .select('id')
      .single();
    returnId = data!.id;
  });

  it('customer: can INSERT return for own order', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('returns').insert({
      order_id: orderId,
      reason: 'wrong-item',
      status: 'pending',
    });
    expect(error).toBeNull();
  });

  it('customer: cannot INSERT return for another order', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('returns').insert({
      order_id: othersOrderId,
      reason: 'wrong-item',
      status: 'pending',
    });
    expect(error).not.toBeNull();
  });

  it('ops: can UPDATE return status', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('returns')
      .update({ status: 'approved' })
      .eq('id', returnId);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:unit -- tests/rls/orders.rls.test.ts
git add tests/rls/orders.rls.test.ts
git commit -m "test(rls): orders + items + history + shipments + returns — full role matrix"
```

## Task 2.5: marketing RLS (discounts, offers, banners)

**Files:**
- Create: `tests/rls/marketing.rls.test.ts`

### Step 1: Write the test file

- [ ] **Create `tests/rls/marketing.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let ops: TestUser;
let adminUser: TestUser;
const suffix = Date.now();

beforeAll(async () => {
  [buyer, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await adminClient.from('discounts').delete().ilike('code', `QA-RLS-%`);
  await adminClient.from('offers').delete().ilike('name', `QA RLS%`);
  await adminClient.from('banners').delete().ilike('headline', `QA RLS%`);
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('discounts RLS', () => {
  it('anon: cannot SELECT discounts (codes are private until applied)', async () => {
    const { data } = await anonClient().from('discounts').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot INSERT discount', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('discounts').insert({
      code: `QA-RLS-${suffix}`,
      kind: 'percent',
      value: 10,
      active: true,
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT discount', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('discounts').insert({
      code: `QA-RLS-A-${suffix}`,
      kind: 'percent',
      value: 10,
      active: true,
    });
    expect(error).toBeNull();
  });
});

describe('offers RLS', () => {
  it('anon: can SELECT active offers (storefront evaluates them)', async () => {
    // Seed one active offer.
    await adminClient.from('offers').insert({
      name: `QA RLS offer ${suffix}`,
      kind: 'free_shipping',
      rule_json: {},
      active: true,
    });
    const { data } = await anonClient()
      .from('offers')
      .select('id')
      .eq('active', true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT offer', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('offers').insert({
      name: `QA RLS ${suffix}`,
      kind: 'free_shipping',
      rule_json: {},
      active: true,
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT offer', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('offers').insert({
      name: `QA RLS admin ${suffix}`,
      kind: 'free_shipping',
      rule_json: {},
      active: true,
    });
    expect(error).toBeNull();
  });
});

describe('banners RLS', () => {
  it('anon: can SELECT active banners', async () => {
    await adminClient.from('banners').insert({
      headline: `QA RLS ${suffix}`,
      position: 'announcement',
      active: true,
    });
    const { data } = await anonClient()
      .from('banners')
      .select('id')
      .eq('active', true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT banner', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('banners').insert({
      headline: `QA RLS ${suffix}`,
      position: 'announcement',
      active: true,
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT banner', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('banners').insert({
      headline: `QA RLS admin ${suffix}`,
      position: 'announcement',
      active: true,
    });
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:unit -- tests/rls/marketing.rls.test.ts
git add tests/rls/marketing.rls.test.ts
git commit -m "test(rls): discounts (private) + offers/banners (public-read) admin-write"
```

## Task 2.6: reviews RLS

**Files:**
- Create: `tests/rls/reviews.rls.test.ts`

### Step 1: Write the test file

- [ ] **Create `tests/rls/reviews.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;
let adminUser: TestUser;
let scentId: string;
let buyerOrderId: string;
let othersOrderId: string;
let publishedReviewId: string;
let unpublishedReviewId: string;
const RUN_TAG = `qa-rls-reviews-${Date.now()}`;

beforeAll(async () => {
  [buyer, other, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
    makeUser('admin'),
  ]);
  const { data: scent } = await adminClient
    .from('scents')
    .select('id')
    .eq('active', true)
    .limit(1)
    .single();
  scentId = scent!.id;
  // Seed delivered orders for both buyers so the reviews FK passes.
  const { data: o1 } = await adminClient
    .from('orders')
    .insert({
      profile_id: buyer.id,
      code: `QA-RV-A-${Date.now()}`,
      status: 'delivered',
      payment_method: 'cod',
      subtotal: 100,
      shipping: 0,
      total: 100,
      notes: RUN_TAG,
    })
    .select('id')
    .single();
  buyerOrderId = o1!.id;
  const { data: o2 } = await adminClient
    .from('orders')
    .insert({
      profile_id: other.id,
      code: `QA-RV-B-${Date.now()}`,
      status: 'delivered',
      payment_method: 'cod',
      subtotal: 100,
      shipping: 0,
      total: 100,
      notes: RUN_TAG,
    })
    .select('id')
    .single();
  othersOrderId = o2!.id;
  const { data: r1 } = await adminClient
    .from('reviews')
    .insert({
      profile_id: buyer.id,
      scent_id: scentId,
      order_id: buyerOrderId,
      rating: 5,
      body: `${RUN_TAG} published`,
      published: true,
    })
    .select('id')
    .single();
  publishedReviewId = r1!.id;
  const { data: r2 } = await adminClient
    .from('reviews')
    .insert({
      profile_id: other.id,
      scent_id: scentId,
      order_id: othersOrderId,
      rating: 4,
      body: `${RUN_TAG} unpublished`,
      published: false,
    })
    .select('id')
    .single();
  unpublishedReviewId = r2!.id;
});

afterAll(async () => {
  await adminClient.from('reviews').delete().ilike('body', `%${RUN_TAG}%`);
  await adminClient.from('orders').delete().ilike('notes', `%${RUN_TAG}%`);
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(other.id),
    dropUser(adminUser.id),
  ]);
});

describe('reviews RLS', () => {
  it('anon: sees only published reviews', async () => {
    const { data } = await anonClient()
      .from('reviews')
      .select('id, published')
      .in('id', [publishedReviewId, unpublishedReviewId]);
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(publishedReviewId);
    expect(ids).not.toContain(unpublishedReviewId);
  });

  it('customer: sees own unpublished reviews', async () => {
    const c = await signedInAs(other.email, other.password);
    const { data } = await c
      .from('reviews')
      .select('id')
      .eq('id', unpublishedReviewId);
    expect((data ?? []).length).toBe(1);
  });

  it('customer: cannot see another customer unpublished review', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('reviews')
      .select('id')
      .eq('id', unpublishedReviewId);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot UPDATE published flag', async () => {
    const c = await signedInAs(other.email, other.password);
    await c
      .from('reviews')
      .update({ published: true })
      .eq('id', unpublishedReviewId);
    const { data: after } = await adminClient
      .from('reviews')
      .select('published')
      .eq('id', unpublishedReviewId)
      .single();
    expect(after!.published).toBe(false);
  });

  it('admin: can UPDATE published flag', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c
      .from('reviews')
      .update({ published: true })
      .eq('id', unpublishedReviewId);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:unit -- tests/rls/reviews.rls.test.ts
git add tests/rls/reviews.rls.test.ts
git commit -m "test(rls): reviews — owner sees own drafts, anon sees published, admin moderates"
```

## Task 2.7: admin tables RLS (store_settings, audit_log)

**Files:**
- Create: `tests/rls/admin.rls.test.ts`

### Step 1: Write the test file

- [ ] **Create `tests/rls/admin.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let ops: TestUser;
let adminUser: TestUser;

beforeAll(async () => {
  [buyer, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('store_settings RLS', () => {
  it('anon: can SELECT (public settings drive the storefront)', async () => {
    const { data } = await anonClient()
      .from('store_settings')
      .select('key')
      .limit(5);
    expect(data).not.toBeNull();
  });

  it('customer: cannot UPDATE store_settings', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c
      .from('store_settings')
      .upsert({ key: 'qa-rls-attempt', value: 'pwned' });
    expect(error).not.toBeNull();
  });

  it('ops: cannot UPDATE store_settings', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('store_settings')
      .upsert({ key: 'qa-rls-attempt-ops', value: 'pwned' });
    expect(error).not.toBeNull();
  });

  it('admin: can UPDATE store_settings', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const key = `qa-rls-${Date.now()}`;
    const { error } = await c
      .from('store_settings')
      .upsert({ key, value: 'ok' });
    expect(error).toBeNull();
    await adminClient.from('store_settings').delete().eq('key', key);
  });
});

describe('audit_log RLS', () => {
  it('anon: cannot SELECT audit_log', async () => {
    const { data } = await anonClient().from('audit_log').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot SELECT audit_log', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('audit_log').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('admin: can SELECT audit_log', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('audit_log').select('id').limit(5);
    expect(error).toBeNull();
  });

  it('no role: can INSERT audit_log directly (writes are server-only)', async () => {
    for (const u of [buyer, ops, adminUser]) {
      const c = await signedInAs(u.email, u.password);
      const { error } = await c
        .from('audit_log')
        .insert({ actor_id: u.id, action: 'rls.bypass', target: 'rls' });
      expect(error).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:unit -- tests/rls/admin.rls.test.ts
git add tests/rls/admin.rls.test.ts
git commit -m "test(rls): store_settings + audit_log — admin-only writes, server-only audit inserts"
```

## Task 2.8: public-write RLS (contact_messages, razorpay_webhook_events)

**Files:**
- Create: `tests/rls/public-write.rls.test.ts`

### Step 1: Write the test file

- [ ] **Create `tests/rls/public-write.rls.test.ts`:**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let adminUser: TestUser;

beforeAll(async () => {
  [buyer, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([dropUser(buyer.id), dropUser(adminUser.id)]);
});

describe('contact_messages RLS', () => {
  it('anon: can INSERT contact message (public contact form)', async () => {
    const { error } = await anonClient().from('contact_messages').insert({
      name: 'QA Anon',
      email: 'qa@example.com',
      message: 'hello',
    });
    expect(error).toBeNull();
  });

  it('anon: cannot SELECT contact messages', async () => {
    const { data } = await anonClient()
      .from('contact_messages')
      .select('id')
      .limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot SELECT contact messages', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('contact_messages').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('admin: can SELECT contact messages', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('contact_messages').select('id').limit(5);
    expect(error).toBeNull();
  });
});

describe('razorpay_webhook_events RLS', () => {
  it('anon: cannot SELECT webhook events', async () => {
    const { data } = await anonClient()
      .from('razorpay_webhook_events')
      .select('id')
      .limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('anon: cannot INSERT webhook event (only server-role)', async () => {
    const { error } = await anonClient()
      .from('razorpay_webhook_events')
      .insert({
        event_id: `qa-${Date.now()}`,
        payload: {},
      });
    expect(error).not.toBeNull();
  });

  it('customer: cannot SELECT webhook events', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('razorpay_webhook_events')
      .select('id')
      .limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('admin: can SELECT webhook events', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c
      .from('razorpay_webhook_events')
      .select('id')
      .limit(5);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run test:unit -- tests/rls/public-write.rls.test.ts
git add tests/rls/public-write.rls.test.ts
git commit -m "test(rls): contact_messages public-insert, razorpay_webhook_events server-only"
```

## Task 2.9: COVERAGE.md

**Files:**
- Create: `tests/rls/COVERAGE.md`

### Step 1: Write the matrix

- [ ] **Create `tests/rls/COVERAGE.md`:**

```markdown
# RLS Coverage Matrix

Every (table × operation) cell records the expected behavior for each role. Each ✓/✗ is asserted by a test in `tests/rls/*.rls.test.ts`. Refresh this file when policies change.

Legend: ✓ allowed · ✗ denied · — n/a (no such operation for this role/table)

## Domain: profiles + addresses (`profiles.rls.test.ts`)

| Table     | Op      | anon | customer (own) | customer (other) | operations | admin |
|-----------|---------|------|----------------|------------------|------------|-------|
| profiles  | SELECT  | ✗    | ✓ (own only)   | ✗                | ✓ (all)    | ✓ (all) |
| profiles  | UPDATE  | ✗    | ✓ (own non-role fields) | ✗       | —          | ✓     |
| profiles  | role↑   | ✗    | ✗              | ✗                | ✗          | ✓     |
| addresses | SELECT  | ✗    | ✓ (own)        | ✗                | ✓ (all)    | ✓     |
| addresses | INSERT  | ✗    | ✓ (own)        | ✗                | —          | ✓     |

## Domain: catalog (`catalog.rls.test.ts`)

| Table         | Op     | anon          | customer | operations | admin |
|---------------|--------|---------------|----------|------------|-------|
| products      | SELECT | ✓ (active)    | ✓        | ✓          | ✓     |
| products      | INSERT | ✗             | ✗        | ✗          | ✓     |
| scents        | SELECT | ✓ (active)    | ✓        | ✓          | ✓     |
| scents        | UPDATE | ✗             | ✗        | ✓ (stock)  | ✓     |
| bundles       | SELECT | ✓ (active)    | ✓        | ✓          | ✓     |
| bundles       | INSERT | ✗             | ✗        | ✗          | ✓     |
| bundle_items  | SELECT | ✓             | ✓        | ✓          | ✓     |

## Domain: cart (`cart.rls.test.ts`)

| Table       | Op     | anon | customer (own) | customer (other) |
|-------------|--------|------|----------------|------------------|
| carts       | INSERT | ✗    | ✓              | ✗                |
| carts       | SELECT | ✗    | ✓ (own)        | ✗                |
| cart_items  | INSERT | ✗    | ✓ (own cart)   | ✗                |

## Domain: orders (`orders.rls.test.ts`)

| Table                | Op     | anon | customer (own) | customer (other) | operations | admin |
|----------------------|--------|------|----------------|------------------|------------|-------|
| orders               | SELECT | ✗    | ✓              | ✗                | ✓ (all)    | ✓     |
| orders               | INSERT | ✗    | ✓ (own pid)    | ✗                | —          | ✓     |
| orders               | UPDATE | ✗    | ✗ (status)     | ✗                | ✓ (status) | ✓     |
| orders               | DELETE | ✗    | ✗              | ✗                | ✗          | ✗     |
| order_items          | SELECT | ✗    | ✓ (own order)  | ✗                | ✓          | ✓     |
| order_status_history | SELECT | ✗    | ✓ (own order)  | ✗                | ✓          | ✓     |
| order_status_history | INSERT | ✗    | ✗              | ✗                | ✓ (server) | ✓     |
| shipments            | SELECT | ✗    | ✓ (own order)  | ✗                | ✓          | ✓     |
| shipments            | UPDATE | ✗    | ✗              | ✗                | ✓          | ✓     |
| returns              | INSERT | ✗    | ✓ (own order)  | ✗                | —          | ✓     |
| returns              | UPDATE | ✗    | ✗              | ✗                | ✓          | ✓     |

## Domain: marketing (`marketing.rls.test.ts`)

| Table     | Op     | anon | customer | operations | admin |
|-----------|--------|------|----------|------------|-------|
| discounts | SELECT | ✗    | ✗        | ✗          | ✓     |
| discounts | INSERT | ✗    | ✗        | ✗          | ✓     |
| offers    | SELECT | ✓ (active) | ✓    | ✓          | ✓     |
| offers    | INSERT | ✗    | ✗        | ✗          | ✓     |
| banners   | SELECT | ✓ (active) | ✓    | ✓          | ✓     |
| banners   | INSERT | ✗    | ✗        | ✗          | ✓     |

## Domain: reviews (`reviews.rls.test.ts`)

| Table   | Op     | anon (pub) | customer (own draft) | customer (other draft) | admin |
|---------|--------|------------|----------------------|------------------------|-------|
| reviews | SELECT | ✓ (pub)    | ✓                    | ✗                      | ✓     |
| reviews | INSERT | ✗          | ✓ (own delivered order) | —                   | ✓     |
| reviews | UPDATE published | ✗ | ✗                    | ✗                      | ✓     |

## Domain: admin tables (`admin.rls.test.ts`)

| Table          | Op     | anon | customer | operations | admin |
|----------------|--------|------|----------|------------|-------|
| store_settings | SELECT | ✓    | ✓        | ✓          | ✓     |
| store_settings | UPSERT | ✗    | ✗        | ✗          | ✓     |
| audit_log      | SELECT | ✗    | ✗        | ✗          | ✓     |
| audit_log      | INSERT | ✗    | ✗        | ✗          | ✗ (server-role only) |

## Domain: public-write (`public-write.rls.test.ts`)

| Table                    | Op     | anon | customer | admin |
|--------------------------|--------|------|----------|-------|
| contact_messages         | INSERT | ✓    | ✓        | ✓     |
| contact_messages         | SELECT | ✗    | ✗        | ✓     |
| razorpay_webhook_events  | SELECT | ✗    | ✗        | ✓     |
| razorpay_webhook_events  | INSERT | ✗    | ✗        | ✗ (server-role only) |

---

**21 tables × roles × ops = full coverage.** Failing a cell here = update both this file and the migration.
```

- [ ] **Step 2: Commit**

```bash
git add tests/rls/COVERAGE.md
git commit -m "docs(rls): coverage matrix — 21 tables × roles × ops"
```

## Task 2.10: Run the full RLS suite

- [ ] **Run all RLS tests**

```bash
npm run test:unit -- tests/rls
```

Expected: all 8 files pass. If any test fails, the production RLS policy is wrong — write a new migration to fix the policy, do NOT loosen the test.

---

# Task 3: CI workflows

## Task 3.1: e2e.yml workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

### Why

Existing `ci.yml` only runs lint + unit + build with dummy Supabase env. A separate `e2e.yml` runs the full Playwright suite with real secrets (when present) and uploads traces on failure.

### Step 1: Add Razorpay guard to prepaid spec

- [ ] **Edit `tests/e2e/full-purchase-flow.spec.ts`** — add a `test.skip` guard at the top of the Razorpay prepaid `test.describe` block.

Find this line (around line 101):
```ts
test.describe("Razorpay prepaid flow", () => {
  // The Razorpay iframe interaction and payment network round-trip need extra time.
  test.setTimeout(60_000);
```

Insert after `test.setTimeout`:

```ts
  test.skip(
    !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_"),
    "no Razorpay key configured — prepaid spec disabled",
  );
```

- [ ] **Verify locally** with no Razorpay env: prepaid suite is skipped, COD + reorder still run.

```bash
RAZORPAY_KEY_ID= npm run test:e2e -- tests/e2e/full-purchase-flow.spec.ts
```

Expected: prepaid test reports `[skipped]`, others pass.

### Step 2: Create `.github/workflows/e2e.yml`

- [ ] **Create the file:**

```yaml
name: E2E

on:
  push:
    branches: [main]
  pull_request:

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      PUBLIC_SITE_URL: http://localhost:4321
      RAZORPAY_KEY_ID: ${{ secrets.RAZORPAY_KEY_ID }}
      RAZORPAY_KEY_SECRET: ${{ secrets.RAZORPAY_KEY_SECRET }}
      PUBLIC_RAZORPAY_KEY_ID: ${{ secrets.PUBLIC_RAZORPAY_KEY_ID }}
      RAZORPAY_WEBHOOK_SECRET: ${{ secrets.RAZORPAY_WEBHOOK_SECRET }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run RLS audit (Vitest)
        run: npm run test:unit -- tests/rls

      - name: Run Playwright suite
        run: npm run test:e2e

      - name: Upload Playwright traces on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-trace
          path: |
            test-results/
            playwright-report/
          retention-days: 7
```

- [ ] **Step 3: Lint the YAML**

```bash
node -e "require('yaml')" 2>/dev/null || npx --yes -p yaml -c "true"
# Quick smoke: actionlint via Docker if available, otherwise manual eyeball.
```

If `yamllint` or `actionlint` is available, run it. Otherwise, eyeball the indentation matches the Playwright workflow examples in the GitHub docs.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/e2e.yml tests/e2e/full-purchase-flow.spec.ts
git commit -m "ci: e2e workflow — Playwright + RLS audit, Razorpay-aware skip"
```

## Task 3.2: lighthouse.yml + lighthouserc.cjs

**Files:**
- Create: `lighthouserc.cjs`
- Create: `.github/workflows/lighthouse.yml`

### Step 1: Install LHCI

- [ ] **Run:**

```bash
npm install --save-dev @lhci/cli
```

Expected: `@lhci/cli` appears in `package-lock.json`.

### Step 2: Create `lighthouserc.cjs` at repo root

- [ ] **Create the file:**

```js
// Lighthouse CI config.
// TODO(week-12): tighten thresholds before launch:
//   performance ≥ 0.85, accessibility/best-practices/seo ≥ 0.95.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/scents',
        'http://localhost:4321/scent/azeziya',
        'http://localhost:4321/bundles/starter-set',
        'http://localhost:4321/cart',
        'http://localhost:4321/story',
      ],
      numberOfRuns: 3,
      settings: {
        // Skip third-party flakes that Lighthouse occasionally trips on.
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      assertions: {
        'categories:performance':    ['error', { minScore: 0.75 }],
        'categories:accessibility':  ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo':            ['error', { minScore: 0.90 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Step 3: Create `.github/workflows/lighthouse.yml`

- [ ] **Create the file:**

```yaml
name: Lighthouse

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    # Nightly heartbeat at 03:00 UTC.
    - cron: '0 3 * * *'

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      PUBLIC_SITE_URL: http://localhost:4321
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: npx lhci autorun
```

### Step 4: Local smoke run (optional but recommended)

- [ ] **Run:**

```bash
npm run build
npx lhci autorun --config=./lighthouserc.cjs
```

Expected: `Lighthouse CI` collects 3 runs per URL and either passes or prints exactly which assertion fails. If a category misses the permissive threshold, file an issue with the URL + category — do not loosen further.

### Step 5: Commit

- [ ] **Run:**

```bash
git add package.json package-lock.json lighthouserc.cjs .github/workflows/lighthouse.yml
git commit -m "ci: lighthouse — 6 routes, permissive thresholds, PR + nightly cron"
```

---

# Task 4: Sentry — DSN-guarded integration

## Task 4.1: Install + shared helpers

**Files:**
- Create: `src/lib/sentry.ts`
- Create: `tests/unit/sentry/scrubber.test.ts`

### Step 1: Install

- [ ] **Run:**

```bash
npm install @sentry/astro
```

Expected: `@sentry/astro` (and its peer deps `@sentry/node`, `@sentry/browser`) added to `dependencies`.

### Step 2: Write the failing scrubber test

- [ ] **Create `tests/unit/sentry/scrubber.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import { scrubPii, scrubTransaction, shouldInitSentry } from '../../../src/lib/sentry';

describe('scrubPii', () => {
  it('removes PII keys from request.data', () => {
    const event: any = {
      request: {
        data: {
          email: 'a@b.com',
          phone: '9999999999',
          pincode: '400001',
          name: 'Alice',
          line1: '1 Test',
          line2: 'Apt 2',
          address: { city: 'Mumbai' },
          quantity: 1,
        },
      },
    };
    const out = scrubPii(event) as any;
    expect(out.request.data.email).toBeUndefined();
    expect(out.request.data.phone).toBeUndefined();
    expect(out.request.data.pincode).toBeUndefined();
    expect(out.request.data.name).toBeUndefined();
    expect(out.request.data.line1).toBeUndefined();
    expect(out.request.data.line2).toBeUndefined();
    expect(out.request.data.address).toBeUndefined();
    expect(out.request.data.quantity).toBe(1);
  });

  it('removes PII keys from contexts', () => {
    const event: any = {
      contexts: { state: { email: 'a@b.com', mode: 'cod' } },
    };
    const out = scrubPii(event) as any;
    expect(out.contexts.state.email).toBeUndefined();
    expect(out.contexts.state.mode).toBe('cod');
  });

  it('removes PII keys from breadcrumb data', () => {
    const event: any = {
      breadcrumbs: [
        { category: 'http', data: { email: 'a@b.com', url: '/x' } },
      ],
    };
    const out = scrubPii(event) as any;
    expect(out.breadcrumbs[0].data.email).toBeUndefined();
    expect(out.breadcrumbs[0].data.url).toBe('/x');
  });
});

describe('scrubTransaction', () => {
  it('redacts email/phone/otp query params from request.url', () => {
    const txn: any = {
      request: { url: '/checkout?email=a%40b.com&phone=9999&keep=ok' },
    };
    const out = scrubTransaction(txn) as any;
    expect(out.request.url).toContain('email=REDACTED');
    expect(out.request.url).toContain('phone=REDACTED');
    expect(out.request.url).toContain('keep=ok');
  });
});

describe('shouldInitSentry', () => {
  it('returns false when DSN is undefined', () => {
    expect(shouldInitSentry(undefined)).toBe(false);
  });
  it('returns false when DSN is empty', () => {
    expect(shouldInitSentry('')).toBe(false);
  });
  it('returns false when DSN starts with placeholder', () => {
    expect(shouldInitSentry('placeholder-dsn')).toBe(false);
  });
  it('returns true for a real-looking DSN', () => {
    expect(shouldInitSentry('https://abc@o12345.ingest.sentry.io/12345')).toBe(
      true,
    );
  });
});
```

- [ ] **Step 3: Run — expect failure**

```bash
npm run test:unit -- tests/unit/sentry/scrubber.test.ts
```

Expected: FAIL with "Cannot find module '.../src/lib/sentry'".

### Step 4: Implement `src/lib/sentry.ts`

- [ ] **Create the file:**

```ts
/**
 * Sentry helpers — shared between sentry.client.config.ts and sentry.server.config.ts.
 *
 * `shouldInitSentry` is the only gate that decides whether `Sentry.init` actually
 * runs. With no DSN (or a placeholder), the integration loads but never connects,
 * and the app behaves identically to a no-integration build.
 */

const PII_KEYS = [
  'email',
  'phone',
  'pincode',
  'line1',
  'line2',
  'name',
  'address',
];

function stripKeys(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_KEYS.includes(k)) continue;
    next[k] = typeof v === 'object' && v !== null ? stripKeys(v) : v;
  }
  return next;
}

export function scrubPii(event: any): any {
  if (event?.request?.data) {
    event.request.data = stripKeys(event.request.data);
  }
  if (event?.contexts) {
    event.contexts = stripKeys(event.contexts);
  }
  if (Array.isArray(event?.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b: any) =>
      b?.data ? { ...b, data: stripKeys(b.data) } : b,
    );
  }
  return event;
}

const QUERY_PII = ['email', 'phone', 'otp'];

export function scrubTransaction(txn: any): any {
  const url: string | undefined = txn?.request?.url;
  if (typeof url === 'string') {
    let next = url;
    for (const key of QUERY_PII) {
      const re = new RegExp(`([?&])${key}=[^&]*`, 'g');
      next = next.replace(re, `$1${key}=REDACTED`);
    }
    txn.request.url = next;
  }
  return txn;
}

export function shouldInitSentry(dsn: string | undefined): boolean {
  if (!dsn) return false;
  if (dsn.startsWith('placeholder')) return false;
  return true;
}
```

- [ ] **Step 5: Run — expect pass**

```bash
npm run test:unit -- tests/unit/sentry/scrubber.test.ts
```

Expected: all 7 tests pass.

### Step 6: Commit

- [ ] **Run:**

```bash
git add package.json package-lock.json src/lib/sentry.ts tests/unit/sentry/scrubber.test.ts
git commit -m "feat(sentry): scrubPii + scrubTransaction + shouldInitSentry helpers (TDD)"
```

## Task 4.2: Client + server config files

**Files:**
- Create: `sentry.client.config.ts` (repo root)
- Create: `sentry.server.config.ts` (repo root)

### Step 1: Create `sentry.client.config.ts`

- [ ] **Create the file at repo root:**

```ts
import * as Sentry from '@sentry/astro';
import { scrubPii, scrubTransaction, shouldInitSentry } from './src/lib/sentry';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

if (shouldInitSentry(dsn)) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend: scrubPii,
    beforeSendTransaction: scrubTransaction,
  });
}
```

### Step 2: Create `sentry.server.config.ts`

- [ ] **Create the file at repo root:**

```ts
import * as Sentry from '@sentry/astro';
import { scrubPii, scrubTransaction, shouldInitSentry } from './src/lib/sentry';

const dsn = process.env.PUBLIC_SENTRY_DSN;

if (shouldInitSentry(dsn)) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.1,
    beforeSend: scrubPii,
    beforeSendTransaction: scrubTransaction,
  });
}
```

### Step 3: Commit (config wiring happens in next task)

- [ ] **Run:**

```bash
git add sentry.client.config.ts sentry.server.config.ts
git commit -m "feat(sentry): client + server config files — DSN-guarded init"
```

## Task 4.3: Wire integration into astro.config.mjs + .env.example

**Files:**
- Modify: `astro.config.mjs`
- Modify: `.env.example`

### Step 1: Update `astro.config.mjs`

- [ ] **Replace the contents of `astro.config.mjs` with:**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sentry from '@sentry/astro';

export default defineConfig({
  site: 'https://qayra.in',
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  security: {
    checkOrigin: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    sentry({
      // DSN/init is controlled by sentry.client.config.ts and sentry.server.config.ts.
      // The integration mounts unconditionally; the config files short-circuit
      // when PUBLIC_SENTRY_DSN is unset.
      sourceMapsUploadOptions: { telemetry: false },
    }),
  ],
});
```

Note: `@astrojs/sitemap` will be added in Task 5.1. We touch `astro.config.mjs` again there — keeping the SEO change in its own commit.

### Step 2: Update `.env.example`

- [ ] **Append to `.env.example` (do not overwrite):**

```
# Sentry (optional) — get from sentry.io → Settings → Projects → Client Keys.
# Leave blank to disable error reporting entirely. The integration is a no-op
# when this is unset.
PUBLIC_SENTRY_DSN=
```

### Step 3: Verify build still works

- [ ] **Run:**

```bash
npm run build
```

Expected: build succeeds. Without a DSN, the Sentry integration logs nothing and produces no extra runtime.

### Step 4: Commit

- [ ] **Run:**

```bash
git add astro.config.mjs .env.example
git commit -m "feat(sentry): wire integration in astro.config + document DSN env"
```

---

# Task 5: SEO — sitemap, robots, JSON-LD, OG, canonical

## Task 5.1: Sitemap + robots.txt

**Files:**
- Modify: `astro.config.mjs`
- Create: `public/robots.txt`

### Step 1: Install

- [ ] **Run:**

```bash
npm install @astrojs/sitemap
```

### Step 2: Add to `astro.config.mjs`

- [ ] **Edit `astro.config.mjs`** — add the `sitemap` import and integration:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sentry from '@sentry/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://qayra.in',
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  security: {
    checkOrigin: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    sentry({
      sourceMapsUploadOptions: { telemetry: false },
    }),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/ops') &&
        !page.includes('/account') &&
        !page.includes('/checkout') &&
        !page.includes('/auth') &&
        !page.includes('/api/'),
    }),
  ],
});
```

### Step 3: Create `public/robots.txt`

- [ ] **Create the file:**

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /ops
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /api/
Sitemap: https://qayra.in/sitemap-index.xml
```

### Step 4: Build + verify sitemap

- [ ] **Run:**

```bash
npm run build
ls dist/client/ | grep sitemap
```

Expected: `sitemap-index.xml` and at least one `sitemap-0.xml` in `dist/client/`.

- [ ] **Inspect sitemap content:**

```bash
cat dist/client/sitemap-0.xml | head -40
```

Expected: URLs listed for `/`, `/scents`, public scent PDPs, bundle PDPs, `/story`, `/contact`, policy pages. NO `/admin`, `/ops`, `/account`, `/checkout`, `/auth`, `/api/` URLs.

### Step 5: Commit

- [ ] **Run:**

```bash
git add package.json package-lock.json astro.config.mjs public/robots.txt
git commit -m "feat(seo): sitemap (filtered) + robots.txt with disallows"
```

## Task 5.2: JSON-LD builders (TDD)

**Files:**
- Create: `src/lib/seo/jsonld.ts`
- Create: `tests/unit/seo/jsonld.test.ts`

### Step 1: Write the failing test

- [ ] **Create `tests/unit/seo/jsonld.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import {
  buildProductLd,
  buildBundleLd,
  buildOrgLd,
  buildBreadcrumbLd,
} from '../../../src/lib/seo/jsonld';

const SITE = 'https://qayra.in';

describe('buildProductLd', () => {
  it('emits required Product schema keys', () => {
    const scent = {
      slug: 'azeziya',
      name: 'Azeziya',
      description: 'A deep musk',
      image_urls: ['https://cdn/azeziya-1.jpg'],
      stock_qty: 12,
      product: { base_price: 89900 },
    };
    const ld = buildProductLd(scent as any, SITE);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Product');
    expect(ld.name).toBe('Azeziya');
    expect(ld.image).toEqual(['https://cdn/azeziya-1.jpg']);
    expect(ld.description).toBe('A deep musk');
    expect(ld.brand).toEqual({ '@type': 'Brand', name: 'qayra' });
    expect(ld.offers['@type']).toBe('Offer');
    expect(ld.offers.priceCurrency).toBe('INR');
    expect(ld.offers.price).toBe('899.00');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.offers.url).toBe(`${SITE}/scent/azeziya`);
  });

  it('uses OutOfStock when stock_qty === 0', () => {
    const scent = {
      slug: 'sold-out',
      name: 'Sold Out',
      description: 'gone',
      image_urls: [],
      stock_qty: 0,
      product: { base_price: 50000 },
    };
    const ld = buildProductLd(scent as any, SITE);
    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
  });
});

describe('buildBundleLd', () => {
  it('emits Product schema for a bundle', () => {
    const bundle = {
      slug: 'starter-set',
      name: 'The Starter Set',
      description: 'four scents',
      image_url: 'https://cdn/starter.jpg',
      price: 99900,
    };
    const ld = buildBundleLd(bundle as any, SITE);
    expect(ld['@type']).toBe('Product');
    expect(ld.offers.price).toBe('999.00');
    expect(ld.offers.url).toBe(`${SITE}/bundles/starter-set`);
  });
});

describe('buildOrgLd', () => {
  it('emits Organization schema for the brand', () => {
    const ld = buildOrgLd(SITE);
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe('qayra');
    expect(ld.url).toBe(SITE);
  });
});

describe('buildBreadcrumbLd', () => {
  it('emits BreadcrumbList with sequential positions', () => {
    const ld = buildBreadcrumbLd([
      { name: 'Home', url: 'https://qayra.in/' },
      { name: 'Scents', url: 'https://qayra.in/scents' },
      { name: 'Azeziya', url: 'https://qayra.in/scent/azeziya' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[2].name).toBe('Azeziya');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm run test:unit -- tests/unit/seo/jsonld.test.ts
```

Expected: FAIL with "Cannot find module '.../src/lib/seo/jsonld'".

### Step 3: Implement `src/lib/seo/jsonld.ts`

- [ ] **Create the file:**

```ts
/**
 * JSON-LD schema.org builders. Output is JSON.stringify-ready for
 * <script type="application/ld+json"> tags.
 *
 * Prices arrive as integer paise; schema.org wants a decimal string in major
 * currency units, hence the /100 + toFixed(2).
 */

interface Scent {
  slug: string;
  name: string;
  description: string | null;
  image_urls: string[] | null;
  stock_qty: number | null;
  product: { base_price: number } | null;
}

interface Bundle {
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
}

interface Crumb {
  name: string;
  url: string;
}

function paiseToInr(paise: number): string {
  return (paise / 100).toFixed(2);
}

function availability(stockQty: number | null): string {
  return (stockQty ?? 0) > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

export function buildProductLd(scent: Scent, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: scent.name,
    image: scent.image_urls ?? [],
    description: scent.description ?? '',
    brand: { '@type': 'Brand', name: 'qayra' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: paiseToInr(scent.product?.base_price ?? 0),
      availability: availability(scent.stock_qty),
      url: `${siteUrl}/scent/${scent.slug}`,
    },
  };
}

export function buildBundleLd(bundle: Bundle, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: bundle.name,
    image: bundle.image_url ? [bundle.image_url] : [],
    description: bundle.description ?? '',
    brand: { '@type': 'Brand', name: 'qayra' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: paiseToInr(bundle.price),
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/bundles/${bundle.slug}`,
    },
  };
}

export function buildOrgLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'qayra',
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
  };
}

export function buildBreadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: c.url,
    })),
  };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm run test:unit -- tests/unit/seo/jsonld.test.ts
```

Expected: all 5 tests pass.

### Step 5: Commit

- [ ] **Run:**

```bash
git add src/lib/seo/jsonld.ts tests/unit/seo/jsonld.test.ts
git commit -m "feat(seo): JSON-LD builders for product/bundle/org/breadcrumb (TDD)"
```

## Task 5.3: JSON-LD components + mount

**Files:**
- Create: `src/components/seo/OrgJsonLd.astro`
- Create: `src/components/seo/ProductJsonLd.astro`
- Create: `src/components/seo/BreadcrumbJsonLd.astro`
- Modify: `src/layouts/PublicLayout.astro`
- Modify: `src/pages/scent/[slug].astro`
- Modify: `src/pages/bundles/[slug].astro`

### Step 1: Create `OrgJsonLd.astro`

- [ ] **Create `src/components/seo/OrgJsonLd.astro`:**

```astro
---
import { buildOrgLd } from '../../lib/seo/jsonld';
const siteUrl = Astro.site?.toString().replace(/\/$/, '') ?? 'https://qayra.in';
const ld = buildOrgLd(siteUrl);
---

<script type="application/ld+json" set:html={JSON.stringify(ld)} is:inline />
```

### Step 2: Create `ProductJsonLd.astro`

- [ ] **Create `src/components/seo/ProductJsonLd.astro`:**

```astro
---
import { buildProductLd, buildBundleLd } from '../../lib/seo/jsonld';

interface Props {
  scent?: any;
  bundle?: any;
}
const { scent, bundle } = Astro.props;
const siteUrl = Astro.site?.toString().replace(/\/$/, '') ?? 'https://qayra.in';
const ld = scent
  ? buildProductLd(scent, siteUrl)
  : bundle
    ? buildBundleLd(bundle, siteUrl)
    : null;
---

{ld && <script type="application/ld+json" set:html={JSON.stringify(ld)} is:inline />}
```

### Step 3: Create `BreadcrumbJsonLd.astro`

- [ ] **Create `src/components/seo/BreadcrumbJsonLd.astro`:**

```astro
---
import { buildBreadcrumbLd } from '../../lib/seo/jsonld';

interface Props {
  crumbs: { name: string; url: string }[];
}
const { crumbs } = Astro.props;
const ld = buildBreadcrumbLd(crumbs);
---

<script type="application/ld+json" set:html={JSON.stringify(ld)} is:inline />
```

### Step 4: Mount Org schema + canonical + default OG in `PublicLayout.astro`

- [ ] **Replace the contents of `src/layouts/PublicLayout.astro` with:**

```astro
---
import '../styles/globals.css';
import { ViewTransitions } from 'astro:transitions';
import SiteHeader from '../components/layout/SiteHeader.astro';
import SiteFooter from '../components/layout/SiteFooter.astro';
import AnnouncementBar from '../components/layout/AnnouncementBar.astro';
import OrgJsonLd from '../components/seo/OrgJsonLd.astro';

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

const siteUrl = Astro.site?.toString().replace(/\/$/, '') ?? 'https://qayra.in';
const canonical = `${siteUrl}${Astro.url.pathname}`;
const defaultOg = `${siteUrl}/og-default.svg`;
const resolvedOg = ogImage ?? defaultOg;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} · qayra</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={`${title} · qayra`} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={resolvedOg} />
    <meta property="og:url" content={canonical} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <ViewTransitions />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Manrope:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
    <OrgJsonLd />
  </head>
  <body class="bg-cream text-navy flex min-h-screen flex-col">
    <AnnouncementBar />
    <SiteHeader />
    <main class="flex-1"><slot /></main>
    <SiteFooter />
    <script src="../scripts/reveal.client.ts"></script>
  </body>
</html>
```

### Step 5: Add JSON-LD + breadcrumb to scent PDP

- [ ] **Edit `src/pages/scent/[slug].astro`** — add imports at the top of the frontmatter (next to existing imports):

```astro
import ProductJsonLd from '../../components/seo/ProductJsonLd.astro';
import BreadcrumbJsonLd from '../../components/seo/BreadcrumbJsonLd.astro';
```

Then, immediately after the existing `<PublicLayout ...>` opening tag in the body section, add:

```astro
<ProductJsonLd scent={scent} />
<BreadcrumbJsonLd
  crumbs={[
    { name: 'Home', url: `${Astro.site}` },
    { name: 'Scents', url: `${Astro.site}scents` },
    { name: scent.name, url: `${Astro.site}scent/${scent.slug}` },
  ]}
/>
```

(Position the two components inside the `<PublicLayout>` slot — they emit `<script>` tags that Astro hoists to `<head>` via `is:inline`. The placement doesn't matter for rendering, only for source readability.)

### Step 6: Add JSON-LD + breadcrumb to bundle PDP

- [ ] **Edit `src/pages/bundles/[slug].astro`** — add imports:

```astro
import ProductJsonLd from '../../components/seo/ProductJsonLd.astro';
import BreadcrumbJsonLd from '../../components/seo/BreadcrumbJsonLd.astro';
```

Add inside `<PublicLayout>`:

```astro
<ProductJsonLd bundle={bundle} />
<BreadcrumbJsonLd
  crumbs={[
    { name: 'Home', url: `${Astro.site}` },
    { name: 'Bundles', url: `${Astro.site}bundles` },
    { name: bundle.name, url: `${Astro.site}bundles/${bundle.slug}` },
  ]}
/>
```

### Step 7: Verify build + HTML content

- [ ] **Build:**

```bash
npm run build
```

- [ ] **Inspect a built PDP:**

```bash
# Astro SSR — boot preview then curl.
npx --yes -p start-server-and-test start-server-and-test 'npm run preview' http://localhost:4321 'curl -s http://localhost:4321/scent/azeziya | grep -o "application/ld+json" | wc -l'
```

If `start-server-and-test` is unavailable, run two terminals manually: `npm run preview` in one, `curl -s http://localhost:4321/scent/azeziya | grep "application/ld+json"` in the other.

Expected: ≥ 3 occurrences (Org from layout + Product from PDP + Breadcrumb from PDP).

### Step 8: Create the OG default SVG placeholder

- [ ] **Create `public/og-default.svg`:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0e1f"/>
      <stop offset="50%" stop-color="#3a1f47"/>
      <stop offset="100%" stop-color="#5a2e6b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="600" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="120" font-weight="300" fill="#f4e4c1" letter-spacing="8">qayra</text>
  <text x="600" y="400" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" fill="#f4e4c1" letter-spacing="6" opacity="0.7">HAND-BLENDED · MADE SLOWLY IN INDIA</text>
</svg>
```

(Replace with a designed 1200×630 PNG before launch — Week 12.)

### Step 9: Commit

- [ ] **Run:**

```bash
git add src/components/seo src/layouts/PublicLayout.astro src/pages/scent/\[slug\].astro src/pages/bundles/\[slug\].astro public/og-default.svg
git commit -m "feat(seo): JSON-LD (Org/Product/Breadcrumb) + canonical + default OG"
```

## Task 5.4: Per-page metadata audit test

**Files:**
- Create: `tests/e2e/seo-metadata.spec.ts`

### Why

Catch regressions where a contributor forgets to set page-specific metadata in a layout call.

### Step 1: Write the test

- [ ] **Create `tests/e2e/seo-metadata.spec.ts`:**

```ts
import { test, expect, type Page } from '@playwright/test';

const ROUTES = [
  '/',
  '/scents',
  '/scent/azeziya',
  '/bundles/starter-set',
  '/story',
  '/contact',
  '/cart',
];

async function readMeta(page: Page, route: string) {
  await page.goto(route);
  const title = await page.locator('head > title').textContent();
  const description = await page
    .locator('head > meta[name="description"]')
    .getAttribute('content');
  const canonical = await page
    .locator('head > link[rel="canonical"]')
    .getAttribute('href');
  const ogTitle = await page
    .locator('head > meta[property="og:title"]')
    .getAttribute('content');
  const ogDescription = await page
    .locator('head > meta[property="og:description"]')
    .getAttribute('content');
  const ogImage = await page
    .locator('head > meta[property="og:image"]')
    .getAttribute('content');
  return { title, description, canonical, ogTitle, ogDescription, ogImage };
}

test.describe('SEO metadata', () => {
  const collected: Record<string, string | null> = {};

  for (const route of ROUTES) {
    test(`route ${route} has complete head metadata`, async ({ page }) => {
      const meta = await readMeta(page, route);
      expect(meta.title, `title on ${route}`).toBeTruthy();
      expect(
        (meta.title ?? '').length,
        `title length on ${route}`,
      ).toBeGreaterThan(0);
      expect(meta.description, `description on ${route}`).toBeTruthy();
      const descLen = (meta.description ?? '').length;
      expect(descLen, `description length on ${route}`).toBeGreaterThanOrEqual(
        30,
      );
      expect(descLen, `description length on ${route}`).toBeLessThanOrEqual(
        200,
      );
      expect(meta.canonical, `canonical on ${route}`).toBeTruthy();
      expect(meta.ogTitle, `og:title on ${route}`).toBeTruthy();
      expect(meta.ogDescription, `og:description on ${route}`).toBeTruthy();
      expect(meta.ogImage, `og:image on ${route}`).toBeTruthy();
      collected[route] = meta.title;
    });
  }

  test('titles are unique across routes', () => {
    const values = Object.values(collected).filter(Boolean) as string[];
    expect(new Set(values).size).toBe(values.length);
  });
});
```

### Step 2: Run

- [ ] **Run:**

```bash
npm run test:e2e -- tests/e2e/seo-metadata.spec.ts
```

Expected: every route passes. Failures point at exactly which page is missing which tag — fix the page (set explicit `title`/`description` in the PublicLayout call), don't loosen the test.

### Step 3: Commit

- [ ] **Run:**

```bash
git add tests/e2e/seo-metadata.spec.ts
git commit -m "test(seo): per-route head metadata audit — title/desc/canonical/og"
```

---

# Task 6: Mobile — emulation + hand-test checklist

## Task 6.1: mobile.spec.ts — Playwright emulation

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/mobile.spec.ts`

### Step 1: Add mobile projects to `playwright.config.ts`

- [ ] **Replace `playwright.config.ts` with:**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/mobile.spec.ts',
    },
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/mobile.spec.ts',
    },
    {
      name: 'pixel-6',
      use: { ...devices['Pixel 6'] },
      testMatch: '**/mobile.spec.ts',
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: '**/mobile.spec.ts',
    },
  ],
});
```

### Step 2: Write the mobile spec

- [ ] **Create `tests/e2e/mobile.spec.ts`:**

```ts
/**
 * Mobile emulation smoke — runs the COD purchase flow under three device
 * profiles. Catches viewport-specific layout breaks (sticky bar overlap,
 * cart drawer overflow, button reach) automatically.
 *
 * Project mapping in playwright.config.ts:
 *   iphone-13 | pixel-6 | ipad  → this file
 */

import { test, expect, type Page } from '@playwright/test';

async function addToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/scent/${slug}`);
  const addBtn = page.getByRole('button', { name: /add to bag/i });
  await expect(addBtn).toBeVisible();
  const resp = page.waitForResponse(
    (r) => r.url().includes('/api/cart/add') && r.status() === 200,
  );
  await addBtn.click();
  await resp;
}

test.describe('mobile COD smoke', () => {
  test('add to cart → checkout → COD → success', async ({ page }) => {
    await addToCart(page, 'azeziya');
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /your bag/i })).toBeVisible();
    await page.goto('/checkout');
    await page.fill('input[name=email]', `mobile-${Date.now()}@qayra.test`);
    await page.fill('input[name=phone]', '9876543210');
    await page.fill('input[name=name]', 'Mobile Tester');
    await page.fill('input[name=line1]', '12 Mobile Lane');
    await page.fill('input[name=city]', 'Bengaluru');
    await page.fill('input[name=state]', 'Karnataka');
    await page.fill('input[name=pincode]', '560001');
    await page.locator('input[name=payment_method][value=cod]').check();

    // The CTA must be visible without scrolling — surface sticky-bar overlap bugs.
    const placeBtn = page.getByRole('button', { name: /place order/i });
    await expect(placeBtn).toBeInViewport();

    const codResp = page.waitForResponse(
      (r) => r.url().includes('/api/checkout/cod-place') && r.status() === 200,
    );
    await placeBtn.click();
    await codResp;
    await expect(page).toHaveURL(/checkout\/success\?code=/, {
      timeout: 15_000,
    });
  });

  test('sticky buy bar appears on PDP scroll without horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/scent/azeziya');
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    const stickyBar = page.locator('[data-sticky-buy-bar], .sticky-buy-bar');
    // At least one such element should exist; if the selector misses, fall back
    // to ensuring the page hasn't introduced horizontal scroll.
    if (await stickyBar.count()) {
      await expect(stickyBar.first()).toBeVisible();
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
```

### Step 3: Run

- [ ] **Run:**

```bash
npm run test:e2e -- tests/e2e/mobile.spec.ts
```

Expected: 6 test runs (2 tests × 3 projects). All pass.

### Step 4: Commit

- [ ] **Run:**

```bash
git add playwright.config.ts tests/e2e/mobile.spec.ts
git commit -m "test(e2e): mobile emulation — COD flow on iPhone 13 + Pixel 6 + iPad"
```

## Task 6.2: mobile-checklist.md (hand-test)

**Files:**
- Create: `tests/e2e/mobile-checklist.md`

### Step 1: Write the checklist

- [ ] **Create `tests/e2e/mobile-checklist.md`:**

```markdown
# Mobile Hand-Test Checklist

The Playwright emulation in `mobile.spec.ts` catches viewport-class bugs. This
checklist is for things only a real device exposes: keyboards, gestures, dark
mode, network conditions, system browsers.

**Devices to use (pick at least 2):**

- iPhone (any model from iPhone 12 or newer) — Safari
- Android phone (any 2022+ device) — Chrome
- iPad (any model) — Safari
- Budget Android (optional but recommended) — Chrome

For each device, walk through every check below. Mark ✅ pass, ❌ fail (file
issue + commit fix). Date and device model in the result row.

---

## Checks

| # | Check | iPhone Safari | Android Chrome | iPad Safari |
|---|-------|---------------|----------------|-------------|
| 1 | Home hero renders inside 3s on cellular | | | |
| 2 | Scent listing grid: 1 col on phone, 2 col on tablet | | | |
| 3 | PDP image scrolls without horizontal overflow | | | |
| 4 | Sticky buy bar appears at correct scroll position, hides on scroll-up | | | |
| 5 | Add to bag → cart drawer/page slides in without jank | | | |
| 6 | Cart line item quantity stepper works (tap +/−) | | | |
| 7 | Checkout pincode input shows numeric keypad | | | |
| 8 | Checkout phone input shows tel keypad | | | |
| 9 | All form CTAs reach with thumb (44px+ tap targets) | | | |
| 10 | COD: place order → success page → order code visible | | | |
| 11 | Razorpay modal opens, card form usable, no horizontal scroll | | | |
| 12 | View transitions: no white flash between pages | | | |
| 13 | Account orders page reads cleanly | | | |
| 14 | Account order detail shows AWB + timeline | | | |
| 15 | Reviews form appears on PDP for delivered orders | | | |
| 16 | 404 page displays correctly | | | |
| 17 | Site footer reachable, links work | | | |
| 18 | Announcement bar dismissable (if dismissable) | | | |

---

## Run log

| Date | Tester | Device | Pass / Fail | Notes |
|------|--------|--------|-------------|-------|
| | | | | |
```

### Step 2: Commit

- [ ] **Run:**

```bash
git add tests/e2e/mobile-checklist.md
git commit -m "docs(qa): mobile hand-test checklist — 18 checks across 3 device classes"
```

---

# Task 7: Copy review checklist

**Files:**
- Create: `docs/superpowers/copy-review-checklist.md`

### Step 1: Write the checklist

- [ ] **Create `docs/superpowers/copy-review-checklist.md`:**

```markdown
# Copy Review Checklist

Run before launch (Week 12). Catches lorem-ipsum, brand-casing slips, wrong
currency symbols, and per-page copy gaps.

---

## Phase 1: Mechanical grep

Run all four greps. Each should return zero hits.

```bash
# 1. Lorem-ipsum / placeholder / TODO / FIXME leftover in source.
grep -rn -iE "lorem|ipsum|placeholder|tbd|todo|xxx|fixme" \
  src/pages src/components src/layouts \
  --include="*.astro" --include="*.tsx" --include="*.ts"

# 2. Wrong brand casing — should always be lowercase "qayra".
grep -rn "Qayra" src/ --include="*.astro" --include="*.tsx" --include="*.ts"

# 3. Wrong currency symbol or code.
grep -rn -E '\$[0-9]|USD' src/ --include="*.astro" --include="*.tsx"

# 4. Hard-coded test-card hint in production copy.
grep -rn "4111 1111 1111 1111" src/ --include="*.astro" --include="*.tsx"
```

For any hit:
- If it's intentional (e.g., `TODO(week-12)` comment), add it to the "Known acceptable hits" list at the bottom of this file with a justification.
- Otherwise, fix the source and re-run.

---

## Phase 2: Surface walkthrough

Open each surface in the browser and verify copy is intentional, complete, and
on-brand. Mark ✅ / ❌ / N/A.

### Customer storefront

| Surface | Path | Copy ✓ | Notes |
|---------|------|--------|-------|
| Home | `/` | | |
| Scents listing | `/scents` | | |
| Scent PDP (each) | `/scent/azeziya`, `/scent/velvet-midnight`, `/scent/blue-lotus-mist`, `/scent/imperial-musk` | | |
| Bundle PDP | `/bundles/starter-set` | | |
| Cart | `/cart` | | |
| Checkout form | `/checkout` | | |
| Checkout success | `/checkout/success?code=...` (test order) | | |
| Story | `/story` | | |
| Contact | `/contact` | | |
| 404 | invalid URL e.g. `/nope` | | |
| 500 | trigger by sabotaging a /api/* call locally | | |

### Account area

| Surface | Path | Copy ✓ | Notes |
|---------|------|--------|-------|
| Orders list | `/account/orders` | | |
| Order detail | `/account/orders/<code>` | | |
| Addresses | `/account/addresses` | | |
| Profile | `/account/profile` | | |
| Reviews (mine) | `/account/reviews` | | |

### Auth

| Surface | Path | Copy ✓ | Notes |
|---------|------|--------|-------|
| Sign in | `/auth/sign-in` | | |
| Sign up | `/auth/sign-up` | | |
| OAuth callback (visual only) | `/auth/callback` | | |

### Policy pages

These almost certainly need founder + legal sign-off in Week 12.

| Surface | Path | Copy ✓ | Notes |
|---------|------|--------|-------|
| Privacy | `/privacy` | | |
| Terms | `/terms` | | |
| Shipping | `/shipping` | | |
| Returns | `/returns` | | |
| Refunds | `/refunds` | | |

---

## Phase 3: Cross-cutting checks

- [ ] Brand name is always lowercase `qayra` everywhere in user-facing copy.
- [ ] Currency is always `₹` (INR symbol). No `$` / `USD` / `Rs.` / `INR ` prefixes.
- [ ] Date format is consistent (`en-IN`, e.g. `17 May 2026`).
- [ ] Pincode/PIN spelling is consistent (use "PIN code" or "pincode" — pick one and use throughout).
- [ ] Phone spelling is consistent ("phone" not "mobile" — or vice versa).
- [ ] Empty states have helpful copy (cart, orders, addresses).
- [ ] Error states have actionable copy (not "An error occurred").
- [ ] CTAs use consistent verbs ("Add to bag" vs "Add to cart" — pick one).

---

## Known acceptable hits

Anything intentional that shows up in the Phase 1 greps. Format:
`<file>:<line>` — <reason>

(none recorded yet)
```

### Step 2: Run Phase 1 greps now

- [ ] **Run each grep from Phase 1.** For each hit, either fix the source or add to "Known acceptable hits" with justification. Run again until clean.

```bash
grep -rn -iE "lorem|ipsum|placeholder|tbd|todo|xxx|fixme" src/pages src/components src/layouts --include="*.astro" --include="*.tsx" --include="*.ts"
grep -rn "Qayra" src/ --include="*.astro" --include="*.tsx" --include="*.ts"
grep -rn -E '\$[0-9]|USD' src/ --include="*.astro" --include="*.tsx"
grep -rn "4111 1111 1111 1111" src/ --include="*.astro" --include="*.tsx"
```

### Step 3: Commit the checklist + any copy fixes from Step 2

- [ ] **Run:**

```bash
git add docs/superpowers/copy-review-checklist.md
# Plus any source files modified by Step 2 grep fixes.
git status
git commit -m "docs(qa): copy review checklist + Phase 1 grep cleanup"
```

---

# Task 8: Secrets checklist

**Files:**
- Create: `docs/superpowers/secrets-checklist.md`

### Step 1: Write the checklist

- [ ] **Create `docs/superpowers/secrets-checklist.md`:**

```markdown
# GitHub Actions Secrets Checklist

The CI workflows (`e2e.yml`, `lighthouse.yml`) and the optional Sentry
integration read from these secrets/env vars. Each empty value triggers a
graceful fallback — workflows still run, just with narrower coverage.

Add via **GitHub → repo → Settings → Secrets and variables → Actions →
New repository secret**.

| Secret | Required by | Source | Without it |
|--------|-------------|--------|------------|
| `SUPABASE_URL` | `e2e.yml`, `lighthouse.yml` | supabase.com dashboard → Settings → API → Project URL | E2E + RLS suite fails (these are required) |
| `SUPABASE_ANON_KEY` | `e2e.yml`, `lighthouse.yml` | supabase.com → Settings → API → anon key | Same — required |
| `SUPABASE_SERVICE_ROLE_KEY` | `e2e.yml` | supabase.com → Settings → API → service_role key | RLS audit + test user fixture fail — required |
| `RAZORPAY_KEY_ID` | `e2e.yml` (optional) | razorpay.com → Settings → API Keys → Test Mode | Prepaid spec is skipped, COD path still runs |
| `RAZORPAY_KEY_SECRET` | `e2e.yml` (optional) | razorpay.com (same as above) | Same — prepaid skipped |
| `PUBLIC_RAZORPAY_KEY_ID` | `e2e.yml` (optional) | razorpay.com (same as above) | Same — prepaid skipped |
| `RAZORPAY_WEBHOOK_SECRET` | `e2e.yml` (optional) | razorpay.com → Webhooks → Webhook secret | Webhook verification tests skipped |
| `PUBLIC_SENTRY_DSN` | app env (not a CI secret) | sentry.io → Settings → Projects → Client Keys | `shouldInitSentry()` returns false, `Sentry.init` never runs, no errors are sent |

---

## Production env (Vercel / VPS / wherever)

The same Supabase + Razorpay keys plus:

- `PUBLIC_SITE_URL=https://qayra.in`
- `PUBLIC_SENTRY_DSN=<from sentry.io>` (optional — leave blank to disable)

---

## Verification

After adding a secret:

1. Re-run the most recent CI workflow on the affected branch.
2. Confirm the previously-skipped test is no longer skipped.
3. If a workflow newly fails, the secret value is likely wrong — re-fetch it from the source dashboard.

## Local development

`.env.example` documents the same keys. Copy to `.env`, fill in dev-mode
values, and `npm run dev` will read them via Astro's env handling.
```

### Step 2: Commit

- [ ] **Run:**

```bash
git add docs/superpowers/secrets-checklist.md
git commit -m "docs(qa): GitHub Actions secrets checklist + graceful-degradation map"
```

---

# Task 9: Final verification

## Step 1: Run the full test suite

- [ ] **Run unit + RLS:**

```bash
npm run test:unit
```

Expected: all unit tests + 8 RLS files pass.

- [ ] **Run E2E (chromium + mobile projects):**

```bash
npm run test:e2e
```

Expected: every spec passes. Razorpay prepaid is skipped if `RAZORPAY_KEY_ID` is unset locally — that's correct.

## Step 2: Build still green

- [ ] **Run:**

```bash
npm run build
npm run lint
npx astro check
```

Expected: build succeeds, lint clean, astro check clean.

## Step 3: axe-core no regressions

- [ ] **Run:**

```bash
npm run test:e2e -- tests/e2e/a11y.spec.ts
```

Expected: zero critical/serious violations.

## Step 4: Acceptance criteria check

Walk through `docs/superpowers/specs/2026-05-18-week-11-qa-design.md`
acceptance criteria. Tick each item only if you have verified, not just
believe:

- [ ] Fulfilment flow E2E walks all 6 role transitions + cleans up
- [ ] 8 RLS test files all pass + COVERAGE.md is current
- [ ] `e2e.yml` exists and references all 7 secrets
- [ ] `lighthouse.yml` exists with permissive thresholds + TODO comment
- [ ] Sentry: integration mounted, config files short-circuit without DSN, scrubber unit tests pass
- [ ] `@astrojs/sitemap` emits filtered sitemap; `robots.txt` references it
- [ ] JSON-LD: Org on every page (via layout), Product on PDP, Bundle on bundle PDP, Breadcrumb on PDP routes
- [ ] `mobile.spec.ts` passes on 3 emulated devices; `mobile-checklist.md` exists
- [ ] Copy-review checklist exists; Phase 1 greps return zero unexpected hits
- [ ] `secrets-checklist.md` lists every secret with source + degradation note
- [ ] No axe-core regressions

## Step 5: Final commit (if anything was tweaked above)

- [ ] **Run:**

```bash
git status
# If anything is uncommitted, group it under a final cleanup commit.
git commit -am "chore(qa): final verification fixes"
```

## Step 6: Push (only if user explicitly authorizes)

The branch is `main` with previous commits already ahead of origin. Pushing
will trigger CI for the first time. **Do not push without explicit user
confirmation.**

When authorized:

```bash
git push origin main
```

Then watch the GitHub Actions page for `e2e` and `lighthouse` workflow runs.
Expected on first push (no secrets configured yet):
- `e2e`: RLS tests fail (no Supabase secrets) — this is informational, not a regression.
- `lighthouse`: builds and runs against permissive thresholds.

User then adds secrets per `docs/superpowers/secrets-checklist.md` and re-runs.

---

## Done

When all of Task 9 is ticked, Week 11 QA is complete. Hand off to Week 12
(launch) with:

- All automated tests green locally
- CI workflows committed; activate via secrets when ready
- Hand-test checklists (mobile, copy) ready for the user to execute
- Sentry inert until DSN is added
