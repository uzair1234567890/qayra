-- ============================================================================
-- Enable RLS on every public table
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.addresses           enable row level security;
alter table public.products            enable row level security;
alter table public.scents              enable row level security;
alter table public.bundles             enable row level security;
alter table public.bundle_items        enable row level security;
alter table public.carts               enable row level security;
alter table public.cart_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_history enable row level security;
alter table public.shipments           enable row level security;
alter table public.returns             enable row level security;
alter table public.discounts           enable row level security;
alter table public.offers              enable row level security;
alter table public.banners             enable row level security;
alter table public.reviews             enable row level security;
alter table public.store_settings      enable row level security;
alter table public.audit_log           enable row level security;

-- ============================================================================
-- Helper: read role from current session
-- ============================================================================

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anon'
  );
$$;

-- ============================================================================
-- Profiles
-- ============================================================================

create policy "profiles: read own or staff reads all" on public.profiles
  for select using (
    id = auth.uid() or public.current_role() in ('operations','admin')
  );

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: admin updates any" on public.profiles
  for update using (public.current_role() = 'admin');

-- ============================================================================
-- Addresses
-- ============================================================================

create policy "addresses: own or staff read" on public.addresses
  for select using (
    profile_id = auth.uid() or public.current_role() in ('operations','admin')
  );

create policy "addresses: own insert/update/delete" on public.addresses
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ============================================================================
-- Catalog (public read, admin write)
-- ============================================================================

create policy "products: public read active" on public.products
  for select using (status = 'active' or public.current_role() in ('admin','operations'));

create policy "products: admin writes" on public.products
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "scents: public read active" on public.scents
  for select using (active = true or public.current_role() in ('admin','operations'));

create policy "scents: admin writes" on public.scents
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "bundles: public read active" on public.bundles
  for select using (status = 'active' or public.current_role() in ('admin','operations'));

create policy "bundles: admin writes" on public.bundles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "bundle_items: read with bundle" on public.bundle_items
  for select using (
    exists (select 1 from public.bundles b
            where b.id = bundle_id
              and (b.status = 'active' or public.current_role() in ('admin','operations')))
  );

create policy "bundle_items: admin writes" on public.bundle_items
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================================
-- Cart
-- ============================================================================

create policy "carts: own" on public.carts
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "cart_items: own via cart" on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())
  );

-- ============================================================================
-- Orders & related
-- ============================================================================

create policy "orders: own or staff" on public.orders
  for select using (
    profile_id = auth.uid() or public.current_role() in ('operations','admin')
  );

create policy "orders: customer creates own" on public.orders
  for insert with check (profile_id = auth.uid());

create policy "orders: staff updates" on public.orders
  for update using (public.current_role() in ('operations','admin'));

create policy "order_items: read with order" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "order_items: insert with own order" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid())
  );

create policy "order_status_history: read with order" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "order_status_history: staff writes" on public.order_status_history
  for insert with check (public.current_role() in ('operations','admin'));

create policy "shipments: read with order" on public.shipments
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "shipments: staff writes" on public.shipments
  for all using (public.current_role() in ('operations','admin'))
  with check (public.current_role() in ('operations','admin'));

create policy "returns: read with order" on public.returns
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.current_role() in ('operations','admin')))
  );

create policy "returns: customer requests own" on public.returns
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid())
  );

create policy "returns: staff updates" on public.returns
  for update using (public.current_role() in ('operations','admin'));

-- ============================================================================
-- Marketing
-- ============================================================================

create policy "discounts: public read active" on public.discounts
  for select using (
    (active_from is null or active_from <= now())
    and (active_until is null or active_until > now())
    or public.current_role() = 'admin'
  );

create policy "discounts: admin writes" on public.discounts
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "offers: public read active" on public.offers
  for select using (active = true or public.current_role() = 'admin');

create policy "offers: admin writes" on public.offers
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "banners: public read active" on public.banners
  for select using (
    (active_from is null or active_from <= now())
    and (active_until is null or active_until > now())
    or public.current_role() = 'admin'
  );

create policy "banners: admin writes" on public.banners
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "reviews: public read published" on public.reviews
  for select using (status = 'published' or public.current_role() = 'admin');

create policy "reviews: customer inserts for own delivered order" on public.reviews
  for insert with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.orders
      where id = reviews.order_id
        and profile_id = auth.uid()
        and status = 'delivered'
    )
  );

create policy "reviews: admin moderates" on public.reviews
  for update using (public.current_role() = 'admin');

-- ============================================================================
-- Store settings
-- ============================================================================

create policy "store_settings: public read" on public.store_settings
  for select using (true);

create policy "store_settings: admin writes" on public.store_settings
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================================
-- Audit log
-- ============================================================================

create policy "audit_log: admin reads" on public.audit_log
  for select using (public.current_role() = 'admin');
