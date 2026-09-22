# Products rename + upload fix — design

**Date:** 2026-05-19
**Status:** Draft, awaiting review

## Problem

Two distinct issues surfaced after the image-upload feature shipped:

1. **Naming.** The site and admin panel use the word "scent" everywhere a user can see it (URLs, headings, sidebar links, breadcrumbs). The admin thinks of each item as a "product" and is confused by the dual terminology, especially with a separate `/admin/products` page that lists the parent-product table — which is empty after the catalog cleanup and has no "Add" form.
2. **Upload 413 on Vercel.** The `/api/admin/image-upload` endpoint accepts files up to 8 MB, but Vercel's serverless function payload cap is **4.5 MB**. Photos from modern phones routinely exceed this, and the request is rejected before reaching our code.

Additionally, since the parent `products` table is empty after the test-catalog cleanup, the existing new-scent form cannot save (the required `product_id` dropdown has no options).

## Goal

A single round of changes that:

- Eradicates the word "scent" from every user-visible surface (admin and public).
- Adds a **Price** field to the admin form so each product carries its own price.
- Reliably uploads phone photos without hitting Vercel's 4.5 MB cap.
- Preserves existing bookmarks and search-engine links via 301 redirects.

## Non-goals

- **No DB schema rename** of the underlying `scents` table. It stays. Renaming is a much larger migration (RLS, FKs, RPC, ~15 lib files) and adds no user-visible benefit.
- **No drag-to-reorder** of product photos. Out of scope.
- **No bulk import** of products from CSV/JSON. Out of scope.
- **No support for HEIC photos > 4 MB.** Phone-camera HEIC images that exceed 4 MB hit a clear inline error asking the admin to export as JPEG. Documented limitation.

## User-facing behavior

### Public site

- `/scents` no longer exists at that URL. `/products` is the catalog listing.
- `/scent/azeziya` no longer exists. `/product/azeziya` is the PDP.
- Page titles, breadcrumbs, headings, alt text, JSON-LD breadcrumb labels, sticky buy bar copy — all say "product" not "scent".
- Old URLs return **301 Permanent Redirect** to the new equivalent.

### Admin panel

- Sidebar's "Sell" group shows: `Orders · Products · Bundles · Inventory`. The duplicate "Scents" entry is gone. The previous "Products" entry (parent-table list) is gone.
- `/admin/products` (formerly `/admin/scents`) lists products with columns Name, Status, Base price, Actions.
- `/admin/products/new` is the form for creating a product. New required field: **Price (₹)**, integer ≥ 1.
- `/admin/products/[id]` is the edit form. Same fields including Price.
- The `product_id` parent-product dropdown is gone — the server handles the parent product creation transparently.
- Submitting the form runs a two-step DB transaction (see Architecture below).

### Upload flow

- Picking a photo runs through a client-side canvas resize **before** the POST request:
  - If width ≤ 2000 px AND file size ≤ 3 MB → upload as-is.
  - Otherwise → draw onto an offscreen canvas at width = min(image.width, 2000), preserving aspect ratio, export as JPEG @ q0.85, upload that.
  - The thumbnail tile shows "Resizing..." (brief, ~200 ms) then the regular "Uploading..." spinner.
