# Week 11 — QA & Hardening Design

**Status:** Design approved 2026-05-18. Implementation plan to be authored next.
**Supersedes/refines:** `docs/superpowers/plans/2026-07-26-week-11-qa.md`
**Approach:** Pragmatic — unblocked execution, graceful fallbacks for absent secrets/services.

---

## Context

Weeks 1–10 have shipped the storefront, admin, ops, marketing surface, motion, View Transitions, and an axe-a11y suite. The repo is at parity with the Week 1–10 plans. Already completed in this Week-11 window:

- Test user fixture (`tests/fixtures/users.ts`)
- Full purchase flow E2E — COD + Razorpay prepaid (`tests/e2e/full-purchase-flow.spec.ts`)
- Admin CRUD smoke (`tests/e2e/admin-crud.spec.ts`)
- RLS helpers scaffold (`tests/rls/helpers.ts`)

The fulfilment-flow file exists but is a 12-line empty stub (untracked).

This design refines the remaining Week 11 work — Tasks 3 and 5–10 from the original plan — into an executable round that does not block on user-managed external services (Sentry, BrowserStack, GitHub Actions secrets).

## Goal

Eliminate launch-blocking defects. Every Acceptance Criterion in the original Week 11 plan, executable end-to-end without external secrets, with secrets-aware tests/workflows that activate themselves the moment the user adds the secret.

## Non-goals

- Production Razorpay activation (Week 12, depends on KYC)
- DNS cutover (Week 12)
- Re-running already-committed work from Tasks 1, 2, 4

---

## Architecture

### Two test runtimes

- **Playwright** drives browser flows that exercise the full app: fulfilment, prepaid Razorpay, admin CRUD, mobile emulation.
- **Vitest** drives the RLS audit — direct Supabase JWT calls, no browser. Faster, finer granularity, easier to iterate.

### Fallback principles (the heart of the Pragmatic approach)

- **Sentry:** integration always wired; `initSentry()` early-returns when `PUBLIC_SENTRY_DSN` is unset or starts with `placeholder`. No warnings, no broken pages.
- **Razorpay in CI:** prepaid spec calls `test.skip()` when `RAZORPAY_KEY_ID` is missing or does not start with `rzp_`. COD path runs unconditionally.
- **Lighthouse:** uses `temporary-public-storage` — no LH server account needed.
- **Mobile matrix:** Playwright device-emulation profiles (`iPhone 13`, `Pixel 6`, `iPad (gen 7)`) committed as `mobile.spec.ts`. Real-device check is a printed hand-test checklist for the user's own phone.

### File structure

```
tests/
├── e2e/
│   ├── full-fulfilment-flow.spec.ts   # replace 12-line stub
│   ├── mobile.spec.ts                 # Playwright device emulation
│   └── mobile-checklist.md            # hand-test items for the user's phone
├── rls/
│   ├── COVERAGE.md                    # matrix: table × role × op
│   ├── profiles.rls.test.ts           # profiles + addresses
│   ├── catalog.rls.test.ts            # products + scents + bundles + bundle_items
│   ├── cart.rls.test.ts               # carts + cart_items
│   ├── orders.rls.test.ts             # orders + order_items + order_status_history + shipments + returns
│   ├── marketing.rls.test.ts          # discounts + offers + banners
│   ├── reviews.rls.test.ts            # reviews
│   ├── admin.rls.test.ts              # store_settings + audit_log
│   └── public-write.rls.test.ts       # contact_messages + razorpay_webhook_events
└── unit/
    └── seo/jsonld.test.ts             # buildProductLd schema + availability
    └── sentry/scrubber.test.ts        # beforeSend strips PII

sentry.client.config.ts                 # Sentry client init (DSN-guarded)
sentry.server.config.ts                 # Sentry server init (DSN-guarded)
src/
├── lib/
│   ├── sentry.ts                      # shared scrubbers + shouldInitSentry()
│   └── seo/jsonld.ts                  # builders: product, bundle, org, breadcrumb
└── components/
    └── seo/
        ├── OrgJsonLd.astro            # mounted once in root layout
        ├── ProductJsonLd.astro        # mounted on PDP + bundle PDP
        └── BreadcrumbJsonLd.astro     # mounted on PDP, bundle PDP, scents

public/
├── robots.txt
└── og-default.png                     # 1200×630 fallback OG image

docs/superpowers/
├── secrets-checklist.md               # GH Actions secrets the user must add
└── copy-review-checklist.md           # surface-by-surface copy walkthrough

astro.config.mjs                        # add @astrojs/sitemap + Sentry integration
lighthouserc.cjs                        # LH CI config — permissive thresholds
.env.example                            # add PUBLIC_SENTRY_DSN (commented)

.github/workflows/
├── e2e.yml                             # Playwright on PR + main
└── lighthouse.yml                      # LH on PR + nightly cron
```

