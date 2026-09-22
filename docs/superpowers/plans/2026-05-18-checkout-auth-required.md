# Checkout Auth Required Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require an authenticated session at every checkout entry point and guarantee the bag is empty after a successful order.

**Architecture:** Server-side auth gate on `/checkout` and the three checkout API routes (`cod-place`, `create-order`, `verify`). Remove the guest-checkout `admin.createUser` fallback in `buildPendingOrder`. Drop `email` from the API payload since it now comes from the session. Cart-clearing logic stays as-is — `emptyCart` / `emptyCartByProfileId` already run on success.

**Tech Stack:** Astro 5 SSR, Supabase auth, Zod, Vitest (RLS suite), Playwright (e2e).

---

## Task 1: Lock down `/checkout` page

**Files:**
- Modify: `src/pages/checkout/index.astro`

### Step 1: Add auth redirect at the top of frontmatter

- [ ] **Edit `src/pages/checkout/index.astro`** — replace lines 10-13:

```astro
const session = await getSession(Astro.request, Astro.cookies);
const cartId = await getOrCreateCart(Astro.request, Astro.cookies, Astro.locals.cartToken);
const lines = await getCartLines(Astro.request, Astro.cookies, cartId);
if (lines.length === 0) return Astro.redirect('/cart', 302);
```

with:

```astro
const session = await getSession(Astro.request, Astro.cookies);
if (!session) return Astro.redirect('/auth/sign-in?next=/checkout', 302);
const cartId = await getOrCreateCart(Astro.request, Astro.cookies, Astro.locals.cartToken);
const lines = await getCartLines(Astro.request, Astro.cookies, cartId);
if (lines.length === 0) return Astro.redirect('/cart', 302);
```

### Step 2: Make the email input read-only

- [ ] **In the same file**, find the email input (around line 56-63) and replace it with:

```astro
          <input
            name="email"
            type="email"
            required
            readonly
            value={session.email}
            class="border-navy/20 border bg-navy/5 px-3 py-2 text-navy/70"
          />
```

(The `session.email` is non-null because we redirected away above. The `bg-navy/5` + `text-navy/70` styling signals "locked field".)

### Step 3: Manual smoke check

- [ ] **Start the dev server in another terminal:** `npm run dev`
- [ ] **Open `http://localhost:4321/checkout` in an incognito tab.** Expected: redirected to `/auth/sign-in?next=/checkout`.
- [ ] **Sign in, then revisit `/checkout`.** Expected: email field is greyed out and populated with the signed-in email.

### Step 4: Commit

```bash
git add src/pages/checkout/index.astro
git commit -m "feat(checkout): require login at /checkout, pre-fill email read-only"
```

---

## Task 2: Lock down the 3 checkout API routes

**Files:**
- Modify: `src/pages/api/checkout/cod-place.ts`
- Modify: `src/pages/api/checkout/create-order.ts`
- Modify: `src/pages/api/checkout/verify.ts`

### Step 1: Edit `cod-place.ts`

- [ ] **Replace `src/pages/api/checkout/cod-place.ts` with:**

```ts
import type { APIRoute } from 'astro';
import { CheckoutInput, buildPendingOrder, emptyCart } from '../../../lib/checkout';
import { serviceClient } from '../../../lib/supabase/service';
import { getSession } from '../../../lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const session = await getSession(request, cookies);
  if (!session) return new Response(JSON.stringify({ error: 'auth required' }), { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const body = CheckoutInput.safeParse(raw);
  if (!body.success)
    return new Response(JSON.stringify({ error: body.error.issues }), { status: 400 });
  if (body.data.payment_method !== 'cod')
    return new Response('use create-order for prepaid', { status: 400 });

  try {
    const { orderId, code, discountCode } = await buildPendingOrder(
      request,
      cookies,
      locals.cartToken,
      body.data,
    );
    const svc = serviceClient();
    await svc
      .from('orders')
      .update({ status: 'confirmed', payment_status: 'pending' })
      .eq('id', orderId);
    await svc.from('order_status_history').insert({
      order_id: orderId,
      status: 'confirmed',
      note: 'COD order placed',
    });
    await emptyCart(request, cookies, locals.cartToken);

    if (discountCode) {
      const { data: disc } = await svc.from('discounts').select('used_count').eq('code', discountCode).maybeSingle();
      if (disc != null) {
        const { error: incErr } = await svc
          .from('discounts')
          .update({ used_count: (disc.used_count ?? 0) + 1 })
          .eq('code', discountCode);
        if (incErr) console.error('[checkout] used_count increment failed', discountCode, incErr.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, code }), { status: 200 });
  } catch (err) {
    console.error('cod-place', err);
    return new Response(JSON.stringify({ error: 'Order placement failed' }), { status: 500 });
  }
};
```

