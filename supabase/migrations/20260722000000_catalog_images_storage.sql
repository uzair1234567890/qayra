-- Create a public bucket for catalog (scent + bundle) images.
-- Public read; admin-only write/delete enforced by storage RLS policies.

insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

-- Public can read objects in this bucket
create policy "catalog_images_public_read"
  on storage.objects for select
  using (bucket_id = 'catalog-images');

-- Only admins can insert/update/delete objects in this bucket.
-- app_current_role() is the project's existing helper used by table RLS.
create policy "catalog_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'catalog-images' and public.app_current_role() = 'admin');

create policy "catalog_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'catalog-images' and public.app_current_role() = 'admin');

create policy "catalog_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'catalog-images' and public.app_current_role() = 'admin');
