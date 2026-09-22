-- Fix: current_role() must be SECURITY DEFINER to avoid infinite RLS recursion.
-- Without it: scents policy → current_role() → profiles SELECT → profiles policy
--             → current_role() → profiles SELECT → ... → 54001 stack overflow.
-- SECURITY DEFINER makes it run as the function owner, bypassing RLS on profiles.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anon'
  );
$$;