### Step 2: Edit `create-order.ts`

- [ ] **Edit `src/pages/api/checkout/create-order.ts`** — add the import and guard at the top of the POST handler:

```ts
import type { APIRoute } from 'astro';
import { CheckoutInput, buildPendingOrder } from '../../../lib/checkout';
import { createRzpOrder } from '../../../lib/razorpay';
import { serviceClient } from '../../../lib/supabase/service';
import { getSession } from '../../../lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const session = await getSession(request, cookies);
  if (!session) return new Response(JSON.stringify({ error: 'auth required' }), { status: 401 });

  let raw: unknown;
  // ... (rest of the existing handler unchanged)
```

The rest of the file (body parsing, `buildPendingOrder` call, Razorpay creation, response) stays exactly as it was.

### Step 3: Edit `verify.ts`

- [ ] **Edit `src/pages/api/checkout/verify.ts`** — add the import and guard:

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { verifySignature } from '../../../lib/razorpay';
import { serviceClient } from '../../../lib/supabase/service';
import { emptyCartByProfileId } from '../../../lib/cart';
import { getSession } from '../../../lib/auth/session';

const Body = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(request, cookies);
  if (!session) return new Response(JSON.stringify({ error: 'auth required' }), { status: 401 });

  let raw: unknown;
  // ... (rest of the existing handler unchanged)
```

Note: the previous signature was `async ({ request })` — change it to `async ({ request, cookies })` so we have a cookies handle for `getSession`. The rest of the handler stays as it was.

### Step 4: Manual smoke check via curl

- [ ] **Start dev server** if not running: `npm run dev`
- [ ] **Run each curl:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4321/api/checkout/cod-place -H "Content-Type: application/json" -d "{}"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4321/api/checkout/create-order -H "Content-Type: application/json" -d "{}"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4321/api/checkout/verify -H "Content-Type: application/json" -d "{}"
```

Expected: each prints `401`.

### Step 5: Commit

```bash
git add src/pages/api/checkout/cod-place.ts src/pages/api/checkout/create-order.ts src/pages/api/checkout/verify.ts
git commit -m "feat(checkout): 401 from cod-place/create-order/verify when no session"
```

---

## Task 3: Strip guest-checkout from `buildPendingOrder`

**Files:**
- Modify: `src/lib/checkout.ts`

### Step 1: Remove `email` from `CheckoutInput`

- [ ] **Edit `src/lib/checkout.ts`** — change the schema (around line 9-20):

```ts
export const CheckoutInput = z.object({
  phone: z.string().regex(/^[0-9]{10}$/),
  name: z.string().min(1).max(80).transform((s) => s.trim()),
  line1: z.string().min(1).max(200).transform((s) => s.trim()),
  line2: z.string().max(200).optional().transform((s) => s?.trim() || undefined),
  city: z.string().min(1).max(80).transform((s) => s.trim()),
  state: z.string().min(1).max(80).transform((s) => s.trim()),
  pincode: z.string().regex(/^[0-9]{6}$/),
  payment_method: z.enum(['prepaid', 'cod']),
  discount_code: z.string().max(40).optional(),
});
export type CheckoutPayload = z.infer<typeof CheckoutInput>;
```

(`email` line is removed.)

### Step 2: Replace the guest-creation branch with a hard requirement

- [ ] **In the same file, replace the block at lines 29-53** (the `session.userId` / `admin.createUser` / `get_auth_uid_by_email` logic) with:

```ts
  const svc = serviceClient();
  const session = await getSession(request, cookies);

  if (!session) throw new Error('auth required');
  const profileId = session.userId;
```

The `let profileId = session?.userId; if (!profileId) { ... admin.createUser ... }` block is deleted.

### Step 3: Audit downstream references to `payload.email`

- [ ] **Search the file for `payload.email`** and adjust. The `address_snapshot` doesn't include email (verify around line 97-103). If there's an `orders` insert that references `payload.email`, replace with `session.email`.

```bash
grep -n "payload\.email" src/lib/checkout.ts
```

Expected: zero hits after the change. If you find one, swap it for `session.email` and re-run.

### Step 4: Update the checkout form to NOT send `email`