---

## Component design

### 1. Fulfilment E2E (`full-fulfilment-flow.spec.ts`)

Single test, one order walked through all three roles using three `BrowserContext`s with separate storage states — no logout/login mid-test.

Setup (`beforeAll`, via service-role):

```
customer = makeUser('customer')
ops      = makeUser('operations')
admin    = makeUser('admin')
runTag   = `qa-fulfilment-${Date.now()}`
```

Steps (in order, single test):

1. **customer ctx** → PDP (azeziya) → add to bag → `/checkout` → COD → success.
   Assert: `orders` row exists, `status='placed'`, `payment_method='cod'`, `notes` contains `runTag`.
2. **ops ctx** → `/ops` → order appears in "To Pack" column → Mark packed (status `packed`).
3. **ops ctx** → Enter AWB form → `shipments` row written → Mark delivered (status `delivered`, `delivered_at` set).
4. **customer ctx** → `/account/orders/[id]` → timeline shows `delivered`, AWB visible, "Write a review" CTA enabled.
5. **customer ctx** → submit 5-star review with text. Assert `reviews` row exists, `published=false`.
6. **admin ctx** → `/admin/reviews` → publish toggle. Assert `published=true`.
7. **anonymous ctx** → `/scent/azeziya` → review appears in published list.

Cleanup (`afterAll`, wrapped in `try/finally` so partial failures still clean up): delete any rows where `notes ILIKE '%qa-fulfilment-${runTag}%'` then `dropUser` all three users. Per-run tag prevents leaks across concurrent runs.

### 2. RLS audit pattern

Every file follows the same shape; example for `orders.rls.test.ts`:

```
describe('orders RLS', () => {
  // SELECT
  it('anon: SELECT returns empty')
  it('customer: sees only own orders')
  it('customer: cannot see other buyer\'s order')
  it('ops: sees all orders')
  it('admin: sees all orders')

  // INSERT
  it('anon: cannot INSERT order')
  it('customer: can INSERT order with own profile_id')
  it('customer: cannot INSERT order with another profile_id')

  // UPDATE
  it('customer: cannot UPDATE status field')
  it('ops: can UPDATE status field')

  // DELETE (orders should never be hard-deleted by any role)
  it('customer: cannot DELETE order')
  it('ops: cannot DELETE order')
  it('admin: cannot DELETE order')
})
```

Less-sensitive tables (e.g., catalog reads) collapse to fewer cells. Each file:

- Creates its own users in `beforeAll`, deletes them in `afterAll`.
- Seeds **ephemeral** rows (orders, reviews, etc.) via service-role inside the file. Reuses existing seeded scents (`azeziya`, etc.) — does not re-seed catalog per file.
- Uses unique slugs/codes (`Date.now()` suffix) on any newly-inserted catalog rows to avoid clashes when Vitest parallelizes.

### 3. RLS coverage matrix (`tests/rls/COVERAGE.md`)

Markdown table — one row per (table × operation), columns for anon / customer / customer-other / operations / admin. Cells: ✓ allowed / ✗ denied / — n/a, each linked to the asserting test. This document is the source of truth for what the RLS audit covers.

### 4. CI workflows

