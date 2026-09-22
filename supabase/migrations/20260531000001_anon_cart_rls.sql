-- Allow anonymous users to access their own cart via the qayra_cart cookie token.
-- PostgREST exposes cookie values via current_setting('request.cookie.<name>', true).

create policy "carts: anon token read/write" on public.carts
  for all
  using (
    anon_token is not null
    and anon_token = current_setting('request.cookie.qayra_cart', true)
  )
  with check (
    anon_token is not null
    and anon_token = current_setting('request.cookie.qayra_cart', true)
  );

create policy "cart_items: anon via cart token" on public.cart_items
  for all
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id
        and c.anon_token = current_setting('request.cookie.qayra_cart', true)
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id
        and c.anon_token = current_setting('request.cookie.qayra_cart', true)
    )
  );
