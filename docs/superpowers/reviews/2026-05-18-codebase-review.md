# Codebase Review — 2026-05-18

Full-codebase review of qayra.in (Astro 6 + React 19 + Supabase + Razorpay). Conducted by five parallel specialist subagents (security-auditor, postgres-pro, code-reviewer, react-specialist, qa-expert), with orchestrator-side verification of every P0 and select P1 claims against the actual source.

## Executive summary

**After verification:** 9 P0 · 28 P1 · 25 P2 · 11 P3 (≈73 findings).

Findings concentrate on five themes:

1. **Identity & redirect hygiene** — guest checkout can silently bind a new order to a pre-existing account by email (no ownership proof); `?next=` is not validated for same-origin in sign-in/sign-up flows.
2. **Race conditions in money paths** — `discounts.used_count` is incremented via non-atomic read-modify-write in both prepaid and COD finalization, so `max_uses` can be exceeded under concurrency. Inventory decrement is also non-atomic; stock check-then-write can oversell.
3. **Status-machine and column drift** — `src/lib/orders.ts` queries `.gt('stock', 0)` against a column actually named `stock_qty` (silent reorder failure); `src/lib/ops/transitions.ts` defines a status enum that diverges from `src/lib/order-status.ts`; `src/lib/supabase/types.ts` still lists the dropped `current_role()` RPC.
4. **Operational telemetry** — every `src/pages/api/admin/*` form action ends in `} catch { redirect('?error=Save+failed') }`. Errors are swallowed without `console.error` or Sentry capture, exactly the class of bug the recent `profiles.email` / `shipments.id` hotfixes uncovered.
5. **Test coverage of revenue paths** — the Razorpay webhook handler, `verifySignature`, the apply-discount path, the returns lifecycle, and the customer-vs-admin role-gate (with a real signed-in customer) have zero tests.

**Launch blockers (P0 list):**
- Guest checkout email takeover (`src/lib/checkout.ts:42-52`)
- Open redirect via `next` (`src/pages/api/auth/sign-in.ts:27`)
- Reorder broken due to wrong column name (`src/lib/orders.ts:75`)
- Non-atomic discount `used_count` increment (`src/pages/api/checkout/verify.ts:50-56` + `src/pages/api/checkout/cod-place.ts`)
- Checkout form inputs unlabeled (`src/pages/checkout/index.astro:56-105`)
- Razorpay webhook handler has zero tests (`src/pages/api/webhooks/razorpay.ts:6`)
- `verifySignature` has zero unit tests (`src/lib/razorpay.ts:30`)
- Role-gate spec uses only anonymous browser — no signed-in customer (`tests/e2e/role-gates.spec.ts`)
- Non-atomic stock decrement allows oversell (`src/lib/checkout.ts:60-63`)

Strengths worth keeping: zod is consistently used at trust boundaries, Razorpay webhook signature uses constant-time compare, RLS coverage is broad and methodical, `pricing`/`bundle-pricing`/`format`/`transitions` are pure-functional with unit tests, the full-fulfilment e2e walks the real order lifecycle.

---

## P0 — fix before launch

### Guest checkout silently binds new orders to pre-existing user by email
- Severity: P0
- Location: `src/lib/checkout.ts:42-52`
- Problem: When `svc.auth.admin.createUser` fails (e.g., email exists), the fallback calls `get_auth_uid_by_email` and attaches the order/address to the resolved profile without any verification (no OTP, no link). Also functions as an account-enumeration oracle (different DB error paths for registered vs new email).
- Impact: An attacker who knows a customer's email can plant orders/addresses on that customer's account, poisoning order history, exposing the attacker's PII to that account, and (for COD) potentially obligating the victim to refuse deliveries placed under their identity.
- Fix: Require email verification for guest checkout against an existing account — either reject with "please sign in" or send a one-time link/OTP before assigning `profile_id`. Never silently take over an existing account. Also unify the "registered" vs "new" code paths so the response timing/shape is identical.
- PR: `review/security-fixes`

