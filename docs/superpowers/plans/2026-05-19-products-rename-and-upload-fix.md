# Products rename + upload fix — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eradicate the word "scent" from every user-visible surface (URLs, headings, sidebar, breadcrumbs, alt text), add a Price field on the admin form backed by an atomic Postgres RPC that auto-creates the parent product row, and fix the Vercel 413 by resizing photos client-side before upload + dropping the server cap to 4 MB.

**Architecture:** URL renames + 301 redirects keep bookmarks working without renaming the underlying `scents` DB table. A new `admin_upsert_product` RPC handles both create and update in a single transaction (parent product + scent), so the server action collapses to one call. A new `image-resize.client.ts` helper canvas-resizes photos > 2000 px or > 3 MB to JPEG @ q0.85 before POSTing; HEIC files are skipped (browser can't decode) and rely on the 4 MB server cap with a friendly error.

**Tech Stack:** Astro 6 (SSR + Vercel adapter), Tailwind 4, Supabase JS + PostgreSQL RPCs, browser Canvas API, Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-05-19-products-rename-and-upload-fix-design.md`

---

## File map

### New

- `supabase/migrations/20260722000002_admin_upsert_product.sql` — Postgres function for atomic create/update.
- `src/scripts/image-resize.client.ts` — canvas resize helper.
- `src/pages/products/index.astro` — catalog listing (move from `src/pages/scents/index.astro`).
- `src/pages/product/[slug].astro` — PDP (move from `src/pages/scent/[slug].astro`).
- `src/pages/admin/products/index.astro` — admin product list (replaces old parent-list page).
- `src/pages/admin/products/new.astro` — admin new-product form (move from `src/pages/admin/scents/new.astro`).
- `src/pages/admin/products/[id].astro` — admin edit form (move from `src/pages/admin/scents/[id].astro`).
- `src/components/product/ProductCard.astro` — rename of `ScentCard.astro`.
- `src/components/product/ProductSwitcher.astro` — rename of `ScentSwitcher.astro`.
- `src/components/product/ProductNotes.astro` — rename of `ScentNotes.astro`.
- `tests/unit/image-resize.test.ts` — vitest for the resize helper.
- `tests/e2e/products-rename.spec.ts` — Playwright for the full flow.

### Modified

- `src/middleware.ts` — add 301 redirect table at the top.
- `src/components/admin/AdminSidebar.astro` — remove old `/admin/products` (parent-table) and `/admin/scents` items; keep the renamed `/admin/products` entry.
- `src/pages/api/admin/scent-create.ts` — call the new RPC; add `price_rupees` to schema.
- `src/pages/api/admin/scent-update.ts` — same.
- `src/pages/api/admin/image-upload.ts` — `MAX_BYTES` 8 MB → 4 MB.
- `src/scripts/image-upload-field.client.ts` — call `resizeImage()` before POST; show "Resizing…" status.
- `src/lib/admin/scents.ts` — add a helper that fetches scent + parent product price together (used by the edit page).
- Any callsite that imports `ScentCard.astro` / `ScentSwitcher.astro` / `ScentNotes.astro` — updated to new names.

### Deleted

- `src/pages/scents/index.astro`
- `src/pages/scent/[slug].astro`
- `src/pages/admin/scents/index.astro`
- `src/pages/admin/scents/new.astro`
- `src/pages/admin/scents/[id].astro`
- `src/pages/admin/products/[id].astro` (the OLD parent-edit page; the new one above takes its place)
- `src/components/product/ScentCard.astro`
- `src/components/product/ScentSwitcher.astro`
- `src/components/product/ScentNotes.astro`

---

## Task 1: Postgres RPC migration

**Files:**
- Create: `supabase/migrations/20260722000002_admin_upsert_product.sql`

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Print apply instructions for the user**

The user applies via Supabase Dashboard SQL Editor (CLI not installed locally). Print to the terminal:

```
1. Open Supabase Dashboard → SQL Editor.
2. Paste the contents of supabase/migrations/20260722000002_admin_upsert_product.sql
3. Run. Function should appear under Database → Functions as admin_upsert_product.
```

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/20260722000002_admin_upsert_product.sql
git commit -m "chore(db): add admin_upsert_product rpc"
```

---

## Task 2: Client-side image-resize helper (TDD)

**Files:**
- Create: `src/scripts/image-resize.client.ts`
- Create: `tests/unit/image-resize.test.ts`

- [ ] **Step 1: Add happy-dom dev dep for canvas testing**

happy-dom is lighter than jsdom and supports canvas mocking. Run:

```powershell
cd D:\qayra.in
npm install -D happy-dom
```

Expected: appears in `package.json` devDependencies.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/image-resize.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { resizeImage } from '../../src/scripts/image-resize.client';

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('resizeImage', () => {
  it('returns the original for small JPEGs under 3 MB', async () => {
    const small = makeFile('small.jpg', 'image/jpeg', 500_000);
    const out = await resizeImage(small);
    expect(out).toBe(small);
  });

  it('returns the original for HEIC regardless of size', async () => {
    const heic = makeFile('big.heic', 'image/heic', 5_000_000);
    const out = await resizeImage(heic);
    expect(out).toBe(heic);
  });

  it('returns the original when canvas decode fails', async () => {
    // happy-dom does not implement HTMLImageElement loading from blob URLs,
    // so canvas decode will fail and we fall back to original.
    const big = makeFile('big.jpg', 'image/jpeg', 4_000_000);
    const out = await resizeImage(big);
    expect(out).toBe(big);
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

```powershell
cd D:\qayra.in
npm run test:unit -- image-resize
```

Expected: FAIL with `Cannot find module '../../src/scripts/image-resize.client'`.

- [ ] **Step 4: Implement `src/scripts/image-resize.client.ts`**

```ts
const MAX_WIDTH = 2000;
const SKIP_RESIZE_BYTES = 3 * 1024 * 1024;
const HEIC_TYPES = /^image\/(heic|heif)$/;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode_failed'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImage(file: File): Promise<File> {
  if (HEIC_TYPES.test(file.type)) return file;
  if (file.size <= SKIP_RESIZE_BYTES) {
    // Still need to check width for very tall thin images; do a quick probe.
    try {
      const img = await loadImage(file);
      if (img.width <= MAX_WIDTH) return file;
    } catch {
      return file;
    }
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const ratio = Math.min(1, MAX_WIDTH / img.width);
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) return file;

  const stem = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${stem}-resized.jpg`, { type: 'image/jpeg' });
}
```

- [ ] **Step 5: Run the test, verify it passes**

```powershell
npm run test:unit -- image-resize
```

Expected: 3/3 PASS. (happy-dom can't actually decode an image, so the canvas paths fall back to original — that's what the tests verify.)

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/scripts/image-resize.client.ts tests/unit/image-resize.test.ts
git commit -m "feat(admin): add client-side image-resize helper"
```

---

## Task 3: Wire resize into the upload coordinator

**Files:**
- Modify: `src/scripts/image-upload-field.client.ts`

- [ ] **Step 1: Add the import + invoke resizeImage before upload**

Open `src/scripts/image-upload-field.client.ts`. Add this import at the top, just below the existing comment block:

```ts
import { resizeImage } from './image-resize.client';
```

Then find the `input.addEventListener('change', async () => { ... })` block. Inside the `for (const file of accepted)` loop, **just before** the `if (mode === 'single')` line, insert a resize step. The relevant region currently is:

```ts
    for (const file of accepted) {
      if (file.size > MAX_BYTES) {
        setError(field, `${file.name} is over 8 MB.`);
        continue;
      }
      if (!ALLOWED_MIME.test(file.type)) {
        setError(field, `${file.name} is not a supported image type.`);
        continue;
      }

      if (mode === 'single') {
```

Change the `MAX_BYTES` constant at the top from `8 * 1024 * 1024` to `4 * 1024 * 1024`, and update the error string from `over 8 MB` to `over 4 MB`. Then add a `Resizing…` status + `resizeImage` call between the validation and the existing flow:

```ts
    for (const file of accepted) {
      if (file.size > MAX_BYTES) {
        setError(field, `${file.name} is over 4 MB.`);
        continue;
      }
      if (!ALLOWED_MIME.test(file.type)) {
        setError(field, `${file.name} is not a supported image type.`);
        continue;
      }

      if (mode === 'single') {
        field.querySelectorAll<HTMLElement>('[data-image-field-tile]').forEach((t) => {
          const p = t.dataset.path;
          t.remove();
          if (p) deleteByPath(p).catch(() => {});
        });
      }

      const loading = loadingTile();
      tilesEl.insertBefore(loading, addLabel);
      updateFullState(field);
      setStatus(field, 'Resizing…');

      let toUpload: File;
      try {
        toUpload = await resizeImage(file);
      } catch {
        toUpload = file;
      }

      // Post-resize check: even after resize, > 4 MB means abort (HEIC mostly).
      if (toUpload.size > MAX_BYTES) {
        loading.dataset.state = 'error';
        setError(
          field,
          `${file.name} is too large even after resize — please export to JPEG first.`,
        );
        setStatus(field, '');
        setTimeout(() => loading.remove(), 2500);
        updateFullState(field);
        continue;
      }

      setStatus(field, 'Uploading…');
      try {
        const { url, path } = await uploadFile(toUpload, kind);
        const real = tileEl(url, path);
        tilesEl.replaceChild(real, loading);
        writeHidden(form);
        setStatus(field, '');
      } catch (err) {
        loading.dataset.state = 'error';
        setError(field, `Upload failed: ${(err as Error).message}`);
        setStatus(field, '');
        setTimeout(() => loading.remove(), 2500);
      } finally {
        updateFullState(field);
      }
    }
```

The key changes:
- `MAX_BYTES = 4 * 1024 * 1024` at the top of the file.
- "over 8 MB" → "over 4 MB" in the error message.
- The existing `[Removing the old single-mode `field.querySelectorAll...`]` block stays in place — only the part after it changes.
- Insert the `Resizing…` status, `resizeImage()` call, and post-resize size check before the upload.

- [ ] **Step 2: Type-check**

```powershell
cd D:\qayra.in
npx astro check
```

Expected: zero new errors in `src/scripts/image-upload-field.client.ts`.

- [ ] **Step 3: Commit**

```powershell
git add src/scripts/image-upload-field.client.ts
git commit -m "feat(admin): client-side resize before upload + 4 MB cap"
```

---

## Task 4: Drop server upload cap to 4 MB

**Files:**
- Modify: `src/pages/api/admin/image-upload.ts`

- [ ] **Step 1: Change MAX_BYTES**

Open `src/pages/api/admin/image-upload.ts`. Find:

```ts
const MAX_BYTES = 8 * 1024 * 1024;
```

Change to:

```ts
const MAX_BYTES = 4 * 1024 * 1024;
```

That's the only change in this file.

- [ ] **Step 2: Commit**

```powershell
git add src/pages/api/admin/image-upload.ts
git commit -m "fix(admin): drop server upload cap to 4 mb for vercel"
```

---

## Task 5: Add price field + RPC call to scent-create endpoint

**Files:**
- Modify: `src/pages/api/admin/scent-create.ts`

- [ ] **Step 1: Replace the file content**

The existing file uses a direct `createScent` insert and requires `product_id`. Replace with an RPC-backed version that auto-creates the parent.

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  top_notes: z.string().max(500).optional().nullable(),
  heart_notes: z.string().max(500).optional().nullable(),
  base_notes: z.string().max(500).optional().nullable(),
  image_urls: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0),
  sort_order: z.coerce.number().int().min(0),
  active: z.preprocess((v) => v === 'true', z.boolean()),
  price_rupees: z.coerce.number().int().positive(),
});

