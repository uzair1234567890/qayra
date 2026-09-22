-- Companion to 20260518000002_reset_order_code_seq_if_empty.sql.
-- The earlier reset was followed by a verification call to next_order_code()
-- which consumed Q-0001. This re-runs the same idempotent reset so the FIRST
-- real customer order is Q-0001 instead of Q-0002. Same safety guard: only
-- resets if the orders table is empty.

do $$
begin
  if (select count(*) from public.orders) = 0 then
    perform setval('public.order_code_seq', 1, false);
  end if;
end;
$$;