### Open redirect via `next` in auth flows
- Severity: P0
- Location: `src/pages/api/auth/sign-in.ts:9, 27` (and parallel handling in `sign-up.ts`, `middleware.ts`)
- Problem: `next` is parsed as `z.string().optional()` and passed directly to `redirect(parsed.data.next || '/', 303)`. No same-origin allowlist. `?next=https://evil.example/phish` works.
- Impact: Open redirect that chains with credential-harvesting phishing.
- Fix: Reject any `next` that does not start with `/` and is not `//` or `/\` (protocol-relative). Fall back to `/`.
- PR: `review/security-fixes`

### Reorder broken: querying non-existent column `stock`
- Severity: P0
- Location: `src/lib/orders.ts:75`
- Problem: `.gt('stock', 0)` against `scents` — column is `stock_qty`. Supabase returns an error, code silently treats it as "no scents available", and every reorder returns `{ restored: 0, skipped: N }`.
- Impact: Reorder feature is completely broken with no user-facing error message.
- Fix: Change `.gt('stock', 0)` → `.gt('stock_qty', 0)`.
- PR: `review/code-quality`

### Non-atomic discount `used_count` increment (race condition)
- Severity: P0
- Location: `src/pages/api/checkout/verify.ts:50-56` (and parallel logic in `src/pages/api/checkout/cod-place.ts`)
- Problem: `SELECT used_count` then `UPDATE SET used_count = (current + 1)`. Two concurrent finalizations of the same code both read `N`, both write `N+1`.
- Impact: A code with `max_uses=10` can be redeemed 11+ times under concurrency. Costs real revenue.
- Fix: Move to an atomic SQL operation: `UPDATE discounts SET used_count = used_count + 1 WHERE code = $1 AND (max_uses IS NULL OR used_count < max_uses)` and check affected-row count to detect limit-reached. Best implemented inside the existing `finalize_paid_order` RPC for prepaid, with an analogous RPC for COD.
- PR: `review/code-quality` (or `review/database-fixes` if the fix is wrapped in a new RPC)

### Non-atomic stock check (oversell race)
- Severity: P0
- Location: `src/lib/checkout.ts:60-63`
- Problem: Stock validation is a check-then-act with no decrement and no transaction. Two parallel checkouts both pass the check; both inserts succeed; nothing decrements `scents.stock_qty`. Bundles never validate constituent-scent stock either.
- Impact: Oversell during traffic spikes; bundles sold with empty constituent scents.
- Fix: Move stock check + decrement into the order-creation RPC. For bundles, join through `bundle_items` and decrement constituent scents in the same transaction.
- PR: `review/database-fixes` (RPC change) — requires user sign-off on the migration.

### Checkout form inputs have no labels
- Severity: P0
- Location: `src/pages/checkout/index.astro:56-105`
- Problem: `email`, `phone`, `name`, `line1`, `line2`, `city`, `state`, `pincode` use `placeholder` as the only label. `<fieldset><legend>` groups the section but does not label individual fields.
- Impact: The site's only revenue path is inaccessible to screen-reader and voice-control users.
- Fix: Add `<label for="...">` (visually-hidden if required by the design) or `aria-label` to every input.
- PR: `review/frontend-fixes`

### Razorpay webhook handler has zero tests
- Severity: P0
- Location: `src/pages/api/webhooks/razorpay.ts:6` (no test exists)
- Problem: HMAC verification, idempotency dedup, and event dispatch are entirely untested. The RLS suite covers DB row permissions only, not handler logic.
- Impact: A regression in signature verification or replay protection would not be caught in CI.
- Fix: Add a Vitest integration test that constructs a valid HMAC body and a tampered one, POSTs to the handler, and asserts 200 with idempotency on repeat + 400 on bad signature.
- PR: `review/test-additions`

### `verifySignature` has zero unit tests
- Severity: P0
- Location: `src/lib/razorpay.ts:30` (no test exists). The e2e prepaid spec is `test.skip`-gated behind `RAZORPAY_KEY_ID`, so CI never exercises this path.
- Problem: Pure crypto function — trivially unit-testable — has no test.
- Impact: A regression in HMAC construction (parameter order, encoding) would silently accept invalid payments.
- Fix: Unit test against a known `orderId/paymentId/signature` triplet, plus a tampered-signature case.
- PR: `review/test-additions`

### Role-gate spec only verifies anonymous redirects
- Severity: P0
- Location: `tests/e2e/role-gates.spec.ts:3-27`
- Problem: All four tests use an anonymous browser. There is no e2e test confirming a signed-in `customer` is rejected from `/admin` and `/ops` (not just "has session" but "wrong role").
- Impact: If middleware accidentally gates only on session presence rather than role, a customer reaches admin/ops UI undetected.
- Fix: Add an authenticated test that signs in as a customer fixture, attempts `/admin` and `/ops`, and asserts the final URL is not under those prefixes.
- PR: `review/test-additions`

---

## P1 — fix soon

### Security

**Contact form has no rate limit or captcha** — `src/pages/api/contact.ts:11-26` and `supabase/migrations/20260524000002_contact_messages.sql:10` (anon-insert policy). Trivial spam/flood. Add per-IP rate limit + captcha. PR: `review/security-fixes`.

**Password reset has no per-email/per-IP throttle** — `src/pages/api/auth/forgot-password.ts:14-21`. Email-bomb vector and Supabase quota burn. Throttle (e.g., 3/hr/email, 10/hr/IP). PR: `review/security-fixes`.

**`apply-code` allows enumeration** — `src/pages/api/checkout/apply-code.ts:1-41`. Unauthenticated, unrate-limited, distinguishes "not found" from "expired" via different responses. Add per-IP rate limit and constant 404 for both branches. PR: `review/security-fixes`.

**Razorpay webhook idempotency falls back to timestamp** — `src/pages/api/webhooks/razorpay.ts:28-41`. When `payment.entity.id` is missing, dedup key becomes `${event}-${Date.now()}`, so non-payment events never dedupe. Derive idempotency key from `x-razorpay-event-id` header. PR: `review/security-fixes`.

**`orders: staff updates` policy missing `WITH CHECK`** — `supabase/migrations/20260517000002_rls_policies.sql:133-134` (re-created in the rename migration without WITH CHECK either). A compromised ops account can reassign `profile_id` or rewrite `total`. Add `WITH CHECK (app_current_role() in ('operations','admin'))` and consider column-level immutability. PR: `review/security-fixes`.

### Database

**`app_current_role()` not wrapped in `(SELECT ...)`** — `supabase/migrations/20260525000000_rename_app_current_role.sql:7-18`. `STABLE` helps, but the inner `auth.uid()` call benefits from being wrapped per Supabase's official guidance. Wrap as `select coalesce((select role from public.profiles where id = (select auth.uid())), 'anon')`. PR: `review/database-fixes`.

**Stale `src/lib/supabase/types.ts`** — `src/lib/supabase/types.ts:857` still declares `current_role`; `app_current_role` and any other rename additions are missing. Regenerate: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`. PR: `review/database-fixes` (mechanical).

