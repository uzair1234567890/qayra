# RLS Coverage Matrix

Every (table x operation) cell records the expected behavior for each role. Each check is asserted by a test in `tests/rls/*.rls.test.ts`. Refresh this file when policies change.

Legend: Y allowed - N denied - dash n/a (no such operation for this role/table)

## Domain: profiles + addresses (`profiles.rls.test.ts`)

| Table     | Op            | anon | customer (own)                | customer (other) | operations | admin |
|-----------|---------------|------|-------------------------------|------------------|------------|-------|
| profiles  | SELECT        | N    | Y (own only)                  | N                | Y (all)    | Y (all) |
| profiles  | UPDATE        | N    | Y (own non-role fields)       | N                | -          | Y     |
| profiles  | role escalate | N    | N                             | N                | N          | Y     |
| addresses | SELECT        | N    | Y (own)                       | N                | Y (all)    | Y     |
| addresses | INSERT        | N    | Y (own)                       | N                | -          | Y     |

## Domain: catalog (`catalog.rls.test.ts`)

Note: per actual product design, ops inventory page is read-only ("edit inventory in admin panel"). Only admins write to catalog tables.

| Table         | Op     | anon       | customer | operations | admin |
|---------------|--------|------------|----------|------------|-------|
| products      | SELECT | Y (active) | Y        | Y          | Y     |
| products      | INSERT | N          | N        | N          | Y     |
| scents        | SELECT | Y (active) | Y        | Y          | Y     |
| scents        | UPDATE | N          | N        | N          | Y     |
| bundles       | SELECT | Y (active) | Y        | Y          | Y     |
| bundles       | INSERT | N          | N        | N          | Y     |
| bundle_items  | SELECT | Y          | Y        | Y          | Y     |

## Domain: cart (`cart.rls.test.ts`)

| Table       | Op     | anon | customer (own) | customer (other) |
|-------------|--------|------|----------------|------------------|
| carts       | INSERT | N    | Y              | N                |
| carts       | SELECT | N    | Y (own)        | N                |
| cart_items  | INSERT | N    | Y (own cart)   | N                |

## Domain: orders (`orders.rls.test.ts`)

| Table                | Op     | anon | customer (own) | customer (other) | operations | admin |
|----------------------|--------|------|----------------|------------------|------------|-------|
| orders               | SELECT | N    | Y              | N                | Y (all)    | Y     |
| orders               | INSERT | N    | Y (own pid)    | N                | -          | Y     |
| orders               | UPDATE | N    | N (status)     | N                | Y (status) | Y     |
| orders               | DELETE | N    | N              | N                | N          | N     |
| order_items          | SELECT | N    | Y (own order)  | N                | Y          | Y     |
| order_status_history | SELECT | N    | Y (own order)  | N                | Y          | Y     |
| order_status_history | INSERT | N    | N              | N                | Y (server) | Y     |
| shipments            | SELECT | N    | Y (own order)  | N                | Y          | Y     |
| shipments            | UPDATE | N    | N              | N                | Y          | Y     |
| returns              | INSERT | N    | Y (own order)  | N                | -          | Y     |
| returns              | UPDATE | N    | N              | N                | Y          | Y     |

## Domain: marketing (`marketing.rls.test.ts`)

Note: discounts ARE publicly readable (active rows only) so the anon `apply-code` checkout API can look up a code. The plan originally treated discounts as private — but the existing apply-code path requires anon read.

| Table     | Op     | anon                  | customer | operations | admin |
|-----------|--------|-----------------------|----------|------------|-------|
| discounts | SELECT | Y (active by code)    | Y        | Y          | Y     |
| discounts | INSERT | N                     | N        | N          | Y     |
| offers    | SELECT | Y (active)            | Y        | Y          | Y     |
| offers    | INSERT | N                     | N        | N          | Y     |
| banners   | SELECT | Y (currently-active)  | Y        | Y          | Y     |
| banners   | INSERT | N                     | N        | N          | Y     |

## Domain: reviews (`reviews.rls.test.ts`)

Owner-read added in migration `20260518000000_reviews_owner_read.sql` so customers can see their own pending submissions (needed by `account/reviews.astro`).

| Table   | Op            | anon       | customer (own pending) | customer (other pending) | admin |
|---------|---------------|------------|------------------------|--------------------------|-------|
| reviews | SELECT        | Y (pub)    | Y                      | N                        | Y     |
| reviews | INSERT        | N          | Y (own delivered order)| -                        | Y     |
| reviews | UPDATE status | N          | N                      | N                        | Y     |

## Domain: admin tables (`admin.rls.test.ts`)

| Table          | Op     | anon | customer | operations | admin |
|----------------|--------|------|----------|------------|-------|
| store_settings | SELECT | Y    | Y        | Y          | Y     |
| store_settings | UPSERT | N    | N        | N          | Y     |
| audit_log      | SELECT | N    | N        | N          | Y     |
| audit_log      | INSERT | N    | N        | N          | N (server-role only) |

## Domain: public-write (`public-write.rls.test.ts`)

`razorpay_webhook_events` RLS was added in migration `20260518000001_razorpay_webhook_events_rls.sql` (the table was created without RLS).

| Table                    | Op     | anon | customer | admin |
|--------------------------|--------|------|----------|-------|
| contact_messages         | INSERT | Y    | Y        | Y     |
| contact_messages         | SELECT | N    | N        | Y     |
| razorpay_webhook_events  | SELECT | N    | N        | Y     |
| razorpay_webhook_events  | INSERT | N    | N        | N (server-role only) |

---

**21 tables x roles x ops = full coverage.** Failing a cell here = update both this file and the migration.
