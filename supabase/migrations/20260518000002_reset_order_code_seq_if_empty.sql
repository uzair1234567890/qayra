-- Reset order_code_seq to 1 ONLY if the orders table is empty. After the
-- test-data purge on 2026-05-18, the sequence was at 15 but the orders table
-- was at zero rows. This brings the next next_order_code() back to Q-0001.
--
-- Idempotent: in any environment where orders already has rows (e.g. after
-- real customers have placed orders), this is a no-op, so re-running the
-- migration cannot collide with existing order codes.

do $$
begin
  if (select count(*) from public.orders) = 0 then
    perform setval('public.order_code_seq', 1, false);
  end if;
end;
$$;