**Missing index on `orders.razorpay_order_id`** — `supabase/migrations/20260517000000_initial_schema.sql:127ish` (orders table). `finalize_paid_order` looks up by this column on every successful payment; no index exists. `CREATE INDEX orders_razorpay_order_id_idx ON orders (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;`. PR: `review/database-fixes`.

**Missing unique on `(reviews.profile_id, scent_id, order_id)`** — `supabase/migrations/20260517000000_initial_schema.sql:214-227`. Duplicate reviews possible. Add unique constraint. PR: `review/database-fixes`.

**Fragile `order_code_seq` initialization** — `supabase/migrations/20260531000002_cart_checkout_hardening.sql:26-35`. Initialized from `count(*)` not from `max(seq)` parsed out of the code suffix. Will collide after any test-data purge that doesn't reset the sequence. Compute from `MAX(SUBSTRING(code FROM 3)::int)`. PR: `review/database-fixes`.

**Unbounded client-side aggregation in `topScents`** — `src/lib/admin/reports.ts:21-41`. Pulls all `order_items` for the range and aggregates in TS. Push to SQL via RPC. PR: `review/database-fixes` (RPC).

### Code quality

**Order status enum drift** — `src/lib/ops/transitions.ts` uses `'returned'`; `src/lib/order-status.ts` exports `'refunded'` and `'cancelled'`. `canTransition` accepts `string` not `OrderStatus`. Make `OrderStatus` the single source of truth; type `allowed` as `Record<OrderStatus, OrderStatus[]>`. PR: `review/code-quality`.