- [ ] **Edit `src/pages/checkout/index.astro`** — find the client-side `submit` handler script (search for `fetch('/api/checkout/`). The form serializes `FormData` then JSON.stringifies. Remove `email` from the JSON payload sent to the API, since the API now ignores it. Look for code like:

```ts
const payload = Object.fromEntries(new FormData(form).entries());
```

and add after it:

```ts
delete (payload as Record<string, unknown>).email;
```

(This keeps the `<input name="email">` for visual confirmation but stops it from being submitted as part of the body. Alternatively, change the input to `<input type="email" disabled value={session.email}>` — disabled inputs are excluded from FormData.)

**Simpler:** change `readonly` to `disabled` on the email input from Task 1, Step 2. Disabled inputs are automatically excluded from FormData submission. Then no JS change is needed.

- [ ] **Apply the simpler fix**: in `src/pages/checkout/index.astro`, change the email input attribute `readonly` to `disabled` (keeps the same styling/behavior).

### Step 5: Verify build + types

```bash
npm run build
```

Expected: green. If TS complains about the removed `payload.email`, fix the reference.

```bash
npx astro check
```

Expected: 0 errors.

### Step 6: Commit

```bash
git add src/lib/checkout.ts src/pages/checkout/index.astro
git commit -m "feat(checkout): require session in buildPendingOrder, drop guest user-creation path"
```

---

## Task 4: Update mobile e2e to sign in before checkout

**Files:**
- Modify: `tests/e2e/mobile.spec.ts`

### Step 1: Look at how `full-purchase-flow.spec.ts` signs in

- [ ] **Read `tests/e2e/full-purchase-flow.spec.ts` lines 1-60** to see the `signIn` helper and the test-user creation fixture. It uses an `auth.admin.createUser` call from `tests/fixtures/users.ts`.

### Step 2: Add a sign-in helper to mobile.spec.ts

- [ ] **Replace the contents of `tests/e2e/mobile.spec.ts` with:**

```ts
// Mobile emulation smoke — runs the COD purchase flow under three device
// profiles. Catches viewport-specific layout breaks (sticky bar overlap,
// cart drawer overflow, button reach) automatically.
//
// Project mapping in playwright.config.ts:
//   iphone-13 | pixel-6 | ipad  -> this file

import { test, expect, type Page } from '@playwright/test';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';

let buyer: TestUser;

test.beforeAll(async () => {
  buyer = await makeUser('customer');
});

test.afterAll(async () => {
  if (buyer) await dropUser(buyer.id);
});

async function signIn(page: Page): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.fill('input[name=email]', buyer.email);
  await page.fill('input[name=password]', buyer.password);
  await page.click('button[type=submit]');
  await expect(page).not.toHaveURL(/auth\/sign-in/, { timeout: 10_000 });
}

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
  test('add to cart -> sign in -> checkout -> COD -> success', async ({ page }) => {
    await signIn(page);
    await addToCart(page, 'azeziya');
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /your bag/i })).toBeVisible();
    await page.goto('/checkout');
    await page.fill('input[name=phone]', '9876543210');
    await page.fill('input[name=name]', 'Mobile Tester');
    await page.fill('input[name=line1]', '12 Mobile Lane');
    await page.fill('input[name=city]', 'Bengaluru');
    await page.fill('input[name=state]', 'Karnataka');
    await page.fill('input[name=pincode]', '560001');
    await page.locator('input[name=payment_method][value=cod]').check();

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
    if (await stickyBar.count()) {
      await expect(stickyBar.first()).toBeVisible();
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
```