export const POST: APIRoute = async (ctx) => {
  const auth = await requireRole(ctx as any, 'admin');
  if (auth instanceof Response) return auth;
  const form = Object.fromEntries(await ctx.request.formData());
  const parsed = Body.safeParse(form);
  if (!parsed.success) {
    return ctx.redirect(`/admin/products/new?error=${encodeURIComponent('Invalid input')}`, 303);
  }

  let urls: string[] = [];
  try {
    const arr = JSON.parse(parsed.data.image_urls ?? '[]');
    if (Array.isArray(arr)) urls = arr.filter((s): s is string => typeof s === 'string' && !!s);
  } catch {
    return ctx.redirect(`/admin/products/new?error=${encodeURIComponent('Invalid image data')}`, 303);
  }

  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    tagline: parsed.data.tagline ?? null,
    description: parsed.data.description ?? null,
    top_notes: parsed.data.top_notes ?? null,
    heart_notes: parsed.data.heart_notes ?? null,
    base_notes: parsed.data.base_notes ?? null,
    image_urls: urls,
    stock_qty: parsed.data.stock_qty,
    sort_order: parsed.data.sort_order,
    active: parsed.data.active,
    price_paise: parsed.data.price_rupees * 100,
  };

  const { error } = await supabaseAdmin.rpc('admin_upsert_product', {
    p_id: null,
    p_payload: payload,
  });

  if (error) {
    console.error('[admin/scent-create]', error);
    const msg = error.code === '23505' ? 'Slug already exists' : 'Create failed';
    return ctx.redirect(`/admin/products/new?error=${encodeURIComponent(msg)}`, 303);
  }
  return ctx.redirect('/admin/products', 303);
};
```

- [ ] **Step 2: Type-check**

```powershell
cd D:\qayra.in
npx astro check
```

Expected: zero new errors in this file.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/api/admin/scent-create.ts
git commit -m "feat(admin): switch product-create to rpc with price field"
```

