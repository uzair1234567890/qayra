-- Tighten `orders: staff updates` to include WITH CHECK, matching the
-- pattern used by every other staff-writable table (shipments, reviews,
-- order_status_history, etc.). Without WITH CHECK, the USING clause only
-- gates which rows can be updated — it does not gate the row's post-image,
-- which is a footgun if future column grants are loosened. Defensive
-- consistency fix; no behavior change for current callers.

drop policy if exists "orders: staff updates" on public.orders;
create policy "orders: staff updates" on public.orders
  for update using (public.app_current_role() in ('operations','admin'))
  with check (public.app_current_role() in ('operations','admin'));