Note the email field is removed from the mobile form-fill (since it's prefilled+disabled).

### Step 3: Run

```bash
npm run test:e2e -- tests/e2e/mobile.spec.ts
```

Expected: 6 tests pass (3 device projects x 2 tests).

### Step 4: Commit

```bash
git add tests/e2e/mobile.spec.ts
git commit -m "test(e2e): mobile spec signs in before checkout (matches auth gate)"
```

---

## Task 5: New e2e spec for the auth gate itself

**Files:**
- Create: `tests/e2e/checkout-auth.spec.ts`

### Step 1: Write the spec

- [ ] **Create `tests/e2e/checkout-auth.spec.ts`:**

```ts
// Verifies the checkout flow is gated on an authenticated session and that
// a successful order leaves the user's cart empty.

import { test, expect, type APIRequestContext } from '@playwright/test';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { adminClient } from '../rls/helpers';

let buyer: TestUser;

test.beforeAll(async () => {
  buyer = await makeUser('customer');
});

test.afterAll(async () => {
  if (buyer) await dropUser(buyer.id);
});

test.describe('checkout auth gate', () => {
  test('anonymous GET /checkout redirects to /auth/sign-in', async ({ page }) => {
    const resp = await page.goto('/checkout');
    expect(resp).not.toBeNull();
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fcheckout/);
  });

  test('anonymous POST to checkout APIs returns 401', async ({ request }) => {
    for (const path of [
      '/api/checkout/cod-place',
      '/api/checkout/create-order',
      '/api/checkout/verify',
    ]) {
      const r = await request.post(path, { data: {} });
      expect(r.status(), `${path} should be 401 for anon`).toBe(401);
    }
  });

  test('successful COD order empties the user cart_items', async ({ page }) => {
    // Sign in.
    await page.goto('/auth/sign-in');
    await page.fill('input[name=email]', buyer.email);
    await page.fill('input[name=password]', buyer.password);
    await page.click('button[type=submit]');
    await expect(page).not.toHaveURL(/auth\/sign-in/, { timeout: 10_000 });

    // Add an item.
    await page.goto('/scent/azeziya');
    const addBtn = page.getByRole('button', { name: /add to bag/i });
    const addResp = page.waitForResponse(
      (r) => r.url().includes('/api/cart/add') && r.status() === 200,
    );
    await addBtn.click();
    await addResp;

    // Pre-condition: cart_items has rows for this user.
    const { data: cartBefore } = await adminClient
      .from('carts')
      .select('id, cart_items(id)')
      .eq('profile_id', buyer.id)
      .maybeSingle();
    expect((cartBefore?.cart_items as any[] | undefined)?.length ?? 0).toBeGreaterThan(0);

    // Place a COD order.
    await page.goto('/checkout');
    await page.fill('input[name=phone]', '9876543210');
    await page.fill('input[name=name]', 'Auth Gate Tester');
    await page.fill('input[name=line1]', '1 Auth Lane');
    await page.fill('input[name=city]', 'Mumbai');
    await page.fill('input[name=state]', 'MH');
    await page.fill('input[name=pincode]', '400001');
    await page.locator('input[name=payment_method][value=cod]').check();
    const placeResp = page.waitForResponse(
      (r) => r.url().includes('/api/checkout/cod-place') && r.status() === 200,
    );
    await page.getByRole('button', { name: /place order/i }).click();
    await placeResp;
    await expect(page).toHaveURL(/checkout\/success\?code=/, { timeout: 15_000 });

    // Post-condition: cart_items for this user is empty.
    const { data: cartAfter } = await adminClient
      .from('carts')
      .select('id, cart_items(id)')
      .eq('profile_id', buyer.id)
      .maybeSingle();
    expect((cartAfter?.cart_items as any[] | undefined)?.length ?? 0).toBe(0);
  });
});
```

### Step 2: Run

```bash
npm run test:e2e -- tests/e2e/checkout-auth.spec.ts
```

Expected: 3 tests pass.

### Step 3: Commit

```bash
git add tests/e2e/checkout-auth.spec.ts
git commit -m "test(e2e): checkout auth gate — anon redirect, anon 401, cart empties after COD"
```

---

## Task 6: Full verification

### Step 1: Unit + RLS suite

```bash
npm run test:unit -- --no-file-parallelism
```

Expected: 123 tests pass (unchanged — no schema or RLS change).

### Step 2: Existing full-purchase-flow still passes (it already signs in)

```bash
npm run test:e2e -- tests/e2e/full-purchase-flow.spec.ts
```

Expected: COD case passes; Razorpay case is `skipped` if no `RAZORPAY_KEY_ID` env is set.

### Step 3: SEO + mobile + auth-gate together

```bash
npm run test:e2e -- tests/e2e/seo-metadata.spec.ts tests/e2e/mobile.spec.ts tests/e2e/checkout-auth.spec.ts
```

Expected: every spec green.

### Step 4: Build + astro check

```bash
npm run build
npx astro check
```

Expected: build complete; 0 astro errors.

### Step 5: Final commit if anything was tweaked

```bash
git status
# If anything is uncommitted, bundle under a single cleanup commit.
git commit -am "chore(checkout): final verification fixes"
```

---

## Done

When all 6 tasks are ticked, the change is complete:
- `/checkout` and the 3 checkout APIs reject anonymous callers.
- `buildPendingOrder` requires a session — no guest-user creation path.
- The mobile e2e signs in before checkout, matching the gate.
- A new `checkout-auth.spec.ts` proves the gate works and that a successful COD order leaves the user's cart empty.
