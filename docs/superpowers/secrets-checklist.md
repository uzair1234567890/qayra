# GitHub Actions Secrets Checklist

The CI workflows (`e2e.yml`, `lighthouse.yml`) and the optional Sentry
integration read from these secrets/env vars. Each empty value triggers a
graceful fallback — workflows still run, just with narrower coverage.

Add via **GitHub -> repo -> Settings -> Secrets and variables -> Actions ->
New repository secret**.

| Secret | Required by | Source | Without it |
|--------|-------------|--------|------------|
| `SUPABASE_URL` | `e2e.yml`, `lighthouse.yml` | supabase.com dashboard -> Settings -> API -> Project URL | E2E + RLS suite fails (these are required) |
| `SUPABASE_ANON_KEY` | `e2e.yml`, `lighthouse.yml` | supabase.com -> Settings -> API -> anon key | Same — required |
| `SUPABASE_SERVICE_ROLE_KEY` | `e2e.yml` | supabase.com -> Settings -> API -> service_role key | RLS audit + test user fixture fail — required |
| `RAZORPAY_KEY_ID` | `e2e.yml` (optional) | razorpay.com -> Settings -> API Keys -> Test Mode | Prepaid spec is skipped (`test.skip` guard reads this), COD path still runs |
| `RAZORPAY_KEY_SECRET` | `e2e.yml` (optional) | razorpay.com (same as above) | Same — prepaid skipped |
| `PUBLIC_RAZORPAY_KEY_ID` | `e2e.yml` (optional) | razorpay.com (same as above) | Same — prepaid skipped |
| `RAZORPAY_WEBHOOK_SECRET` | `e2e.yml` (optional) | razorpay.com -> Webhooks -> Webhook secret | Webhook verification tests skipped |
| `PUBLIC_SENTRY_DSN` | app env (not a CI secret) | sentry.io -> Settings -> Projects -> Client Keys | `shouldInitSentry()` returns false, `Sentry.init` never runs, no errors are sent |

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
