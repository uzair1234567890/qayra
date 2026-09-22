-- C1: Rename public.current_role() → public.app_current_role()
-- Reason: public.current_role() shadows the Postgres built-in, causing a footgun
-- where future policies that drop the public. prefix silently call the wrong function.
-- Also adds REVOKE EXECUTE from PUBLIC and explicit grants to anon/authenticated.

-- 1. Create the replacement function
create or replace function public.app_current_role()
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

-- Lock down execute: revoke default public grant, grant only to accessing roles
revoke execute on function public.app_current_role() from public;
grant execute on function public.app_current_role() to anon, authenticated;

-- 2. Drop all policies that reference public.current_role()
--    (Postgres will refuse to drop the function while these exist)
drop policy if exists "profiles: read own or staff reads all"                     on public.profiles;
drop policy if exists "profiles: admin updates any"                               on public.profiles;
drop policy if exists "addresses: own or staff read"                              on public.addresses;
drop policy if exists "products: public read active"                              on public.products;
drop policy if exists "products: admin writes"                                    on public.products;
drop policy if exists "scents: public read active"                                on public.scents;
drop policy if exists "scents: admin writes"                                      on public.scents;
drop policy if exists "bundles: public read active"                               on public.bundles;
drop policy if exists "bundles: admin writes"                                     on public.bundles;
drop policy if exists "bundle_items: read with bundle"                            on public.bundle_items;
drop policy if exists "bundle_items: admin writes"                                on public.bundle_items;
drop policy if exists "orders: own or staff"                                      on public.orders;
drop policy if exists "orders: staff updates"                                     on public.orders;
drop policy if exists "order_items: read with order"                              on public.order_items;
drop policy if exists "order_status_history: read with order"                     on public.order_status_history;
drop policy if exists "order_status_history: staff writes"                        on public.order_status_history;
drop policy if exists "shipments: read with order"                                on public.shipments;
drop policy if exists "shipments: staff writes"                                   on public.shipments;
drop policy if exists "returns: read with order"                                  on public.returns;
drop policy if exists "returns: staff updates"                                    on public.returns;
drop policy if exists "discounts: public read active"                             on public.discounts;
drop policy if exists "discounts: admin writes"                                   on public.discounts;
drop policy if exists "offers: public read active"                                on public.offers;
drop policy if exists "offers: admin writes"                                      on public.offers;
drop policy if exists "banners: public read active"                               on public.banners;
drop policy if exists "banners: admin writes"                                     on public.banners;
drop policy if exists "reviews: public read published"                            on public.reviews;
drop policy if exists "reviews: admin moderates"                                  on public.reviews;
drop policy if exists "store_settings: admin writes"                              on public.store_settings;
drop policy if exists "audit_log: admin reads"                                    on public.audit_log;
drop policy if exists "contact_messages: admin reads/updates"                     on public.contact_messages;

-- 3. Drop the old shadowing function
drop function if exists public.current_role();

-- 4. Recreate all dropped policies using public.app_current_role()

-- Profiles
create policy "profiles: read own or staff reads all" on public.profiles
  for select using (
    id = auth.uid() or public.app_current_role() in ('operations','admin')
  );
create policy "profiles: admin updates any" on public.profiles
  for update using (public.app_current_role() = 'admin');

-- Addresses
create policy "addresses: own or staff read" on public.addresses
  for select using (
    profile_id = auth.uid() or public.app_current_role() in ('operations','admin')
  );

-- Catalog
create policy "products: public read active" on public.products
  for select using (status = 'active' or public.app_current_role() in ('admin','operations'));
create policy "products: admin writes" on public.products
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

create policy "scents: public read active" on public.scents
  for select using (active = true or public.app_current_role() in ('admin','operations'));
create policy "scents: admin writes" on public.scents
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

create policy "bundles: public read active" on public.bundles
  for select using (status = 'active' or public.app_current_role() in ('admin','operations'));
create policy "bundles: admin writes" on public.bundles
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

create policy "bundle_items: read with bundle" on public.bundle_items
  for select using (
    exists (select 1 from public.bundles b
            where b.id = bundle_id
              and (b.status = 'active' or public.app_current_role() in ('admin','operations')))
  );
create policy "bundle_items: admin writes" on public.bundle_items
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

-- Orders
create policy "orders: own or staff" on public.orders
  for select using (
    profile_id = auth.uid() or public.app_current_role() in ('operations','admin')
  );
create policy "orders: staff updates" on public.orders
  for update using (public.app_current_role() in ('operations','admin'));

create policy "order_items: read with order" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.app_current_role() in ('operations','admin')))
  );

create policy "order_status_history: read with order" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.app_current_role() in ('operations','admin')))
  );
create policy "order_status_history: staff writes" on public.order_status_history
  for insert with check (public.app_current_role() in ('operations','admin'));

create policy "shipments: read with order" on public.shipments
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.app_current_role() in ('operations','admin')))
  );
create policy "shipments: staff writes" on public.shipments
  for all using (public.app_current_role() in ('operations','admin'))
  with check (public.app_current_role() in ('operations','admin'));

create policy "returns: read with order" on public.returns
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.profile_id = auth.uid() or public.app_current_role() in ('operations','admin')))
  );
create policy "returns: staff updates" on public.returns
  for update using (public.app_current_role() in ('operations','admin'));

-- Marketing
create policy "discounts: public read active" on public.discounts
  for select using (
    (active_from is null or active_from <= now())
    and (active_until is null or active_until > now())
    or public.app_current_role() = 'admin'
  );
create policy "discounts: admin writes" on public.discounts
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

create policy "offers: public read active" on public.offers
  for select using (active = true or public.app_current_role() = 'admin');
create policy "offers: admin writes" on public.offers
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

create policy "banners: public read active" on public.banners
  for select using (
    (active_from is null or active_from <= now())
    and (active_until is null or active_until > now())
    or public.app_current_role() = 'admin'
  );
create policy "banners: admin writes" on public.banners
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

create policy "reviews: public read published" on public.reviews
  for select using (status = 'published' or public.app_current_role() = 'admin');
create policy "reviews: admin moderates" on public.reviews
  for update using (public.app_current_role() = 'admin');

-- Store settings
create policy "store_settings: admin writes" on public.store_settings
  for all using (public.app_current_role() = 'admin')
  with check (public.app_current_role() = 'admin');

-- Audit log
create policy "audit_log: admin reads" on public.audit_log
  for select using (public.app_current_role() = 'admin');

-- Contact messages
create policy "contact_messages: admin reads/updates" on public.contact_messages
  for all using (public.app_current_role() = 'admin');
