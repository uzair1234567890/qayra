-- finalize_paid_order() looks up orders by razorpay_order_id on every
-- successful payment verification. Without an index this is a sequential
-- scan that grows linearly with the orders table. Partial index keeps it
-- small (only prepaid orders have a non-null razorpay_order_id).

create index if not exists orders_razorpay_order_id_idx
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;
