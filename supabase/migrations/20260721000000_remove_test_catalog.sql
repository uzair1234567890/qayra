-- Remove seed catalog (1 product, 4 scents, 1 bundle) and everything
-- that references it. Run once; subsequent runs are a no-op because the
-- rows are gone. Safe to commit because the deletes are slug-scoped.
--
-- FK map (from initial_schema.sql):
--   scents.product_id        -> products(id)  ON DELETE CASCADE   ✓ auto
--   reviews.scent_id         -> scents(id)    ON DELETE CASCADE   ✓ auto
--   bundle_items.bundle_id   -> bundles(id)   ON DELETE CASCADE   ✓ auto
--   bundle_items.scent_id    -> scents(id)    (no cascade)        ← manual
--   cart_items.scent_id      -> scents(id)    (no cascade)        ← manual
--   cart_items.bundle_id     -> bundles(id)   (no cascade)        ← manual
--   order_items.scent_id     -> scents(id)    (no cascade)        ← manual
--   order_items.bundle_id    -> bundles(id)   (no cascade)        ← manual

begin;

-- Clear references from active/abandoned carts.
delete from public.cart_items
where scent_id in (
        select id from public.scents
        where slug in ('azeziya', 'velvet-midnight', 'blue-lotus-mist', 'imperial-musk')
      )
   or bundle_id in (
        select id from public.bundles where slug = 'starter-set'
      );

-- Clear references from any existing order line items. Note: this removes
-- the line items from historical orders but does NOT delete the orders
-- themselves. name_snapshot / price_snapshot were already lost when the
-- row goes — accept this trade-off since the user explicitly chose hard
-- delete of test data.
delete from public.order_items
where scent_id in (
        select id from public.scents
        where slug in ('azeziya', 'velvet-midnight', 'blue-lotus-mist', 'imperial-musk')
      )
   or bundle_id in (
        select id from public.bundles where slug = 'starter-set'
      );

-- Delete the bundle (cascades bundle_items via bundle_id).
delete from public.bundles where slug = 'starter-set';

-- Delete the product (cascades scents via product_id; reviews on those
-- scents cascade via scent_id).
delete from public.products where slug = 'qayra-fragrance-diffuser';

commit;