- HEIC/HEIF: client-side resize is skipped (browser can't decode in canvas); the original is uploaded. Files over 4 MB get a clear inline error.
- Server-side `MAX_BYTES` drops from 8 MB → 4 MB to stay safely under Vercel's 4.5 MB function cap.

## Architecture

### URL moves

| Old | New |
|---|---|
| `/scents` | `/products` |
| `/scent/<slug>` | `/product/<slug>` |
| `/admin/scents` | `/admin/products` |
| `/admin/scents/new` | `/admin/products/new` |
| `/admin/scents/[id]` | `/admin/products/[id]` |

### Redirects

A small redirect table is added to `src/middleware.ts`:

```ts
const REDIRECTS: Record<string, string> = {
  '/scents': '/products',
  '/admin/scents': '/admin/products',
};
const PREFIX_REDIRECTS: Array<[string, string]> = [
  ['/scent/', '/product/'],
  ['/admin/scents/', '/admin/products/'],
];
```

On each request, the middleware checks the exact-match table first, then prefix-matches. On hit, it returns a 301 with `Location: <new path><same query string>`. The middleware short-circuits before the rest of the request handling.

### File moves

- `src/pages/scents/index.astro` → `src/pages/products/index.astro`
- `src/pages/scent/[slug].astro` → `src/pages/product/[slug].astro`
- `src/pages/admin/scents/index.astro` → `src/pages/admin/products/index.astro` (overwrites the existing parent-list page, which is deleted)
- `src/pages/admin/scents/new.astro` → `src/pages/admin/products/new.astro`
- `src/pages/admin/scents/[id].astro` → `src/pages/admin/products/[id].astro`
- `src/pages/admin/products/[id].astro` (the old parent-edit page) — deleted.

### Component renames

- `src/components/product/ScentCard.astro` → `ProductCard.astro` (callers updated).
- `src/components/product/ScentSwitcher.astro` → `ProductSwitcher.astro`.
- `src/components/product/ScentNotes.astro` → `ProductNotes.astro`.
- Other files in `src/components/product/` keep their existing names (already neutral or referenced by the product folder name).

### Internal DB table

The `scents` table stays. All library code (`getActiveScents`, `from('scents')` queries, types in `src/lib/supabase/types.ts`) keeps current names. The rename is a presentation layer change only.

### Price field + parent-product transaction

A new Postgres function is added in a migration:

```sql
create or replace function public.admin_upsert_product(
  p_id uuid,                          -- null on create
  p_payload jsonb                     -- form fields
) returns uuid                        -- the scent id
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
    -- CREATE: insert parent product first
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
    -- UPDATE
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
```

The server action calls this RPC with a JSON payload built from the form. Both inserts/updates happen in the same transaction — Postgres guarantees atomicity. RLS is sidestepped via `security definer` (the function runs with the owner's privileges), but the existing `requireRole(ctx, 'admin')` check in the API route is still the gate.

### Client-side resize

A new helper `src/scripts/image-resize.client.ts` exports:

```ts
export async function resizeImage(file: File): Promise<File>;
```

Behavior:
- If `file.size <= 3 * 1024 * 1024` AND the file's image width (probed via Image element) is ≤ 2000 px → return the original `File` unchanged.
- If the file's MIME is `image/heic` or `image/heif` → return the original (browser can't canvas-decode HEIC).
- Otherwise: draw to canvas at `min(image.width, 2000)` width, export via `canvas.toBlob({ type: 'image/jpeg', quality: 0.85 })`, wrap the blob in a new `File` named `<original-stem>-resized.jpg`, return it.

`image-upload-field.client.ts` calls `resizeImage()` between file pick and the `fetch` POST. During resize, the loading tile shows a small "Resizing…" label (sub-spinner state). The resize step is wrapped in try/catch; on failure (rare — corrupt image), it falls back to the original.

### Server config

- `MAX_BYTES` in `src/pages/api/admin/image-upload.ts` changes from `8 * 1024 * 1024` to `4 * 1024 * 1024`.
- The 413 response message stays the same (`{ error: 'too_large' }`); the client surfaces "Image must be 4 MB or smaller" when this triggers.

## Error handling

| Case | Behavior |
|---|---|
| Admin sets Price = 0 or negative | Zod rejects with inline message "Price must be a positive whole number." |
| Admin tries to save without Price | Zod rejects ("Price is required"). |
| Slug `<x>-base` already exists on `products` | RPC catches Postgres unique-constraint error; server action surfaces "Internal slug collision — try a different slug." |
| Admin edits a legacy scent that shares a parent with other scents | Update path runs `UPDATE products SET ... WHERE id = <parent>`. All scents sharing that parent get the new name + price. Acceptable; the admin can split them via re-create. |
| HEIC > 4 MB | Inline error "This HEIC photo is too large — please export to JPEG before uploading." |
| Browser canvas resize fails (extremely rare) | Falls back to uploading the original. If still > 4 MB → 413 with inline error. |
| Old URL clicked (`/scent/azeziya`, `/admin/scents`) | 301 → new URL with same query string. |
| Old URL with query string (`/scents?notice=hi`) | 301 → `/products?notice=hi`. |

## Testing

### Unit (vitest)

- `src/scripts/image-resize.client.ts` — a separate test file using `@vitest/environment-jsdom` (or `happy-dom`). Asserts:
  - 500 KB JPEG returns unchanged.
  - 4000×3000 JPEG returns a File with width ≤ 2000.
  - HEIC file returns unchanged.
- Pure helper for `parentSlug(slug)` (returns `<slug>-base`) — straight string test.

### E2E (Playwright)

- Admin signs in → `/admin/products/new` → fills name, slug, price=1500, description, uploads one photo → saves → redirected to `/admin/products` → row appears with ₹1500.
- Visit `/product/<slug>` → page renders price ₹1500 + the uploaded photo in the slideshow.
- Visit old URL `/scent/<slug>` → 301 → `/product/<slug>`.
- Visit `/scents?x=y` → 301 → `/products?x=y`.

## File changes

### New

- `supabase/migrations/20260722000002_admin_upsert_product.sql` — RPC function.
- `src/scripts/image-resize.client.ts` — canvas resize helper.
- `src/pages/products/index.astro` (moved from `src/pages/scents/index.astro`, copy-renamed).
- `src/pages/product/[slug].astro` (moved from `src/pages/scent/[slug].astro`).
- `src/pages/admin/products/index.astro` (overwrites old parent-list page).
- `src/pages/admin/products/new.astro` (moved from `src/pages/admin/scents/new.astro`).
- `src/pages/admin/products/[id].astro` (moved from `src/pages/admin/scents/[id].astro`; old parent-edit page deleted).
- `src/components/product/ProductCard.astro` (renamed from `ScentCard.astro`).
- `src/components/product/ProductSwitcher.astro` (renamed from `ScentSwitcher.astro`).
- `src/components/product/ProductNotes.astro` (renamed from `ScentNotes.astro`).
- `tests/unit/image-resize.test.ts`.
- `tests/e2e/products-rename.spec.ts`.

### Deleted

- `src/pages/scents/index.astro`
- `src/pages/scent/[slug].astro`
- `src/pages/admin/scents/index.astro`
- `src/pages/admin/scents/new.astro`
- `src/pages/admin/scents/[id].astro`
- `src/pages/admin/products/[id].astro` (the old parent-edit page).
- The old `ScentCard.astro`, `ScentSwitcher.astro`, `ScentNotes.astro`.

### Modified

- `src/middleware.ts` — add redirect table at the top.
- `src/components/admin/AdminSidebar.astro` — remove the "Scents" sidebar item; the "Products" item points to `/admin/products` (no change to that href, but a sibling row is removed).
- `src/pages/api/admin/scent-create.ts` — call the new RPC; add `price` to the zod schema.
- `src/pages/api/admin/scent-update.ts` — call the new RPC; add `price` to the zod schema; ignore the now-unused `product_id`.
- `src/pages/api/admin/image-upload.ts` — `MAX_BYTES` 8 → 4.
- `src/scripts/image-upload-field.client.ts` — call `resizeImage()` before POST; show "Resizing…" status.
- Every component template that says "scent" or "Scent" in user-visible copy — updated to "product"/"Product". List of touch points (rough):
  - `src/components/product/StickyBuyBar.astro` (kept name; label changes "Add scent to bag" → "Add to bag" if any).
  - `src/components/product/CrossSellRow.astro`.
  - `src/components/product/ReviewForm.astro`.
  - `src/components/product/ReviewList.astro`.
  - Header navigation in `src/components/layout/SiteHeader.astro`.
  - Any breadcrumb labels in `BreadcrumbJsonLd.astro` callers.
  - The 404 / 500 pages if they mention "scent."

## Open questions

None outstanding. Implementation plan will resolve:

- Whether `ScentSwitcher` is still useful as a UI when there's only one product per parent (likely will be removed entirely from the PDP).
- Whether the e2e test should also assert that the parent product's `slug` ends with `-base` (likely no — it's an internal implementation detail).
