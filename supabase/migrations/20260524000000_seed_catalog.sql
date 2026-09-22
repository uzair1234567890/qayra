-- seed: one product, four scents, one bundle
insert into public.products (id, slug, name, description, base_price, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'qayra-fragrance-diffuser',
  'qayra fragrance diffuser',
  'Hand-blended fragrance for the inside of your car.',
  34900,
  'active'
);

insert into public.scents (product_id, slug, name, tagline, description, top_notes, heart_notes, base_notes, stock_qty, sort_order, active) values
  ('00000000-0000-0000-0000-000000000001', 'azeziya',           'Azeziya',           'scent of stillness',  'A gentle, refined fragrance built around precious woods and a soft floral heart.', 'Bergamot, cardamom', 'Jasmine, rose absolute', 'Sandalwood, amber',  60, 1, true),
  ('00000000-0000-0000-0000-000000000001', 'velvet-midnight',   'Velvet Midnight',   'after-hours scent',   'A scent that arrives slowly. Notes of oud, sandalwood and a quiet warmth.', 'Bergamot, pink pepper', 'Iris, jasmine, leather', 'Oud, sandalwood, vanilla', 60, 2, true),
  ('00000000-0000-0000-0000-000000000001', 'blue-lotus-mist',   'Blue Lotus Mist',   'a slow exhale',       'Aquatic, calm, balanced. Built around the blue lotus accord.', 'Sea salt, mint', 'Blue lotus, lily', 'White musk, driftwood', 60, 3, true),
  ('00000000-0000-0000-0000-000000000001', 'imperial-musk',     'Imperial Musk',     'a quiet command',     'Refined musk, warm and confident without being loud.', 'Pink pepper, saffron', 'Iris, geranium', 'Musks, ambergris, vanilla', 60, 4, true);

insert into public.bundles (slug, name, description, price, status) values
  ('starter-set', 'The Starter Set', 'All four scents, ₹250 off versus buying each individually.', 99900, 'active');

insert into public.bundle_items (bundle_id, scent_id, quantity)
select b.id, s.id, 1
from public.bundles b
cross join public.scents s
where b.slug = 'starter-set'
  and s.slug in ('azeziya','velvet-midnight','blue-lotus-mist','imperial-musk');
