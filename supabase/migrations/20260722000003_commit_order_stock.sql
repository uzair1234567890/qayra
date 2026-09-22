-- Decrement scents.stock_qty for each line of a paid order.
-- Idempotent: orders.stock_committed_at is set the first time, and subsequent
-- calls return false without touching stock.
-- Handles direct scent purchases AND bundle purchases (decrements each
-- bundle component's scent stock by order_item.quantity * bundle_items.quantity).

alter table public.orders
  add column if not exists stock_committed_at timestamptz null;

create or replace function public.commit_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_committed timestamptz;
begin
  -- Row-level lock prevents concurrent commits for the same order.
  select stock_committed_at into v_committed
  from public.orders
  where id = p_order_id
  for update;

  if v_committed is not null then
    return false;
  end if;

  -- Aggregate the total quantity to deduct for each scent across both direct
  -- scent lines and bundle-component lines. Doing this in one CTE avoids the
  -- UPDATE...FROM "one row wins" pitfall when the same scent appears in both
  -- a direct line and a bundle line of the same order.
  with decrements as (
    select oi.scent_id as scent_id, sum(oi.quantity)::int as qty
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.scent_id is not null
    group by oi.scent_id
    union all
    select bi.scent_id as scent_id, sum(oi.quantity * bi.quantity)::int as qty
    from public.order_items oi
    join public.bundle_items bi on bi.bundle_id = oi.bundle_id
    where oi.order_id = p_order_id
      and oi.bundle_id is not null
    group by bi.scent_id
  ),
  totals as (
    select scent_id, sum(qty)::int as total_qty
    from decrements
    group by scent_id
  )
  update public.scents s
  set stock_qty = greatest(0, s.stock_qty - t.total_qty)
  from totals t
  where s.id = t.scent_id;

  update public.orders
  set stock_committed_at = now()
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.commit_order_stock(uuid) from public;
grant execute on function public.commit_order_stock(uuid) to authenticated;
