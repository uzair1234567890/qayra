-- admin_upsert_product: atomic create-or-update for the admin product form.
-- On CREATE (p_id is null): inserts a parent products row with slug "<slug>-base"
-- and base_price = payload.price_paise, then inserts a scents row linked to it.
-- On UPDATE: updates both the parent's name + base_price and the scent's fields.
-- Returns the scent id either way.

create or replace function public.admin_upsert_product(
  p_id uuid,
  p_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scent_id uuid;
  v_product_id uuid;
  v_parent_slug text;
begin
  if p_id is null then
    v_parent_slug := (p_payload->>'slug') || '-base';
    insert into public.products (name, slug, base_price, status)
      values (
        p_payload->>'name',
        v_parent_slug,
        (p_payload->>'price_paise')::int,
        'active'
      )
      returning id into v_product_id;

    insert into public.scents (
      product_id, slug, name, tagline, description,
      top_notes, heart_notes, base_notes,
      image_urls, stock_qty, sort_order, active
    ) values (
      v_product_id,
      p_payload->>'slug',
      p_payload->>'name',
      p_payload->>'tagline',
      p_payload->>'description',
      p_payload->>'top_notes',
      p_payload->>'heart_notes',
      p_payload->>'base_notes',
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p_payload->'image_urls')), '{}'),
      (p_payload->>'stock_qty')::int,
      (p_payload->>'sort_order')::int,
      (p_payload->>'active')::boolean
    )
    returning id into v_scent_id;
  else
    update public.products
      set name = p_payload->>'name',
          base_price = (p_payload->>'price_paise')::int
      where id = (select product_id from public.scents where id = p_id);

    update public.scents
      set slug = p_payload->>'slug',
          name = p_payload->>'name',
          tagline = p_payload->>'tagline',
          description = p_payload->>'description',
          top_notes = p_payload->>'top_notes',
          heart_notes = p_payload->>'heart_notes',
          base_notes = p_payload->>'base_notes',
          image_urls = coalesce((select array_agg(value::text) from jsonb_array_elements_text(p_payload->'image_urls')), '{}'),
          stock_qty = (p_payload->>'stock_qty')::int,
          sort_order = (p_payload->>'sort_order')::int,
          active = (p_payload->>'active')::boolean
      where id = p_id;

    v_scent_id := p_id;
  end if;

  return v_scent_id;
end;
$$;

revoke all on function public.admin_upsert_product(uuid, jsonb) from public;
grant execute on function public.admin_upsert_product(uuid, jsonb) to authenticated;
