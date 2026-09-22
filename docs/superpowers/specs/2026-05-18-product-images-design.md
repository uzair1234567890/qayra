# Product image upload & PDP slideshow — design

**Date:** 2026-05-18
**Status:** Draft, awaiting review

## Problem

Today the admin form for scents and bundles has a single textarea where the admin pastes "image URLs, one per line." The admin has to host the images elsewhere. The public PDP (`/scent/[slug]`, `/bundles/[slug]`) renders a gradient placeholder regardless of whether image URLs were saved — uploaded URLs never appear to customers.

## Goal

Two things, in one feature:

1. **Admin upload UX.** Both admin forms (scent + bundle) get an "upload main photo" field and an "upload additional photos" field. Files upload to Supabase Storage on file pick; URLs accumulate in the form's hidden field; save just persists URLs.
2. **PDP slideshow.** The gradient placeholder on the public product page is replaced with a real image slideshow: mobile swipe + dots, desktop thumbnails + arrows, lazy-loaded, accessibility-aware, with a graceful fallback when no images exist.

## Non-goals

- No image transformations (crop, filter) on upload beyond resize + WebP.
- No CDN, no signed URLs, no separate image-service.
- No drag-to-reorder in the admin UI (admin can remove + re-upload to reorder).
- No autoplay carousel.
- No orphan cleanup job (rare at admin-only scale; can be added later).
- No multi-admin edit locking (existing last-write-wins behavior preserved).

## User-facing behavior

**Admin form (scent or bundle):**
- The "Image URLs (one per line)" textarea is replaced by two upload fields:
  - **Main photo.** Single file. Renders a 140px drop/click tile. After upload, the tile becomes a preview with no remove button (you replace it by picking a new file).
  - **Additional photos.** Multi-file, capped at 5. Renders a grid of thumbnails with a `+` tile to add more and a `×` on each thumbnail to remove. Empty/disabled slots fill the row so the layout stays steady.
- On file pick, each file uploads immediately. The thumbnail tile shows a spinner during processing.
- On thumbnail × click, the image is deleted from Storage and the URL is removed from the form's hidden state.
- On form submit, the hidden `image_urls` field (a JSON-encoded array — index 0 = main, 1..5 = additional) is posted to the existing `scent-create` / `scent-update` / `bundle-create` / `bundle-update` endpoints. Those endpoints parse JSON instead of splitting by newlines (one-line change each).

**Public PDP:**
- `images.length === 0`: existing gradient placeholder, unchanged. Site stays unbroken before admin uploads.
- `images.length === 1`: one `<img>`, no controls.
- `images.length > 1`:
  - **Mobile (< 768px):** horizontal scroll-snap strip with dot indicators below. Tap a dot to scroll to that slide.
  - **Desktop (≥ 768px):** main image with thumbnail strip below. Click a thumb or use arrow keys to switch. Arrow buttons overlay the main image.

## Architecture

### Storage

- **Bucket** `catalog-images`, public read.
- **Path layout:**
  - `scents/{nanoid12}.webp`
  - `bundles/{nanoid12}.webp`
