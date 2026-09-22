-- razorpay_webhook_events was created without RLS — meaning anon/authenticated
-- users could read or write idempotency keys via PostgREST. Lock it down to
-- service-role writes and admin-only reads.

alter table public.razorpay_webhook_events enable row level security;

create policy "razorpay_webhook_events: admin reads" on public.razorpay_webhook_events
  for select using (public.app_current_role() = 'admin');