**`.github/workflows/e2e.yml`** — Playwright on PR + push to `main`.

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
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
      - uses: actions/setup-node@v4 { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - if: failure(): upload trace + screenshots
```

Razorpay guard inside the prepaid spec:

```ts
test.skip(
  !process.env.RAZORPAY_KEY_ID?.startsWith('rzp_'),
  'no Razorpay key in CI — prepaid spec disabled',
);
```

**`.github/workflows/lighthouse.yml`** — runs on PR + nightly cron (`0 3 * * *` UTC). Same env block.

`lighthouserc.cjs`:

```js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm run preview',
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/scents',
        'http://localhost:4321/scent/azeziya',
        'http://localhost:4321/bundles/starter-set',
        'http://localhost:4321/cart',
        'http://localhost:4321/story',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // TODO(week-12): tighten to 0.85 / 0.95 before launch
        'categories:performance':    ['error', { minScore: 0.75 }],
        'categories:accessibility':  ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo':            ['error', { minScore: 0.90 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

### 5. Sentry (no-DSN safe)

`@sentry/astro` auto-loads from `sentry.client.config.*` and `sentry.server.config.*` at repo root — these are the only two init points; the integration handles client/server wiring. The shared scrubber lives in `src/lib/sentry.ts` and is imported by both.

`src/lib/sentry.ts` (shared helpers — not an init point):

```ts
const PII_KEYS = ['email', 'phone', 'pincode', 'line1', 'line2', 'name', 'address'];

export function scrubPii(event) {
  // strip PII_KEYS from event.request.data, event.contexts, event.breadcrumbs
  return event;
}

export function scrubTransaction(txn) {
  // redact query-string PII: email=, phone=, otp= from txn.request.url + breadcrumbs
  return txn;
}

export function shouldInitSentry() {
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
  return Boolean(dsn) && !dsn.startsWith('placeholder');
}
```

`sentry.client.config.ts` (repo root):

```ts
import * as Sentry from '@sentry/astro';
import { scrubPii, scrubTransaction, shouldInitSentry } from './src/lib/sentry';

if (shouldInitSentry()) {
  Sentry.init({
    dsn: import.meta.env.PUBLIC_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend: scrubPii,
    beforeSendTransaction: scrubTransaction,
  });
}
```

`sentry.server.config.ts` (repo root): same shape, server-side init.

`astro.config.mjs` adds `sentry()` to the `integrations` array unconditionally. The `shouldInitSentry()` guard in each config file is the only thing that decides whether `Sentry.init` actually runs. When no DSN: integration loads, guard short-circuits, app behaves identically to no-integration.

`.env.example` adds:

```
# Optional — get from sentry.io dashboard. Leave blank to disable.
PUBLIC_SENTRY_DSN=
```

A Vitest unit test (`tests/unit/sentry/scrubber.test.ts`) feeds a known PII payload through `scrubPii` and asserts every PII key is gone.

### 6. SEO

**Sitemap** — `npm install @astrojs/sitemap`. Add to `astro.config.mjs`:

```js
import sitemap from '@astrojs/sitemap';
// ...
site: 'https://qayra.in',
integrations: [sitemap({
  filter: (page) =>
    !page.includes('/admin') &&
    !page.includes('/ops') &&
    !page.includes('/account') &&
    !page.includes('/checkout') &&
    !page.includes('/api/'),
})],
```

**`public/robots.txt`**:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /ops
Disallow: /account
Disallow: /checkout
Disallow: /api/
Sitemap: https://qayra.in/sitemap-index.xml
```

**JSON-LD builders** — `src/lib/seo/jsonld.ts`:

```ts
export function buildProductLd(scent, siteUrl) { /* @type: Product */ }
export function buildBundleLd(bundle, siteUrl) { /* @type: Product, isVariantOf */ }
export function buildOrgLd(siteUrl)            { /* @type: Organization, brand qayra */ }
export function buildBreadcrumbLd(crumbs)      { /* @type: BreadcrumbList */ }
```

Unit tests:

- Product LD output includes name, image, offers.price, offers.availability, brand.
- `availability === 'https://schema.org/OutOfStock'` when `stock_qty === 0`, `InStock` otherwise.

**Components:**

- `<OrgJsonLd />` added once to root layout
- `<ProductJsonLd scent={scent} />` added to PDP `<head>`
- `<ProductJsonLd bundle={bundle} />` added to bundle PDP `<head>`
- `<BreadcrumbJsonLd crumbs={...} />` on PDP, bundle PDP, scents listing

Output:

```astro
<script type="application/ld+json" set:html={JSON.stringify(ld)} />
```

**OG defaults:**

- `public/og-default.png` (1200×630) — Midnight Velvet card.
- Root layout sets default `og:image`; PDP/bundle pages override with `image_urls[0]`.
- `<meta name="twitter:card" content="summary_large_image">` once in root.

**Per-page metadata audit** — a Vitest snapshot test that, against a running preview server, asserts for each of `/`, `/scents`, a sample PDP, a sample bundle PDP, `/story`, `/contact`, `/cart`:

- `<title>` exists and is unique
- `<meta name="description">` exists and is 50–160 chars
- `<link rel="canonical">` exists and matches the URL
- `og:title`, `og:description`, `og:image` exist

### 7. Mobile (Task 9)

**Playwright emulation** — `tests/e2e/mobile.spec.ts` runs the COD purchase flow under `devices['iPhone 13']`, `devices['Pixel 6']`, `devices['iPad (gen 7)']`. Catches viewport-specific layout breaks automatically.

**Hand-test checklist** — `tests/e2e/mobile-checklist.md`:

- Open every public route on Safari (iOS) or Chrome (Android)
- Cart drawer slide-in works without jank
- Sticky buy bar appears at correct scroll position
- Razorpay modal opens, card form usable, no horizontal scroll
- Pincode input shows numeric keypad (`inputmode="numeric"`)
- All form CTAs reach with thumb (44px tap targets)
- View transitions don't flash white between pages
- Hero loads under 3s on 4G

### 8. Copy review (Task 10)

**`docs/superpowers/copy-review-checklist.md`** — grep script + surface walkthrough.

Grep script:

```bash
# Lorem-ipsum and placeholder scan
grep -rn -iE "lorem|ipsum|placeholder|tbd|todo|xxx|fixme" \
  src/pages src/components src/layouts \
  --include="*.astro" --include="*.tsx" --include="*.ts"

# Brand casing — should always be lowercase 'qayra'
grep -rn "Qayra" src/ --include="*.astro" --include="*.tsx" --include="*.ts"

# Wrong currency
grep -rn -E '\$[0-9]|USD' src/ --include="*.astro" --include="*.tsx"
```

Surface walkthrough — one row per: home, scents, every PDP, cart, checkout, success, account orders/addresses/profile, 404, 500, policy pages (privacy, terms, shipping, returns, refunds), story, contact. Each row: copy ✓ / fix needed / N/A.

### 9. GitHub Actions secrets checklist

`docs/superpowers/secrets-checklist.md` — one row per secret with name + where to obtain. Each empty secret degrades a CI feature gracefully (skip, no-op) but never breaks the workflow.

| Secret | Source | Without it |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | supabase.com dashboard → Settings → API | Entire e2e/RLS workflow fails (these are required) |
| `RAZORPAY_KEY_ID` + 3 siblings | razorpay.com dashboard → Settings → API Keys | Prepaid spec is skipped, COD still runs |
| `PUBLIC_SENTRY_DSN` (repo or env var, not a CI secret) | sentry.io → Settings → Projects → Client Keys | `initSentry()` is no-op, no errors reported |

---

## Data flow

No new tables. No schema changes. Tests interact with existing tables only.

Within tests:

- Service-role client (`adminClient` in `tests/rls/helpers.ts`) bypasses RLS for setup/teardown.
- JWT-authenticated clients (`signedInAs(email, password)`) are the assertion targets — these are what real users use, so RLS enforcement is what we're proving.
- Anonymous client (`anonClient()`) is the unauthenticated target.

---

## Error handling

- **Test crashes mid-run:** `try/finally` in fulfilment-flow `afterAll` calls cleanup keyed by `runTag` so leaked rows never survive a crash.
- **Sentry missing DSN:** `shouldInitSentry()` returns false; `Sentry.init` never runs. App functions normally.
- **Razorpay missing key in CI:** prepaid spec skipped via `test.skip()`. CI green.
- **Lighthouse threshold miss:** workflow fails the PR with the specific category and URL. Author tightens; thresholds intentionally permissive to avoid noise.
- **RLS regression in CI:** the offending test file is named for the table — failure surface is obvious.

---

## Testing strategy for the QA work itself

- All new test files run as part of `npm run test:unit` (Vitest) or `npm run test:e2e` (Playwright).
- The `e2e.yml` workflow is the gate.
- `lighthouse.yml` is informational on PRs (does not block merge initially) and a nightly heartbeat.
- Hand-test checklists (mobile, copy review) are owned by the user with concrete pass/fail rows.

---

## Acceptance criteria

Same as the original Week 11 plan, re-stated with this design's specifics:

- [ ] `full-fulfilment-flow.spec.ts` walks one order through customer → ops → admin → customer → admin → anonymous, with `try/finally` cleanup keyed by run tag.
- [ ] 8 RLS test files cover all 21 tables; every (table × role × op) cell is recorded in `tests/rls/COVERAGE.md`.
- [ ] `e2e.yml` runs on PR + main; prepaid spec auto-skips without `RAZORPAY_KEY_ID`.
- [ ] `lighthouse.yml` runs on PR + nightly; 6 representative routes; thresholds 0.75 / 0.90 / 0.90 / 0.90 with TODO to tighten in Week 12.
- [ ] Sentry integration mounted in `astro.config.mjs`; `sentry.client.config.ts` and `sentry.server.config.ts` short-circuit via `shouldInitSentry()` when DSN is unset; PII scrubber covered by a Vitest test.
- [ ] `@astrojs/sitemap` integration emits a sitemap that excludes admin/ops/account/checkout/api.
- [ ] `public/robots.txt` published with sitemap reference and route disallows.
- [ ] JSON-LD on PDP, bundle PDP, and root (Organization). Builders unit-tested for required keys and availability.
- [ ] `mobile.spec.ts` runs COD flow on 3 emulated devices; hand-test checklist published.
- [ ] Copy-review checklist published; grep finds zero hits for lorem/placeholder/tbd/fixme/`Qayra`/`$`/USD.
- [ ] `docs/superpowers/secrets-checklist.md` lists every GH secret with source and graceful-degradation note.
- [ ] axe-core suite still 0 critical/serious (no regressions).

---

## What we are NOT doing in Week 11 (deferred to Week 12)

- Tightening Lighthouse thresholds to launch-grade
- Production Razorpay key activation (KYC-dependent)
- DNS cutover
- Final founder copy sign-off on `story` and policy pages

---

## Open questions (none — design approved 2026-05-18)
