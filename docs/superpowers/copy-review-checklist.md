# Copy Review Checklist

Run before launch (Week 12). Catches lorem-ipsum, brand-casing slips, wrong
currency symbols, and per-page copy gaps.

---

## Phase 1: Mechanical grep

Run all four greps. Each should return zero hits (or only acceptable hits
listed at the bottom of this file).

```bash
# 1. Lorem-ipsum / placeholder / TODO / FIXME leftover in source.
#    The 'placeholder' hit is noisy because HTML <input placeholder="..."> and
#    Tailwind `placeholder-*` classes match. Use this stricter pattern instead:
grep -rn -iE "lorem|ipsum|\btbd\b|\btodo\b|\bxxx\b|\bfixme\b" \
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
- If it's intentional (e.g., a documented placeholder DSN check in
  `src/lib/sentry.ts`), add it to the "Known acceptable hits" list at the
  bottom of this file with a justification.
- Otherwise, fix the source and re-run.

---

## Phase 2: Surface walkthrough

Open each surface in the browser and verify copy is intentional, complete, and
on-brand. Mark pass / fail / N/A.

### Customer storefront

| Surface | Path | Copy ok | Notes |
|---------|------|---------|-------|
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

| Surface | Path | Copy ok | Notes |
|---------|------|---------|-------|
| Orders list | `/account/orders` | | |
| Order detail | `/account/orders/<code>` | | |
| Addresses | `/account/addresses` | | |
| Profile | `/account/profile` | | |
| Reviews (mine) | `/account/reviews` | | |

### Auth

| Surface | Path | Copy ok | Notes |
|---------|------|---------|-------|
| Sign in | `/auth/sign-in` | | |
| Sign up | `/auth/sign-up` | | |
| OAuth callback (visual only) | `/auth/callback` | | |

### Policy pages

These almost certainly need founder + legal sign-off in Week 12.

| Surface | Path | Copy ok | Notes |
|---------|------|---------|-------|
| Privacy | `/privacy` | | |
| Terms | `/terms` | | |
| Shipping | `/shipping` | | |
| Returns | `/returns` | | |
| Refunds | `/refunds` | | |

---

## Phase 3: Cross-cutting checks

- [ ] Brand name is always lowercase `qayra` everywhere in user-facing copy.
- [ ] Currency is always `INR symbol`. No `$` / `USD` / `Rs.` / `INR ` prefixes.
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

- `src/lib/sentry.ts:2,57` — references the literal string "placeholder" as a sentinel for placeholder DSN detection; not user-facing copy.
- All `<input placeholder="...">` attributes and `placeholder-*` Tailwind classes — these are form UX, not lorem-ipsum copy. The stricter grep above excludes them.
