-- ============================================================================
-- Cart & checkout hardening: unique indices, atomic RPCs, webhook idempotency
-- ============================================================================

-- Unique index to prevent duplicate authenticated carts (handles TOCTOU race)
create unique index if not exists carts_profile_id_unique
  on public.carts (profile_id)
  where profile_id is not null;

-- Unique partial indices on cart_items for atomic ON CONFLICT upserts
create unique index if not exists cart_items_cart_scent_unique
  on public.cart_items (cart_id, scent_id)
  where scent_id is not null;

create unique index if not exists cart_items_cart_bundle_unique
  on public.cart_items (cart_id, bundle_id)
  where bundle_id is not null;

-- ============================================================================
-- Order code sequence — collision-free codes without TOCTOU races
-- ============================================================================

create sequence if not exists public.order_code_seq start 1;

-- Initialize from existing orders so codes don't restart at Q-0001
do $$
declare
  n bigint;
begin
  select count(*) into n from public.orders;
  if n > 0 then
    perform setval('public.order_code_seq', n);
  end if;
end;
$$;

create or replace function public.next_order_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'Q-' || lpad(nextval('public.order_code_seq')::text, 4, '0');
end;
$$;

-- ============================================================================
-- upsert_cart_item — atomic add-or-increment, no TOCTOU race
-- ============================================================================

create or replace function public.upsert_cart_item(
  p_cart_id  uuid,
  p_scent_id uuid,
  p_bundle_id uuid,
  p_quantity int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_scent_id is not null then
    insert into public.cart_items (cart_id, scent_id, quantity)
    values (p_cart_id, p_scent_id, p_quantity)
    on conflict (cart_id, scent_id) where scent_id is not null
    do update set quantity = public.cart_items.quantity + excluded.quantity;
  else
    insert into public.cart_items (cart_id, bundle_id, quantity)
    values (p_cart_id, p_bundle_id, p_quantity)
    on conflict (cart_id, bundle_id) where bundle_id is not null
    do update set quantity = public.cart_items.quantity + excluded.quantity;
  end if;
end;
$$;

-- ============================================================================
-- finalize_paid_order — atomic payment finalization (no double-finalization)
-- ============================================================================

create or replace function public.finalize_paid_order(
  p_rzp_order_id  text,
  p_rzp_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id         uuid;
  v_code       text;
  v_profile_id uuid;
begin
  update public.orders
  set
    status             = 'paid',
    payment_status     = 'paid',
    razorpay_payment_id = p_rzp_payment_id
  where razorpay_order_id = p_rzp_order_id
    and payment_status    = 'pending'
  returning id, code, profile_id into v_id, v_code, v_profile_id;

  if v_id is null then
    raise exception 'order_not_found_or_already_finalized';
  end if;

  insert into public.order_status_history (order_id, status, note)
  values (v_id, 'paid', 'Razorpay payment verified');

  return jsonb_build_object(
    'order_id',   v_id,
    'code',       v_code,
    'profile_id', v_profile_id
  );
end;
$$;

-- ============================================================================
-- razorpay_webhook_events — idempotency table to deduplicate webhook replays
-- ============================================================================

create table if not exists public.razorpay_webhook_events (
  id           text primary key,
  processed_at timestamptz not null default now()
);

-- ============================================================================
-- get_auth_uid_by_email — look up existing user during guest checkout
-- ============================================================================

create or replace function public.get_auth_uid_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where email = p_email limit 1;
$$;
