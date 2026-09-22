-- Wrap the inner auth.uid() call in (select ...) so Postgres can cache the
-- result as an InitPlan instead of re-evaluating per row in RLS predicates.
-- This is the Supabase-recommended pattern for STABLE security-definer
-- functions used across many RLS policies (orders, order_items, addresses,
-- shipments, etc.) — without it, every policy evaluation does a fresh
-- profiles lookup keyed on auth.uid(), which the planner cannot share
-- between rows of the same query.

create or replace function public.app_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid())),
    'anon'
  );
$$;

-- Grants unchanged from rename migration (20260525000000); no need to re-issue.