---

## Task 6: Add price field + RPC call to scent-update endpoint

**Files:**
- Modify: `src/pages/api/admin/scent-update.ts`

- [ ] **Step 1: Replace the file content**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  top_notes: z.string().max(500).optional().nullable(),
  heart_notes: z.string().max(500).optional().nullable(),
  base_notes: z.string().max(500).optional().nullable(),
  image_urls: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0),
  sort_order: z.coerce.number().int().min(0),
  active: z.preprocess((v) => v === 'true', z.boolean()),
  price_rupees: z.coerce.number().int().positive(),
});

export const POST: APIRoute = async (ctx) => {
  const auth = await requireRole(ctx as any, 'admin');
  if (auth instanceof Response) return auth;
  const form = Object.fromEntries(await ctx.request.formData());
  const parsed = Body.safeParse(form);
  if (!parsed.success) {
    return ctx.redirect(`/admin/products?error=${encodeURIComponent('Invalid input')}`, 303);
  }

  let urls: string[] = [];
  try {
    const arr = JSON.parse(parsed.data.image_urls ?? '[]');
    if (Array.isArray(arr)) urls = arr.filter((s): s is string => typeof s === 'string' && !!s);
  } catch {
    return ctx.redirect(`/admin/products/${parsed.data.id}?error=${encodeURIComponent('Invalid image data')}`, 303);
  }

  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    tagline: parsed.data.tagline ?? null,
    description: parsed.data.description ?? null,
    top_notes: parsed.data.top_notes ?? null,
    heart_notes: parsed.data.heart_notes ?? null,
    base_notes: parsed.data.base_notes ?? null,
    image_urls: urls,
    stock_qty: parsed.data.stock_qty,
    sort_order: parsed.data.sort_order,
    active: parsed.data.active,
    price_paise: parsed.data.price_rupees * 100,
  };

  const { error } = await supabaseAdmin.rpc('admin_upsert_product', {
    p_id: parsed.data.id,
    p_payload: payload,
  });

  if (error) {
    console.error('[admin/scent-update]', error);
    return ctx.redirect(`/admin/products/${parsed.data.id}?error=${encodeURIComponent('Update failed')}`, 303);
  }
  return ctx.redirect(`/admin/products/${parsed.data.id}?info=Saved`, 303);
};
```

- [ ] **Step 2: Type-check + commit**

```powershell
cd D:\qayra.in
npx astro check
git add src/pages/api/admin/scent-update.ts
git commit -m "feat(admin): switch product-update to rpc with price field"
```

---

## Task 7: Helper for joined scent + parent-product fetch

**Files:**
- Modify: `src/lib/admin/scents.ts`

- [ ] **Step 1: Add `getProductForEdit` helper**

Open `src/lib/admin/scents.ts`. After the existing `getScent` function, add:

```ts
export async function getProductForEdit(id: string) {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('*, product:products(id, base_price)')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}
```

This returns the scent row plus the parent product's id and base_price. Used by the admin edit page to populate the Price field.

- [ ] **Step 2: Type-check + commit**

```powershell
cd D:\qayra.in
npx astro check
git add src/lib/admin/scents.ts
git commit -m "feat(admin): add getProductForEdit helper that joins parent price"
```

---

## Task 8: Move admin list page + remove old parent-products pages

**Files:**
- Create: `src/pages/admin/products/index.astro` (overwrites old parent-list page)
- Delete: `src/pages/admin/products/[id].astro` (old parent-edit page)
- Delete: `src/pages/admin/scents/index.astro`

- [ ] **Step 1: Read the old scents list page**

```powershell
Get-Content D:\qayra.in\src\pages\admin\scents\index.astro
```

Note the imports, layout title, table columns, and any helper imports. You'll port it over.

- [ ] **Step 2: Overwrite `src/pages/admin/products/index.astro` with the new list**

```astro
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import DataTable from '../../../components/admin/DataTable.astro';
import StatusPill from '../../../components/admin/StatusPill.astro';
import EmptyState from '../../../components/admin/EmptyState.astro';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { formatINR } from '../../../lib/format';