- **RLS policies (in a migration):**
  - `SELECT`: allow anyone (anonymous).
  - `INSERT` / `UPDATE` / `DELETE`: allow only when `app_current_role() = 'admin'` (matches the project's existing pattern for admin-write tables).
- **Reads**: via Supabase's public URL endpoint (`/storage/v1/object/public/...`). No signed URLs, no CDN.

### Schema

`scents.image_urls text[]` already exists. No change.

`bundles.image_url text` (singular) is replaced by `bundles.image_urls text[] not null default '{}'` in a one-shot migration:

```sql
alter table public.bundles add column image_urls text[] not null default '{}';
update public.bundles set image_urls = array[image_url] where image_url is not null;
alter table public.bundles drop column image_url;
```

Call sites in `src/lib/cart.ts` (3 occurrences) are updated to read `image_urls[0]` instead of `image_url`.

### API endpoints

**`POST /api/admin/image-upload`**
- Auth: `requireRole(Astro, 'admin')`. 403 if not admin.
- Body: `multipart/form-data` with `file` (binary) + `kind` (`'scent' | 'bundle'`).
- Validation:
  - `Content-Length` ≤ 8 MB → else 413.
  - MIME must be one of `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` → else 415.
- Pipeline (sharp):
  1. `.rotate()` (apply EXIF, strip metadata).
  2. `.resize({ width: 1600, withoutEnlargement: true })`.
  3. `.webp({ quality: 82 })` → output Buffer.
- Upload to `{kind}s/{nanoid(12)}.webp` via the **service-role** Supabase client (server-side only, bypasses Storage RLS — auth is enforced upstream by `requireRole`).
- 200 returns `{ url, path }`.

**`POST /api/admin/image-delete`**
- Auth: `requireRole(Astro, 'admin')`.
- Body: JSON `{ path: string }`.
- Path must start with `scents/` or `bundles/`, no `..`. Else 400.
- Idempotent: deleting a missing path returns 200.
- Removes via service-role client.

### Image processing helper

`src/lib/admin/process-image.ts` exports `processImage(input: Buffer): Promise<Buffer>` — the sharp pipeline isolated for unit testing. The endpoint imports this; tests can exercise it without HTTP.

### Shared admin component

`src/components/admin/ImageUploadField.astro`. Props:
- `name: string` — the hidden form field name (always `image_urls` in this feature).
- `mode: 'single' | 'multi'`
- `max: number`
- `kind: 'scent' | 'bundle'`
- `initial?: string[]` — for edit pages: current URLs to render as existing thumbnails.

A scent or bundle edit page renders two instances of the component:
- `<ImageUploadField name="image_urls" mode="single" max={1} kind="scent" initial={[scent.image_urls[0]].filter(Boolean)} />`
- `<ImageUploadField name="image_urls" mode="multi" max={5} kind="scent" initial={scent.image_urls.slice(1)} />`

Both components share a small client-side coordinator (`src/scripts/image-upload-field.client.ts`) that exposes a single hidden `<input name="image_urls">` per form. Each field instance carries `data-image-field-mode="single|multi"` and `data-image-field-kind="scent|bundle"` markers. On any change (upload success, delete success), the coordinator collects all URLs from the page's image fields in order (single first, then multi) and serializes them to the hidden input as a JSON-encoded `string[]`. The submit handler in the server action does `JSON.parse(body.get('image_urls'))` (changed from `.split('\n')`).

### Slideshow component

`src/components/product/ImageSlideshow.astro`. Props:
- `images: string[]`
- `name: string` — used in alt text and the carousel `aria-label`.
- `fallback?: 'gradient' | 'none'` — defaults `'gradient'`.

Rendering:
- 0 images → `<div class="from-aubergine via-navy to-near-black aspect-square w-full bg-gradient-to-br" />` (existing markup, lifted in).
- 1 image → one `<img>`.
- 2+ images → mobile + desktop slideshow markup, behavior driven by an inline `<script>` colocated with the component. CSS handles the layout via media queries.

Accessibility:
- `role="region"`, `aria-roledescription="carousel"`, `aria-label="{name} photos"` on the wrapper.
- Each slide: `role="group"`, `aria-roledescription="slide"`, `aria-label="Photo N of M"`.
- Arrow keys + buttons + dots all hooked.
- First slide eager, rest lazy.

Touch points:
- `src/pages/scent/[slug].astro`: swap the gradient div for `<ImageSlideshow images={scent.image_urls} name={scent.name} />`.
- `src/pages/bundles/[slug].astro`: same with bundle props.

## Error handling

| Case | Behavior |
|---|---|
| File > 8 MB | Browser-side block before upload starts. Inline message: "Image must be 8 MB or smaller." |
| Unsupported MIME | Same — browser rejects first. Server validates as a safety net → 415. |
| HEIC/HEIF | Accepted on the server (sharp decodes). Stored as WebP. |
| Corrupt file | Server returns 422 `{ reason: "invalid_image" }`. UI tile turns red with a retry pill; no URL added. |
| Storage quota exceeded | Server returns 507. UI tile turns red. No orphan write. |
| Network error mid-upload | Promise rejects; UI tile turns red. The retry pill re-POSTs with the same file. |
| Admin removes a thumb then closes the tab | Delete API was already called → file already gone. No orphan. |
| Save with 0 photos | `image_urls = []`. PDP shows the gradient fallback; listings show gradient (existing `ScentCard` already handles `null` first image). |

## Testing

- **Unit (vitest):** `processImage` — given a fixture PNG buffer, asserts output is WebP, ≤ 1600px wide, EXIF stripped.
- **Unit (vitest):** the URL-encoder/decoder helpers in `ImageUploadField`'s coordinator (if any are pure).
- **E2E (Playwright):**
  - Admin signs in, navigates to `/admin/scents/<id>`, uploads a fixture PNG to the main slot, saves, visits `/scent/<slug>`, asserts an `<img>` with `src` starting with `https://*.supabase.co/storage/v1/object/public/catalog-images/scents/` is rendered.
  - Admin adds a second photo, saves, asserts the slideshow renders with 2 slides.
  - Admin removes the second photo, asserts the PDP slideshow returns to single-image mode.
  - Each test cleans up its uploaded blobs in `afterEach`.
- **No live-bucket pollution beyond test files** — fixture uploads use paths like `scents/test-{nanoid}.webp` and are deleted in test teardown.

## File changes

### New files

- `supabase/migrations/20260722000000_catalog_images_storage.sql` — bucket + RLS policies for `catalog-images`.
- `supabase/migrations/20260722000001_bundles_image_urls.sql` — schema change for bundles.
- `src/lib/admin/process-image.ts` — sharp pipeline.
- `src/pages/api/admin/image-upload.ts` — upload endpoint.
- `src/pages/api/admin/image-delete.ts` — delete endpoint.
- `src/components/admin/ImageUploadField.astro` — admin upload component (markup + colocated script).
- `src/components/product/ImageSlideshow.astro` — public slideshow component.
- Test fixture (small PNG) + Playwright spec for the upload/slideshow flow.

### Modified files

- `package.json` — add `sharp` and `nanoid` to dependencies.
- `src/pages/admin/scents/new.astro` and `.../[id].astro` — replace the image-URLs textarea with two `<ImageUploadField>` instances.
- `src/pages/admin/bundles/new.astro` and `.../[id].astro` — same.
- `src/pages/api/admin/scent-create.ts` and `scent-update.ts` — parse `image_urls` as JSON instead of newline-split.
- `src/pages/api/admin/bundle-create.ts` and `bundle-update.ts` — same.
- `src/lib/cart.ts` — three lines: read `b.image_urls?.[0]` instead of `b.image_url`.
- `src/lib/supabase/types.ts` — regenerate or hand-edit the `bundles` row type.
- `src/pages/scent/[slug].astro` — swap gradient div for `<ImageSlideshow>`.
- `src/pages/bundles/[slug].astro` — same.

## Open questions

None outstanding. Implementation plan will confirm:
- Exact path of the placeholder div in `bundles/[slug].astro`.
- Whether `sharp` requires a Vercel-specific bundling tweak (most likely yes — sharp ships native binaries; the `@astrojs/vercel` adapter handles this but a smoke test on the deployed function is worth doing in implementation).