**Brittle Postgres error detection** — `src/pages/api/checkout/verify.ts:38` matches `error.message.includes('order_not_found_or_already_finalized')`. A Postgres release / locale change can break this. Raise a known SQLSTATE from the RPC and match `error.code`. PR: `review/code-quality`.

**`reorderToCart` `stock` vs `stock_qty`** — already counted under P0 (same bug). No duplicate entry.

**Discount preview/verify divergence** — `apply-code.ts` uses `serverClient` (RLS-gated visibility); `checkout.ts:68-87` uses `serviceClient`. A row visible to one and not the other lets the UI promise a discount that vanishes at submit. Also: no `subtotal > 0` guard before applying a fixed discount on a $0 cart. Extract a shared `validateDiscount(svc, code, subtotal, paymentMethod)` helper. PR: `review/code-quality`.

**Silent error swallowing across `src/lib/orders.ts`** — `src/lib/orders.ts:7, 22, 52, 60, 70`. Every Supabase select destructures `data` only; transient errors look like "empty result" to the user. Destructure `{ data, error }`, log/throw on error. PR: `review/code-quality`.

**`src/pages/api/admin/*` swallow errors with bare `catch {}`** — 19+ files (banner-create, bundle-create, discount-update, scent-toggle, inventory-set, etc.). At minimum `console.error('[admin] <action>', err); Sentry.captureException(err);` then redirect. PR: `review/code-quality`.

### Frontend

**Cart line buttons lack accessible names** — `src/components/cart/CartLineItem.astro:20-23`. Add `aria-label="Decrease quantity of {line.name}"` etc. PR: `review/frontend-fixes`.

**`AddressForm` and profile inputs unlabeled** — `src/components/account/AddressForm.astro:22-73`, `src/pages/account/profile.astro:32-46`. Add `<label>` or `aria-label`. PR: `review/frontend-fixes`.

**`NewOrdersBadge` hydrated with `client:load`** — `src/components/admin/AdminSidebar.astro:57`, `src/components/ops/OpsTopbar.astro:27`. Should be `client:idle` — eager hydration + WS handshake on every admin/ops page hurts LCP. PR: `review/frontend-fixes`.

**`/scents` listing has no JSON-LD** — `src/pages/scents/index.astro:1-19`. Add `ItemList`/`CollectionPage` schema. PR: `review/frontend-fixes`.

**`buildBundleLd` hardcodes `InStock`** — `src/lib/seo/jsonld.ts:67-74`. Pass real `in_stock` derived from constituent scents. PR: `review/frontend-fixes`.

### Tests

**Oversell guard untested** — `src/lib/checkout.ts:60`. Add a unit test that passes mocked lines with `stock_qty < quantity` and asserts the throw. PR: `review/test-additions`.

**Apply-discount path has no e2e** — `src/pages/api/checkout/apply-code.ts` and `src/lib/checkout.ts:71`. Add e2e creating a discount via admin CRUD, applying at checkout, asserting reduced total and `used_count` increment. PR: `review/test-additions`.

**Illegal status transitions untested at API layer** — `src/pages/api/ops/mark-packed.ts:22`. Unit tests cover `canTransition` logic but the API-layer 409 is unhit. Add an API test that posts `mark-packed` for an order already shipped. PR: `review/test-additions`.

