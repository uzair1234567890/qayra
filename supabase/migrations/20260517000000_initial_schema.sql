-- ============================================================================
-- qayra initial schema
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";       -- gen_random_uuid

-- ============================================================================
-- Identity & access
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer','operations','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  pincode     text not null,
  phone       text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index addresses_profile_idx on public.addresses (profile_id);

-- ============================================================================
-- Catalog
-- ============================================================================

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  base_price   integer not null check (base_price >= 0),    -- INR paise
  status       text not null default 'draft' check (status in ('draft','active','archived')),
  created_at   timestamptz not null default now()
);

create table public.scents (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  slug          text unique not null,
  name          text not null,
  tagline       text,
  description   text,
  top_notes     text,
  heart_notes   text,
  base_notes    text,
  image_urls    text[] not null default '{}',
  stock_qty     integer not null default 0 check (stock_qty >= 0),
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index scents_product_idx on public.scents (product_id);

create table public.bundles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  price        integer not null check (price >= 0),
  image_url    text,
  status       text not null default 'draft' check (status in ('draft','active','archived')),
  created_at   timestamptz not null default now()
);

create table public.bundle_items (
  bundle_id  uuid not null references public.bundles(id) on delete cascade,
  scent_id   uuid not null references public.scents(id),
  quantity   integer not null default 1 check (quantity > 0),
  primary key (bundle_id, scent_id)
);

-- ============================================================================
-- Cart & orders
-- ============================================================================

create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade,
  anon_token  text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (profile_id is not null or anon_token is not null)
);
create index carts_profile_idx on public.carts (profile_id);

create table public.cart_items (
  id        uuid primary key default gen_random_uuid(),
  cart_id   uuid not null references public.carts(id) on delete cascade,
  scent_id  uuid references public.scents(id),
  bundle_id uuid references public.bundles(id),
  quantity  integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  check ((scent_id is not null)::int + (bundle_id is not null)::int = 1)
);
create index cart_items_cart_idx on public.cart_items (cart_id);

create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  code                   text unique not null,
  profile_id             uuid not null references public.profiles(id),
  status                 text not null default 'pending' check (status in
                          ('pending','paid','packed','shipped','delivered','cancelled','returned')),
  payment_method         text not null check (payment_method in ('prepaid','cod')),
  payment_status         text not null default 'pending' check (payment_status in
                          ('pending','paid','failed','refunded')),
  subtotal               integer not null check (subtotal >= 0),
  discount_total         integer not null default 0 check (discount_total >= 0),
  shipping_total         integer not null default 0 check (shipping_total >= 0),
  cod_surcharge          integer not null default 0 check (cod_surcharge >= 0),
  total                  integer not null check (total >= 0),
  address_snapshot       jsonb not null,
  razorpay_order_id      text,
  razorpay_payment_id    text,
  created_at             timestamptz not null default now()
);
create index orders_profile_idx on public.orders (profile_id);
create index orders_status_idx  on public.orders (status);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  scent_id        uuid references public.scents(id),
  bundle_id       uuid references public.bundles(id),
  name_snapshot   text not null,
  price_snapshot  integer not null check (price_snapshot >= 0),
  quantity        integer not null check (quantity > 0),
  check ((scent_id is not null)::int + (bundle_id is not null)::int = 1)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      text not null,
  note        text,
  actor_id    uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index osh_order_idx on public.order_status_history (order_id);

create table public.shipments (
  order_id        uuid primary key references public.orders(id) on delete cascade,
  courier_name    text not null,
  awb_number      text not null,
  dispatched_at   timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table public.returns (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  reason          text not null,
  status          text not null default 'requested' check (status in
                    ('requested','approved','rejected','refunded')),
  refund_amount   integer check (refund_amount >= 0),
  processed_at    timestamptz,
  actor_id        uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);
create index returns_order_idx on public.returns (order_id);

-- ============================================================================
-- Marketing
-- ============================================================================

create table public.discounts (
  code           text primary key,
  type           text not null check (type in ('percent','fixed')),
  value          integer not null check (value > 0),
  min_subtotal   integer not null default 0,
  max_uses       integer,
  used_count     integer not null default 0,
  active_from    timestamptz,
  active_until   timestamptz,
  created_at     timestamptz not null default now()
);

create table public.offers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rule_json   jsonb not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.banners (
  id            uuid primary key default gen_random_uuid(),
  image_url     text,
  headline      text,
  cta_text      text,
  cta_url       text,
  position      text not null check (position in ('hero','announcement')),
  active_from   timestamptz,
  active_until  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  scent_id     uuid not null references public.scents(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  order_id     uuid not null references public.orders(id),
  rating       integer not null check (rating between 1 and 5),
  title        text,
  body         text,
  photo_urls   text[] not null default '{}',
  status       text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at   timestamptz not null default now()
);
create index reviews_scent_idx on public.reviews (scent_id);
create index reviews_profile_idx on public.reviews (profile_id);

-- ============================================================================
-- Store settings
-- ============================================================================

create table public.store_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Audit
-- ============================================================================

create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles(id),
  action        text not null,
  target_table  text not null,
  target_id     uuid,
  payload       jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log (target_table, target_id);
