-- Switch bundles.image_url (single text) to bundles.image_urls (text array),
-- mirroring the scents.image_urls pattern. image_urls[0] is the main photo.

begin;

alter table public.bundles
  add column image_urls text[] not null default '{}';

-- Backfill: existing image_url becomes the first array element
update public.bundles
  set image_urls = array[image_url]
  where image_url is not null and image_url <> '';

alter table public.bundles
  drop column image_url;

commit;