**Entire returns lifecycle untested** — `src/pages/api/account/return-request.ts`, `src/pages/api/ops/return-{approve,reject,refunded}.ts`. Add an e2e covering customer-initiate → ops-approve → status=`returned`. PR: `review/test-additions`.

**`nextOrderCode` untested** — `src/lib/order-code.ts:3`. At minimum a mocked-RPC unit test for error propagation; ideally an integration test that asserts the code format. PR: `review/test-additions`.

---

## P2 — quality backlog

### Security

- PII in `console.error` across `src/pages/api/contact.ts:23`, `src/pages/api/checkout/create-order.ts:41`, `src/lib/admin/orders.ts:11`, `src/pages/api/checkout/verify.ts:56`. Log `error.code` only; route structured events through Sentry.
- `src/pages/api/account/profile-update.ts:21-28` — defensive role-immutability gap if SET list grows. Move role mutation behind a SECURITY DEFINER RPC.
- `src/pages/api/admin/*` use `supabaseAdmin` (service-role) where `serverClient` would suffice — broader blast radius if a `requireRole` check is ever skipped. Prefer `serverClient` for user-reachable admin paths; reserve service-role for system paths.
- Cart cookie 90-day lifetime with no rotation on sign-in/sign-out — `src/middleware.ts:14-23`. Shorten to 14–30 days; rotate on auth events.

### Database

- `audit_log` missing index on `actor_id` and `created_at` — `supabase/migrations/20260517000000_initial_schema.sql:241-252`.
- `contact_messages` has no FK to `profiles` — design gap, add optional `profile_id` with `ON DELETE SET NULL`.
- N+1 in `src/lib/admin/customers.ts:23-24` — 20 sequential auth admin calls per page. Use `listUsers` once and intersect.

### Code quality

- `as any` escape hatches around `rule_json` in `src/lib/offers.ts:21-22` and `store_settings.value` in `src/lib/admin/settings.ts:22-25`. Parse with discriminated zod unions.
- `src/lib/checkout.ts:42-52` — `createUser` non-duplicate errors silently fall through to RPC. Inspect `createErr.status/code` and only fall through on `email_exists`.
- `src/lib/cart.ts:82-105` — joined `row.scent`/`row.bundle` cast via inline structural types; should use `Database` types. Same file: `getCartLineCount` ignores both query errors.
- `src/pages/api/cart/{add,update,remove}.ts`, `src/pages/api/account/return-request.ts:19`, `src/pages/api/checkout/create-order.ts:40-43` — bare `catch {}`. Add `console.error` + Sentry.
- `mergeOnSignIn` and `reorderToCart` errors counted as `skipped` with no user-facing summary — silent cart data loss.

### Frontend

- `src/components/home/HeroFromBanner.astro:22` — empty `alt` may be wrong for CMS-chosen banners; missing `width/height` causes CLS. Add dimensions; consider `loading="eager" fetchpriority="high"` since it's the LCP element.
- `src/components/product/ScentCard.astro:15` and all usages — no `width/height` and no `loading="lazy"`.
- `tests/e2e/a11y.spec.ts:4` — a11y coverage missing for `/checkout`, `/scent/[slug]`, `/account/*`. The P0 checkout-labels finding would have been caught here.
- `src/components/account/AccountNav.astro:33-39` — active link missing `aria-current="page"` (pattern already correct in `SiteHeader.astro:17-29`).

### Tests

- `tests/e2e/checkout.spec.ts:6` — bare `page.waitForTimeout(800)` is the only timeout in the suite, sitting in the revenue path. Replace with `waitForResponse(...)`.
- `tests/e2e/cart.spec.ts` — no remove-item test, no anonymous→authenticated merge test.
- `tests/e2e/auth.spec.ts` — no full signup→signin happy-path test; no logout test; no password-reset flow.

---

## P3 — nits

