-- Prevent duplicate reviews for the same (customer, scent, order) tuple.
-- The RLS insert policy only checks that the underlying order is delivered;
-- it does not prevent a customer from re-submitting on the same row. All
-- three columns are NOT NULL in the reviews schema, so a plain UNIQUE INDEX
-- is sufficient (no need to special-case NULL behavior).
--
-- WARNING: If duplicate (profile_id, scent_id, order_id) rows already exist
-- in production, this migration will fail to apply. Run this query first
-- and dedupe manually if it returns any rows:
--
--   select profile_id, scent_id, order_id, count(*)
--   from public.reviews
--   group by 1,2,3 having count(*) > 1;

create unique index if not exists reviews_profile_scent_order_unique
  on public.reviews (profile_id, scent_id, order_id);