const result = await requireRole(Astro as any, 'admin');
if (result instanceof Response) return result;

const { data: items } = await supabaseAdmin
  .from('scents')
  .select('id, name, slug, active, stock_qty, sort_order, product:products(base_price)')
  .order('sort_order')
  .order('name');
const products = (items ?? []).map((s) => ({
  id: s.id,
  name: s.name,
  slug: s.slug,
  active: s.active,
  stock_qty: s.stock_qty,
  price: (s.product as { base_price: number } | null)?.base_price ?? 0,
}));
---

<AdminLayout title="Products">
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-sm text-[#666]">{products.length} product{products.length !== 1 ? 's' : ''}</h2>
    <a href="/admin/products/new" class="rounded bg-[#1A1A1A] px-3 py-1.5 text-xs text-white">New product</a>
  </div>
  {products.length === 0 ? (
    <EmptyState message="No products yet." />
  ) : (
    <DataTable columns={['Name', 'Status', 'Price', 'Stock', '']}>
      {products.map((p) => (
        <tr class="border-t border-[#F4F4F4] hover:bg-[#FAFAF8]">
          <td class="px-3 py-2">{p.name}</td>
          <td class="px-3 py-2"><StatusPill value={p.active ? 'active' : 'inactive'} /></td>
          <td class="px-3 py-2 font-mono text-xs">{formatINR(p.price)}</td>
          <td class="px-3 py-2 font-mono text-xs">{p.stock_qty}</td>
          <td class="px-3 py-2 text-right">
            <a href={`/admin/products/${p.id}`} class="text-xs text-[#0066CC]">Edit</a>
          </td>
        </tr>
      ))}
    </DataTable>
  )}
</AdminLayout>
```

- [ ] **Step 3: Delete the old files**

```powershell
Remove-Item D:\qayra.in\src\pages\admin\scents\index.astro
Remove-Item D:\qayra.in\src\pages\admin\products\[id].astro
```

Note: the second `Remove-Item` deletes the old parent-product edit page. The new edit page for scents goes here in a later task.

- [ ] **Step 4: Type-check**

```powershell
cd D:\qayra.in
npx astro check
```

Expected: zero new errors. There may be transient errors about missing `/admin/products/[id]` route — these resolve when Task 9 lands the new edit page.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/admin/products/index.astro
git rm src/pages/admin/scents/index.astro src/pages/admin/products/[id].astro
git commit -m "refactor(admin): move scent list to /admin/products and drop old parent-product pages"
```

---

## Task 9: Move admin new + edit forms to /admin/products

**Files:**
- Create: `src/pages/admin/products/new.astro`
- Create: `src/pages/admin/products/[id].astro`
- Delete: `src/pages/admin/scents/new.astro`
- Delete: `src/pages/admin/scents/[id].astro`

- [ ] **Step 1: Create `src/pages/admin/products/new.astro`**

```astro
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import ImageUploadField from '../../../components/admin/ImageUploadField.astro';
import { requireRole } from '../../../lib/auth/session';

const result = await requireRole(Astro as any, 'admin');
if (result instanceof Response) return result;
const error = Astro.url.searchParams.get('error');
---

<AdminLayout title="New product">
  {error && <p class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-[#C44]">{error}</p>}
  <form action="/api/admin/scent-create" method="post" class="max-w-lg space-y-4">
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Name</label>
      <input name="name" required class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Slug</label>
      <input name="slug" required pattern="[a-z0-9-]+" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Price (₹)</label>
      <input name="price_rupees" type="number" required min="1" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Tagline</label>
      <input name="tagline" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Description</label>
      <textarea name="description" rows="3" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm"></textarea>
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Top notes</label>
        <input name="top_notes" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Heart notes</label>
        <input name="heart_notes" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Base notes</label>
        <input name="base_notes" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
      </div>
    </div>
    <ImageUploadField mode="single" max={1} kind="scent" />
    <ImageUploadField mode="multi" max={5} kind="scent" />
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Stock qty</label>
        <input name="stock_qty" type="number" required min="0" value="0" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Sort order</label>
        <input name="sort_order" type="number" required min="0" value="0" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
      </div>
    </div>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="active" value="true" checked /> Active
    </label>
    <button type="submit" class="rounded bg-[#1A1A1A] px-5 py-2 text-sm text-white">Create product</button>
  </form>
</AdminLayout>
```

- [ ] **Step 2: Create `src/pages/admin/products/[id].astro`**

```astro
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import ImageUploadField from '../../../components/admin/ImageUploadField.astro';
import { requireRole } from '../../../lib/auth/session';
import { getProductForEdit } from '../../../lib/admin/scents';

const result = await requireRole(Astro as any, 'admin');
if (result instanceof Response) return result;
const product = await getProductForEdit(Astro.params.id!);
if (!product) return Astro.redirect('/admin/products', 302);
const parent = product.product as { id: string; base_price: number } | null;
const priceRupees = Math.round((parent?.base_price ?? 0) / 100);
const info = Astro.url.searchParams.get('info');
const error = Astro.url.searchParams.get('error');
---

<AdminLayout title={`Edit: ${product.name}`}>
  {info && <p class="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-[#0A8A00]">{info}</p>}
  {error && <p class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-[#C44]">{error}</p>}
  <form action="/api/admin/scent-update" method="post" class="max-w-lg space-y-4">
    <input type="hidden" name="id" value={product.id} />
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Name</label>
      <input name="name" required value={product.name} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Slug</label>
      <input name="slug" required pattern="[a-z0-9-]+" value={product.slug} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Price (₹)</label>
      <input name="price_rupees" type="number" required min="1" value={priceRupees} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Tagline</label>
      <input name="tagline" value={product.tagline ?? ''} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Description</label>
      <textarea name="description" rows="3" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm">{product.description ?? ''}</textarea>
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Top notes</label>
        <input name="top_notes" value={product.top_notes ?? ''} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Heart notes</label>
        <input name="heart_notes" value={product.heart_notes ?? ''} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Base notes</label>
        <input name="base_notes" value={product.base_notes ?? ''} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" />
      </div>
    </div>
    <ImageUploadField mode="single" max={1} kind="scent" initial={(product.image_urls ?? []).slice(0, 1)} />
    <ImageUploadField mode="multi" max={5} kind="scent" initial={(product.image_urls ?? []).slice(1, 6)} />
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Stock qty</label>
        <input name="stock_qty" type="number" required min="0" value={product.stock_qty} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[#444]">Sort order</label>
        <input name="sort_order" type="number" required min="0" value={product.sort_order} class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono" />
      </div>
    </div>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="active" value="true" checked={product.active} /> Active
    </label>
    <button type="submit" class="rounded bg-[#1A1A1A] px-5 py-2 text-sm text-white">Save changes</button>
  </form>
</AdminLayout>
```

- [ ] **Step 3: Delete the old scent admin pages**

```powershell
Remove-Item D:\qayra.in\src\pages\admin\scents\new.astro
Remove-Item D:\qayra.in\src\pages\admin\scents\[id].astro
Remove-Item D:\qayra.in\src\pages\admin\scents -Recurse -Force
```

(The final command removes the now-empty directory.)

- [ ] **Step 4: Type-check**

```powershell
cd D:\qayra.in
npx astro check
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/admin/products/new.astro src/pages/admin/products/[id].astro
git rm -r src/pages/admin/scents
git commit -m "refactor(admin): move product forms to /admin/products"
```

---

## Task 10: Update sidebar

**Files:**
- Modify: `src/components/admin/AdminSidebar.astro`

- [ ] **Step 1: Remove the duplicate "Scents" item**

Open `src/components/admin/AdminSidebar.astro`. Find the `Sell` items array:

```ts
  { title: 'Sell', items: [
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/scents', label: 'Scents' },
    { href: '/admin/bundles', label: 'Bundles' },
    { href: '/admin/inventory', label: 'Inventory' },
  ]},
```

Delete the `Scents` line. Result:

```ts
  { title: 'Sell', items: [
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/bundles', label: 'Bundles' },
    { href: '/admin/inventory', label: 'Inventory' },
  ]},
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/admin/AdminSidebar.astro
git commit -m "refactor(admin): remove duplicate scents sidebar entry"
```

---

## Task 11: Rename and move public scent pages

**Files:**
- Create: `src/pages/products/index.astro`
- Create: `src/pages/product/[slug].astro`
- Delete: `src/pages/scents/index.astro`
- Delete: `src/pages/scent/[slug].astro`

- [ ] **Step 1: Move the listing page**

```powershell
cd D:\qayra.in
git mv src/pages/scents/index.astro src/pages/products/index.astro
```

- [ ] **Step 2: Update strings inside `src/pages/products/index.astro`**

Find these strings in the file and update:
- Page title `<PublicLayout title="All scents">` → `<PublicLayout title="All products">`.
- The `<p class="text-navy/60 mb-3 ...">qayra</p>` lead-in stays.
- The `<h1>The collection</h1>` heading stays.
- The body sentence `Four scents. Each composed for a moment...` → `Hand-blended in small batches in Bengaluru. Each composed for a moment.` (drops "scents" wording).
- If the file imports `ScentCard` from `../../components/product/ScentCard.astro`, leave it for now — Task 12 renames it.

- [ ] **Step 3: Move the PDP**

```powershell
git mv src/pages/scent/[slug].astro src/pages/product/[slug].astro
```

- [ ] **Step 4: Update strings + breadcrumbs inside `src/pages/product/[slug].astro`**

Find:

```astro
  <BreadcrumbJsonLd
    crumbs={[
      { name: 'Home', url: `${Astro.site}` },
      { name: 'Scents', url: `${Astro.site}scents` },
      { name: scent.name, url: `${Astro.site}scent/${scent.slug}` },
    ]}
  />
```

Replace with:

```astro
  <BreadcrumbJsonLd
    crumbs={[
      { name: 'Home', url: `${Astro.site}` },
      { name: 'Products', url: `${Astro.site}products` },
      { name: scent.name, url: `${Astro.site}product/${scent.slug}` },
    ]}
  />
```

Find the visible breadcrumb link:

```astro
      <a href="/scents" class="hover:text-navy">Scents</a> · {scent.name}
```

Replace with:

```astro
      <a href="/products" class="hover:text-navy">Products</a> · {scent.name}
```

(The local variable name `scent` stays — it's an internal identifier. Templates that displayed it untouched.)

- [ ] **Step 5: Remove the now-empty directories**

```powershell
Remove-Item D:\qayra.in\src\pages\scents -Recurse -Force
Remove-Item D:\qayra.in\src\pages\scent -Recurse -Force
```

- [ ] **Step 6: Type-check**

```powershell
cd D:\qayra.in
npx astro check
```

Expected: zero new errors. Any pre-existing hints unrelated to this work are fine.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/products src/pages/product
git rm -r src/pages/scents src/pages/scent
git commit -m "refactor(public): move scent pages to /products and /product"
```

---

## Task 12: Rename component files

**Files:**
- Rename: `src/components/product/ScentCard.astro` → `ProductCard.astro`
- Rename: `src/components/product/ScentSwitcher.astro` → `ProductSwitcher.astro`
- Rename: `src/components/product/ScentNotes.astro` → `ProductNotes.astro`
- Modify: callers

- [ ] **Step 1: Rename the files**

```powershell
cd D:\qayra.in
git mv src/components/product/ScentCard.astro src/components/product/ProductCard.astro
git mv src/components/product/ScentSwitcher.astro src/components/product/ProductSwitcher.astro
git mv src/components/product/ScentNotes.astro src/components/product/ProductNotes.astro
```

- [ ] **Step 2: Find callers**

```powershell
Select-String -Path D:\qayra.in\src -Pattern "ScentCard|ScentSwitcher|ScentNotes" -Recurse | Select-Object Path, LineNumber
```

Note each file and line.

- [ ] **Step 3: Update each caller**

For every line found in step 2, replace:
- `ScentCard` → `ProductCard`
- `ScentSwitcher` → `ProductSwitcher`
- `ScentNotes` → `ProductNotes`

Both in import statements and in JSX tag names within the same file.

- [ ] **Step 4: Type-check**

```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```powershell
git add src/components/product src/pages
git commit -m "refactor: rename Scent-prefixed components to Product"
```

---

## Task 13: Add 301 redirects in middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add the redirect table + handler at the top**

Open `src/middleware.ts`. After the imports and the `CART_COOKIE` constant, add:

```ts
const EXACT_REDIRECTS: Record<string, string> = {
  '/scents': '/products',
  '/admin/scents': '/admin/products',
};

const PREFIX_REDIRECTS: Array<[string, string]> = [
  ['/scent/', '/product/'],
  ['/admin/scents/', '/admin/products/'],
];

function buildRedirect(pathname: string): string | null {
  if (EXACT_REDIRECTS[pathname]) return EXACT_REDIRECTS[pathname];
  for (const [oldPrefix, newPrefix] of PREFIX_REDIRECTS) {
    if (pathname.startsWith(oldPrefix)) {
      return newPrefix + pathname.slice(oldPrefix.length);
    }
  }
  return null;
}
```

Inside the `onRequest` handler, **before** the cart cookie issuing block, add the redirect check:

```ts
export const onRequest = defineMiddleware(async (ctx, next) => {
  // 301 redirects for renamed paths
  const redirectTo = buildRedirect(ctx.url.pathname);
  if (redirectTo) {
    const dest = redirectTo + ctx.url.search;
    return new Response(null, { status: 301, headers: { Location: dest } });
  }

  // ... existing cart cookie / auth logic
```

- [ ] **Step 2: Manual smoke (dev server)**

```powershell
cd D:\qayra.in
npm run dev
```

In a browser, hit `http://localhost:4321/scents` and confirm a 301 to `/products`. Hit `/scent/anything` and confirm a 301 to `/product/anything`. Stop dev (Ctrl+C).

- [ ] **Step 3: Commit**

```powershell
git add src/middleware.ts
git commit -m "feat: add 301 redirects from old scent paths to product paths"
```

---

## Task 14: Playwright e2e for the rename + redirect

**Files:**
- Create: `tests/e2e/products-rename.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test.describe('products rename + redirects', () => {
  test('/scents → 301 → /products', async ({ page }) => {
    const response = await page.goto('/scents', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200); // followed redirect
    expect(page.url()).toMatch(/\/products$/);
  });

  test('/scent/<slug> → 301 → /product/<slug>', async ({ page }) => {
    const response = await page.goto('/scent/azeziya', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);
    expect(page.url()).toMatch(/\/product\/azeziya$/);
  });

  test('public listing page no longer says "scent"', async ({ page }) => {
    await page.goto('/products');
    const body = (await page.locator('body').textContent()) ?? '';
    expect(body.toLowerCase()).not.toContain('scent');
  });

  test('/admin/scents → 301 → /admin/products', async ({ page }) => {
    // unauthenticated → redirect chain: /admin/scents → /admin/products → /auth/sign-in
    const response = await page.goto('/admin/scents', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain('/auth/sign-in');
    expect(page.url()).toContain('next=%2Fadmin%2Fproducts');
  });
});
```

- [ ] **Step 2: Run the test**

```powershell
cd D:\qayra.in
npx playwright test --project=chromium tests/e2e/products-rename.spec.ts
```

Expected: 4/4 pass (the third test depends on at least one active product existing — if it fails because no products exist, document the dependency and skip it for now).

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/products-rename.spec.ts
git commit -m "test(e2e): cover product rename and 301 redirects"
```

---

## Task 15: Apply RPC migration + final verification

- [ ] **Step 1: Print apply instructions for the user**

Tell the user to apply Migration `20260722000002_admin_upsert_product.sql` via the Supabase Dashboard SQL Editor (paste the contents, run). Verify under Database → Functions that `admin_upsert_product` is listed.

- [ ] **Step 2: Run unit tests**

```powershell
cd D:\qayra.in
npm run test:unit
```

Expected: all existing tests still pass plus the new `image-resize` tests pass. The RLS tests will still fail (pre-existing, no seed data — not your concern).

- [ ] **Step 3: Run the chromium e2e suite**

```powershell
npx playwright test --project=chromium
```

Expected: all pass. The `admin-image-upload` and `products-rename` tests both pass once the migration is applied and the admin has created at least one product.

- [ ] **Step 4: Manual walkthrough**

`npm run dev` and step through:
1. Sign in as admin → sidebar shows "Products" (not "Scents"). Click → list page renders.
2. Click "New product" → fill all fields including Price → upload a photo → save → returns to list. Row appears with the entered price.
3. Click "Edit" on the row → Price field shows the same value → change Price → save → list shows updated price.
4. Visit `/product/<slug>` on the public site → page renders with photos and price.
5. Visit old URL `/scent/<slug>` → 301 → `/product/<slug>` (browser address bar updates).
6. Upload a 6 MB phone photo on a fresh product → confirm the inline status shows "Resizing…" briefly, then "Uploading…", then the preview. Network panel should show a POST under 4 MB.

- [ ] **Step 5: Commit (only if anything was fixed during walkthrough)**

```powershell
git status
# if clean, no commit needed
```

---

## Self-review notes

- **Spec coverage:**
  - Naming + URL changes (Section 1 of spec) → Tasks 8, 9, 10, 11, 12, 13.
  - Price field + parent-product transaction (Section 2) → Tasks 1, 5, 6, 7, 9.
  - Upload size fix (Section 3) → Tasks 2, 3, 4.
  - File changes summary (Section 4) → covered across Tasks 8–13.
  - Edge cases (Section 5) → handled inside endpoint code (Tasks 5, 6) and resize helper (Task 2).
  - Testing strategy (Section 5) → Tasks 2 (unit), 14 (e2e), 15 (manual).
- **Migration apply is manual** — Tasks 1 and 15 print clear instructions. Subsequent tasks don't strictly require the migration applied to land in code, but the e2e and manual walkthrough do.
- **RLS test failures are pre-existing** (no seed catalog) — confirmed at the end of the prior plan; not in scope.
- **`getProductForEdit` helper** name is consistent across Tasks 7 and 9.
- **`admin_upsert_product` RPC arg names** (`p_id`, `p_payload`) are consistent across Tasks 1, 5, 6.
- **`price_rupees` form field name** is consistent across Tasks 5, 6, 9.
- **`MAX_BYTES = 4 MB`** is consistent across server (Task 4) and client (Task 3).