- `src/pages/api/auth/sign-out.ts` — no Origin/Referer check on state-changing POSTs. Add a CSRF check at middleware level for form actions.
- `src/lib/supabase/service.ts:5-9` — no `typeof window !== 'undefined'` guard analogous to `admin.ts`.
- Two consecutive idempotent `setval` migrations (`20260518000002`, `20260518000003`) reflect a dev-workflow mistake. No action; consider a comment block.
- `src/pages/api/ops/*.ts` (return-refunded, return-reject, return-approve, mark-packed, mark-delivered) — `ctx as any` to satisfy `requireRole`. Tighten `requireRole`'s first-param type to `Pick<APIContext, 'request' | 'cookies' | 'url' | 'redirect'>`.
- `src/lib/realtime.ts:10-12` — `payload.new as OrderEvent` cast; validate with zod.
- `src/components/product/ReviewList.astro:44` — unnecessary `as any`; `r.profile?.full_name` already type-safe.
- `src/layouts/OpsLayout.astro:18-19` — missing favicon link tag.
- `src/pages/checkout/index.astro:150` — `#discount-msg` not in an `aria-live` region; screen readers miss the apply-code result.
- `tests/e2e/admin-crud.spec.ts:74` — re-`signIn` per test; switch to Playwright `storageState`.
- `tests/e2e/storefront.spec.ts:12` — `toHaveCount(4)` hard-codes seed-data size. Use `>= 1`.
- "Percent discount NaN" finding (code-reviewer P0) — schema enforces `discounts.value INTEGER NOT NULL CHECK (value > 0)`, so NaN is unreachable at runtime. Filed here only as a type-narrowing improvement: the generated `Database` type may declare `value` as nullable; tighten the consuming code accordingly. **Original finding rejected at P0 severity.**

---

## Out of scope / deferred

- **Architectural rewrites:** Several agent suggestions (move discount/stock logic into RPCs, restructure `src/lib/admin/*`) are larger refactors. Captured as P0/P1 fixes only where the conservative move is a small RPC; broader restructuring belongs in a separate plan.
- **Dependency upgrades:** None tied to P0/P1 security findings, so out of scope per the design.
- **Performance tuning beyond obvious wins:** No load testing performed; perf findings are static-analysis-derived.
- **`.env` content audit:** File is in `.gitignore` (verified at `.gitignore:23`); contents not read.

## Fix-PR plan

In order. Each PR opened against `main`; user merges.

| # | Branch | Findings covered |
|---|---|---|
| 1 | `review/security-fixes` | P0 (guest-checkout takeover, open redirect) + P1 (contact rate limit, forgot-password throttle, apply-code enumeration, webhook idempotency, orders WITH CHECK) + P2 (PII in logs, service-role narrowing, cart cookie lifetime) |
| 2 | `review/database-fixes` | P0 (atomic discount increment if implemented as RPC), P1 (app_current_role wrapping, types.ts regen, razorpay_order_id index, reviews unique, order_code_seq init, topScents RPC), P2 (audit_log indexes, contact_messages FK proposal) |
| 3 | `review/code-quality` | P0 (`stock_qty` rename, non-atomic discount if kept in TS, oversell guard placement decision) + P1 (status enum unification, error code matching, discount preview/verify unification, orders.ts error handling, admin catch-blocks) + P2 (as-any cleanup, cart join types, cart/checkout catch blocks) |
| 4 | `review/frontend-fixes` | P0 (checkout labels) + P1 (cart aria-labels, address/profile labels, NewOrdersBadge client:idle, /scents JSON-LD, bundle availability) + P2 (hero/ScentCard dimensions, AccountNav aria-current) |
| 5 | `review/test-additions` | P0 (razorpay webhook test, verifySignature unit, authenticated role-gate test) + P1 (oversell, apply-discount e2e, mark-packed 409, returns lifecycle, nextOrderCode) + P2 (a11y coverage extension, cart edge cases, auth happy-path) |

Schema-changing migrations from PR 2 are proposed in the PR body and not auto-applied; user signs off before `npx supabase db push`.

P3 nits stay in this document as backlog and are not bundled into any PR.
