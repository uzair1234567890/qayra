# Product image upload & PDP slideshow — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's "image URLs" textarea on scents and bundles with a real uploader backed by Supabase Storage, and replace the gradient placeholder on the public product detail page with a working slideshow.

**Architecture:** Files upload via a single `POST /api/admin/image-upload` endpoint that processes through `sharp` (resize + WebP + EXIF strip) and writes to a new public Supabase Storage bucket `catalog-images`. A shared admin component `<ImageUploadField>` handles the UI; a paired client script maintains a hidden JSON-encoded `image_urls` field that the existing server actions consume. A new `<ImageSlideshow>` Astro component replaces the public-side gradient.

**Tech Stack:** Astro 6 (SSR + Vercel adapter), Tailwind 4, Supabase JS, `sharp` (image processing), `nanoid` (path slugs), Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-05-18-product-images-design.md`

---

## File map

**New**
- `src/lib/admin/process-image.ts` — pure async `processImage(buffer): Promise<Buffer>` wrapping the sharp pipeline.
- `src/pages/api/admin/image-upload.ts` — `POST` endpoint, accepts multipart, returns `{ url, path }`.
- `src/pages/api/admin/image-delete.ts` — `POST` endpoint, accepts JSON `{ path }`, deletes from bucket.
- `src/components/admin/ImageUploadField.astro` — admin upload UI (markup + colocated `<script>`).
- `src/scripts/image-upload-field.client.ts` — page-level coordinator that aggregates per-field state into a single hidden `image_urls` input.
- `src/components/product/ImageSlideshow.astro` — public slideshow.
- `supabase/migrations/20260722000000_catalog_images_storage.sql` — bucket + RLS.
- `supabase/migrations/20260722000001_bundles_image_urls.sql` — bundles schema migration.
- `tests/unit/process-image.test.ts` — vitest for the sharp pipeline.
- `tests/e2e/admin-image-upload.spec.ts` — Playwright for the full flow.
- `tests/fixtures/test-image.png` — small test PNG used in e2e and unit tests.

**Modified**
- `package.json` — add `sharp`, `nanoid`.
- `src/lib/cart.ts` — read `bundle.image_urls[0]` instead of `bundle.image_url`.
- `src/lib/seo/jsonld.ts` — same.
- `src/lib/admin/bundles.ts` — interface change.
- `src/lib/supabase/types.ts` — regenerate or hand-edit.
- `src/pages/admin/scents/new.astro` and `[id].astro` — replace textarea with `<ImageUploadField>`.
- `src/pages/admin/bundles/new.astro` and `[id].astro` — same, plus remove single image_url input.
- `src/pages/api/admin/scent-create.ts` and `scent-update.ts` — parse `image_urls` as JSON.
- `src/pages/api/admin/bundle-create.ts` and `bundle-update.ts` — same, plus drop `image_url` schema field.
- `src/pages/scent/[slug].astro` — swap gradient div for `<ImageSlideshow>`.
- `src/pages/bundles/[slug].astro` — same.
- `src/layouts/AdminLayout.astro` — add `<script src="../scripts/image-upload-field.client.ts">`.

---

## Task 1: Add dependencies

**Files:**
- Modify: `D:\qayra.in\package.json`

- [ ] **Step 1: Install sharp and nanoid**

Run:
```powershell
cd D:\qayra.in
npm install sharp nanoid
```

Expected: `npm install` completes, both packages appear in `package.json` dependencies.

- [ ] **Step 2: Verify imports resolve**

Run:
```powershell
node -e "require('sharp'); require('nanoid'); console.log('OK')"
```

Expected output: `OK`. (Sharp prints nothing on success; if it fails the OS-specific binary didn't install.)

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json
git commit -m "build: add sharp and nanoid for image processing"
```

---

## Task 2: Image processing helper (TDD)

**Files:**
- Create: `src/lib/admin/process-image.ts`
- Create: `tests/unit/process-image.test.ts`
- Create: `tests/fixtures/test-image.png` (16x16 PNG, any content)

- [ ] **Step 1: Add the fixture PNG**

Generate a minimal 16x16 red PNG into the fixtures folder:

```powershell
cd D:\qayra.in
mkdir -Force tests\fixtures | Out-Null
node -e "const sharp=require('sharp');sharp({create:{width:16,height:16,channels:3,background:{r:255,g:0,b:0}}}).png().toFile('tests/fixtures/test-image.png').then(()=>console.log('OK'))"
```

Expected output: `OK`. A `test-image.png` exists at `tests/fixtures/`.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/process-image.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { processImage } from '../../src/lib/admin/process-image';

describe('processImage', () => {
  it('outputs WebP', async () => {
    const input = await readFile(resolve('tests/fixtures/test-image.png'));
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
  });

  it('does not upscale a small image', async () => {
    const input = await readFile(resolve('tests/fixtures/test-image.png'));
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(16);
  });

  it('resizes a large image to 1600px max width', async () => {
    const big = await sharp({
      create: { width: 4000, height: 4000, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const out = await processImage(big);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1600);
  });

  it('rejects a non-image buffer', async () => {
    await expect(processImage(Buffer.from('not an image'))).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run:
```powershell
npm run test:unit -- process-image
```

Expected: FAIL with `Cannot find module '../../src/lib/admin/process-image'`.

- [ ] **Step 4: Implement `src/lib/admin/process-image.ts`**

```ts
import sharp from 'sharp';

/**
 * Process an uploaded image buffer:
 *   - rotate() applies EXIF orientation and strips it
 *   - resize to max 1600px wide (no upscaling)
 *   - encode as WebP @ quality 82
 */
export async function processImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run:
```powershell
npm run test:unit -- process-image
```

Expected: 4/4 PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/admin/process-image.ts tests/unit/process-image.test.ts tests/fixtures/test-image.png
git commit -m "feat(admin): add sharp image-processing helper with unit tests"
```

---

## Task 3: Storage bucket migration

**Files:**
- Create: `supabase/migrations/20260722000000_catalog_images_storage.sql`

- [ ] **Step 1: Create the migration**

```sql
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
```

- [ ] **Step 2: Tell the user how to apply**

The user will apply this via Supabase Dashboard → SQL Editor (CLI not installed locally). Print these instructions to the terminal for them:

```
1. Open Supabase Dashboard → SQL Editor.
2. Paste the contents of supabase/migrations/20260722000000_catalog_images_storage.sql
3. Run.
4. Verify: navigate to Storage → check that bucket "catalog-images" exists and is marked Public.
```

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/20260722000000_catalog_images_storage.sql
git commit -m "chore(db): migration to create catalog-images storage bucket with rls"
```

---

## Task 4: Bundles schema migration

**Files:**
- Create: `supabase/migrations/20260722000001_bundles_image_urls.sql`

- [ ] **Step 1: Create the migration**

```sql
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
```

- [ ] **Step 2: Tell the user how to apply**

Same instructions as Task 3 — paste into Supabase Dashboard SQL Editor.

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/20260722000001_bundles_image_urls.sql
git commit -m "chore(db): migration to switch bundles to image_urls array"
```

---

## Task 5: Update code touch points for bundles.image_urls

**Files:**
- Modify: `src/lib/cart.ts`
- Modify: `src/lib/seo/jsonld.ts`
- Modify: `src/lib/admin/bundles.ts`
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/pages/bundles/[slug].astro`

- [ ] **Step 1: Update `src/lib/cart.ts`**

Find line 78 (the select statement) and change `bundles(name, image_url, price)` to `bundles(name, image_urls, price)`:

```ts
      'id, cart_id, scent_id, bundle_id, quantity, scent:scents(name, stock_qty, image_urls, products(base_price)), bundle:bundles(name, image_urls, price)',
```

Then find lines ~105 and ~115:

```ts
      const b = row.bundle as { name: string; image_urls: string[] | null; price: number };
```

```ts
        image_url: b.image_urls?.[0] ?? null,
```

The `CartLine` type (line ~14 with `image_url: string | null`) stays as-is — it represents the flattened single image for cart display.

- [ ] **Step 2: Update `src/lib/seo/jsonld.ts`**

Find the bundle interface (line ~22) and the image assignment (line ~73):

```ts
  image_urls: string[];
```

```ts
    image: bundle.image_urls && bundle.image_urls.length ? bundle.image_urls : [],
```

- [ ] **Step 3: Update `src/lib/admin/bundles.ts`**

Find both occurrences of `image_url?: string | null` (lines ~23 and ~39) and replace each with `image_urls?: string[]`.

- [ ] **Step 4: Update `src/lib/supabase/types.ts`**

Find the three `bundles` block occurrences (around lines 204, 214, 224 — search for "bundles:" pattern). In each, replace `image_url: string | null` (or `image_url?: string | null`) with `image_urls: string[]` (Row) and `image_urls?: string[]` (Insert/Update).

If unsure which block is bundles vs scents, look for surrounding lines like `slug`, `price`, `status` near `image_url` — bundles has `price`, scents has `base_price`.

- [ ] **Step 5: Update `src/pages/bundles/[slug].astro`**

Change the select string (around line 17):

```ts
  .select('id, slug, name, description, price, image_urls, bundle_items(quantity, scent:scents(slug, name, image_urls, product:products(base_price)))')
```

And the image div (search for `from-champagne via-aubergine to-near-black aspect-square`):

```astro
    <div class="from-champagne via-aubergine to-near-black aspect-square bg-gradient-to-br overflow-hidden">
      {bundle.image_urls?.[0] && <img src={bundle.image_urls[0]} alt={bundle.name} class="h-full w-full object-cover" />}
    </div>
```

(The slideshow component will replace this div in Task 10 — for now we just keep it working with the array shape.)

- [ ] **Step 6: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors. If there are pre-existing errors elsewhere, ignore those.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/cart.ts src/lib/seo/jsonld.ts src/lib/admin/bundles.ts src/lib/supabase/types.ts src/pages/bundles/[slug].astro
git commit -m "refactor(bundles): read image_urls array instead of image_url"
```

---

## Task 6: image-upload API endpoint

**Files:**
- Create: `src/pages/api/admin/image-upload.ts`

- [ ] **Step 1: Implement the endpoint**

```ts
import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { processImage } from '../../../lib/admin/process-image';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const MAX_BYTES = 8 * 1024 * 1024;

export const POST: APIRoute = async (ctx) => {
  const auth = await requireRole(ctx as any, 'admin');
  if (auth instanceof Response) return auth;

  const form = await ctx.request.formData();
  const file = form.get('file');
  const kind = form.get('kind');

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'file_required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (kind !== 'scent' && kind !== 'bundle') {
    return new Response(JSON.stringify({ error: 'invalid_kind' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'too_large' }), {
      status: 413,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return new Response(JSON.stringify({ error: 'unsupported_type' }), {
      status: 415,
      headers: { 'content-type': 'application/json' },
    });
  }

  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await processImage(input);
  } catch (err) {
    console.error('[image-upload] processing failed', err);
    return new Response(JSON.stringify({ error: 'invalid_image' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  const path = `${kind}s/${nanoid(12)}.webp`;
  const { error } = await supabaseAdmin.storage
    .from('catalog-images')
    .upload(path, processed, { contentType: 'image/webp', upsert: false });

  if (error) {
    console.error('[image-upload] storage error', error);
    return new Response(JSON.stringify({ error: 'storage_failed', detail: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data: pub } = supabaseAdmin.storage.from('catalog-images').getPublicUrl(path);
  return new Response(JSON.stringify({ url: pub.publicUrl, path }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
```

- [ ] **Step 2: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors in this file.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/api/admin/image-upload.ts
git commit -m "feat(admin): add image-upload endpoint with sharp pipeline"
```

---

## Task 7: image-delete API endpoint

**Files:**
- Create: `src/pages/api/admin/image-delete.ts`

- [ ] **Step 1: Implement the endpoint**

```ts
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  // path must look like "scents/abc.webp" or "bundles/xyz.webp"
  path: z
    .string()
    .min(1)
    .max(200)
    .regex(/^(scents|bundles)\/[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png)$/),
});

export const POST: APIRoute = async (ctx) => {
  const auth = await requireRole(ctx as any, 'admin');
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_path' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { error } = await supabaseAdmin.storage
    .from('catalog-images')
    .remove([parsed.data.path]);

  if (error) {
    console.error('[image-delete] storage error', error);
    return new Response(JSON.stringify({ error: 'storage_failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
```

- [ ] **Step 2: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/api/admin/image-delete.ts
git commit -m "feat(admin): add image-delete endpoint"
```

---

## Task 8: ImageUploadField component + client coordinator

**Files:**
- Create: `src/components/admin/ImageUploadField.astro`
- Create: `src/scripts/image-upload-field.client.ts`
- Modify: `src/layouts/AdminLayout.astro`

- [ ] **Step 1: Create the Astro component**

```astro
---
interface Props {
  mode: 'single' | 'multi';
  max: number;
  kind: 'scent' | 'bundle';
  initial?: string[];
  label?: string;
  helpText?: string;
}
const {
  mode,
  max,
  kind,
  initial = [],
  label = mode === 'single' ? 'Main photo' : 'Additional photos',
  helpText = mode === 'single'
    ? 'Used on the home page, listings, cart line items.'
    : `Shown as a slideshow on the product page. Up to ${max}.`,
} = Astro.props;
---

<div
  class="image-upload-field mb-6"
  data-image-field-mode={mode}
  data-image-field-kind={kind}
  data-image-field-max={max}
>
  <label class="mb-1 block text-xs font-medium text-[#444] uppercase tracking-wider">{label}</label>
  <p class="text-xs text-[#888] mb-2">{helpText}</p>

  <div class="image-upload-grid grid gap-2" data-image-field-tiles>
    {initial.slice(0, max).map((url) => (
      <div class="image-upload-tile" data-image-field-tile data-url={url}>
        <img src={url} alt="" />
        <button type="button" class="image-upload-remove" aria-label="Remove">×</button>
      </div>
    ))}
    <label class="image-upload-add" data-image-field-add>
      <input type="file" accept="image/*" data-image-field-input class="sr-only" />
      <span class="image-upload-add-glyph">+</span>
      <span class="image-upload-add-hint">click or drop</span>
    </label>
  </div>

  <p class="text-xs text-[#999] mt-2" data-image-field-status></p>
  <p class="text-xs text-[#C44] mt-1" data-image-field-error hidden></p>
</div>

<style>
  .image-upload-grid { grid-template-columns: repeat(6, 1fr); max-width: 540px; }
  .image-upload-field[data-image-field-mode='single'] .image-upload-grid { grid-template-columns: 140px; }
  .image-upload-tile {
    position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: #FAFAF8;
  }
  .image-upload-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .image-upload-tile[data-state='loading']::after {
    content: ''; position: absolute; inset: 0;
    background: rgba(255,255,255,0.7) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' fill='none' stroke='%23333' stroke-width='2.4' stroke-linecap='round' stroke-dasharray='42 100'/></svg>") center/28px no-repeat;
    animation: iuf-spin 800ms linear infinite;
  }
  .image-upload-tile[data-state='error'] { outline: 2px solid #C44; }
  @keyframes iuf-spin { to { transform: rotate(360deg); } }
  .image-upload-remove {
    position: absolute; top: 4px; right: 4px; width: 22px; height: 22px;
    border-radius: 50%; background: rgba(0,0,0,0.7); color: #fff; border: 0;
    cursor: pointer; font-size: 13px; line-height: 1;
  }
  .image-upload-add {
    aspect-ratio: 1; border: 2px dashed #CCC; border-radius: 6px; background: #FAFAF8;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; color: #888; font-size: 11px; text-align: center; padding: 6px;
  }
  .image-upload-add-glyph { font-size: 24px; line-height: 1; }
  .image-upload-add-hint { margin-top: 4px; }
  .image-upload-field[data-image-field-full] .image-upload-add { display: none; }
</style>
```

- [ ] **Step 2: Create the client coordinator script**

```ts
// src/scripts/image-upload-field.client.ts
// Coordinates one or more <ImageUploadField> instances on a page.
// Writes a single hidden <input name="image_urls"> with a JSON-encoded
// string[] — single-mode fields come first, then multi-mode fields.

interface Tile {
  url: string;
  path?: string;
}

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|heic|heif)$/;

function findHiddenInput(form: HTMLFormElement): HTMLInputElement {
  let input = form.querySelector<HTMLInputElement>('input[name="image_urls"][type="hidden"]');
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'image_urls';
    form.appendChild(input);
  }
  return input;
}

function readField(field: HTMLElement): Tile[] {
  const tiles: Tile[] = [];
  field.querySelectorAll<HTMLElement>('[data-image-field-tile]').forEach((el) => {
    const url = el.dataset.url;
    if (url) tiles.push({ url, path: el.dataset.path });
  });
  return tiles;
}

function writeHidden(form: HTMLFormElement): void {
  const all: string[] = [];
  // single fields first
  form.querySelectorAll<HTMLElement>('[data-image-field-mode="single"]').forEach((field) => {
    for (const t of readField(field)) all.push(t.url);
  });
  // then multi fields
  form.querySelectorAll<HTMLElement>('[data-image-field-mode="multi"]').forEach((field) => {
    for (const t of readField(field)) all.push(t.url);
  });
  const hidden = findHiddenInput(form);
  hidden.value = JSON.stringify(all);
}

function updateFullState(field: HTMLElement): void {
  const max = Number(field.dataset.imageFieldMax ?? '1');
  const count = field.querySelectorAll('[data-image-field-tile]').length;
  if (count >= max) field.setAttribute('data-image-field-full', '');
  else field.removeAttribute('data-image-field-full');
}

function setStatus(field: HTMLElement, text: string): void {
  const el = field.querySelector<HTMLElement>('[data-image-field-status]');
  if (el) el.textContent = text;
}

function setError(field: HTMLElement, msg: string | null): void {
  const el = field.querySelector<HTMLElement>('[data-image-field-error]');
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

function tileEl(url: string, path: string | undefined): HTMLElement {
  const tile = document.createElement('div');
  tile.className = 'image-upload-tile';
  tile.dataset.imageFieldTile = '';
  tile.dataset.url = url;
  if (path) tile.dataset.path = path;
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'image-upload-remove';
  btn.textContent = '×';
  btn.setAttribute('aria-label', 'Remove');
  tile.append(img, btn);
  return tile;
}

function loadingTile(): HTMLElement {
  const tile = document.createElement('div');
  tile.className = 'image-upload-tile';
  tile.dataset.imageFieldTile = '';
  tile.dataset.state = 'loading';
  return tile;
}

async function uploadFile(file: File, kind: string): Promise<{ url: string; path: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind);
  const r = await fetch('/api/admin/image-upload', { method: 'POST', body: fd });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

async function deleteByPath(path: string): Promise<void> {
  await fetch('/api/admin/image-delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

function bindField(field: HTMLElement): void {
  const mode = field.dataset.imageFieldMode as 'single' | 'multi';
  const max = Number(field.dataset.imageFieldMax ?? '1');
  const kind = field.dataset.imageFieldKind as 'scent' | 'bundle';
  const tilesEl = field.querySelector<HTMLElement>('[data-image-field-tiles]')!;
  const addLabel = field.querySelector<HTMLElement>('[data-image-field-add]')!;
  const input = field.querySelector<HTMLInputElement>('[data-image-field-input]')!;
  const form = field.closest('form') as HTMLFormElement | null;
  if (!form) return;

  updateFullState(field);
  writeHidden(form);

  // remove button per tile (delegated)
  tilesEl.addEventListener('click', async (e) => {
    const target = e.target as Element;
    if (!target.classList.contains('image-upload-remove')) return;
    const tile = target.closest<HTMLElement>('[data-image-field-tile]');
    if (!tile) return;
    const path = tile.dataset.path;
    tile.remove();
    if (path) deleteByPath(path).catch(() => {});
    updateFullState(field);
    writeHidden(form);
    setError(field, null);
  });

  input.addEventListener('change', async () => {
    setError(field, null);
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;
    const remaining = max - field.querySelectorAll('[data-image-field-tile]').length;
    const accepted = files.slice(0, remaining);

    for (const file of accepted) {
      if (file.size > MAX_BYTES) {
        setError(field, `${file.name} is over 8 MB.`);
        continue;
      }
      if (!ALLOWED_MIME.test(file.type)) {
        setError(field, `${file.name} is not a supported image type.`);
        continue;
      }

      // For single mode, replace any existing tile
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
      setStatus(field, 'Uploading…');

      try {
        const { url, path } = await uploadFile(file, kind);
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
  });
}

function init(): void {
  document.querySelectorAll<HTMLElement>('.image-upload-field').forEach((el) => {
    if (el.dataset.imageFieldBound) return;
    el.dataset.imageFieldBound = '';
    bindField(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 3: Wire the script into `AdminLayout.astro`**

Open `src/layouts/AdminLayout.astro`. Find the existing `<script src="../scripts/button-loading.client.ts"></script>` near `</body>` and add right below it:

```astro
    <script src="../scripts/image-upload-field.client.ts"></script>
```

- [ ] **Step 4: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```powershell
git add src/components/admin/ImageUploadField.astro src/scripts/image-upload-field.client.ts src/layouts/AdminLayout.astro
git commit -m "feat(admin): add ImageUploadField component and coordinator"
```

---

## Task 9: Wire ImageUploadField into scent forms

**Files:**
- Modify: `src/pages/admin/scents/new.astro`
- Modify: `src/pages/admin/scents/[id].astro`
- Modify: `src/pages/api/admin/scent-create.ts`
- Modify: `src/pages/api/admin/scent-update.ts`

- [ ] **Step 1: Update `src/pages/admin/scents/new.astro`**

Add an import at the top of the frontmatter:

```astro
import ImageUploadField from '../../../components/admin/ImageUploadField.astro';
```

Replace the existing image-urls block:

```astro
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Image URLs (one per line)</label>
      <textarea name="image_urls" rows="3" placeholder="https://..." class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono"></textarea>
    </div>
```

With two `<ImageUploadField>` instances:

```astro
    <ImageUploadField mode="single" max={1} kind="scent" />
    <ImageUploadField mode="multi"  max={5} kind="scent" />
```

- [ ] **Step 2: Update `src/pages/admin/scents/[id].astro`**

Same import. Replace the same block:

```astro
    <div>
      <label class="mb-1 block text-xs font-medium text-[#444]">Image URLs (one per line)</label>
      <textarea name="image_urls" rows="3" placeholder="https://..." class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm font-mono">{(scent.image_urls ?? []).join('\n')}</textarea>
    </div>
```

With:

```astro
    <ImageUploadField mode="single" max={1} kind="scent" initial={(scent.image_urls ?? []).slice(0, 1)} />
    <ImageUploadField mode="multi"  max={5} kind="scent" initial={(scent.image_urls ?? []).slice(1, 6)} />
```

- [ ] **Step 3: Update `src/pages/api/admin/scent-create.ts`**

Change the `image_urls` parsing. Replace:

```ts
  const { image_urls, ...rest } = parsed.data;
  const urls = (image_urls ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
```

With:

```ts
  const { image_urls, ...rest } = parsed.data;
  let urls: string[] = [];
  try {
    const arr = JSON.parse(image_urls ?? '[]');
    if (Array.isArray(arr)) urls = arr.filter((s): s is string => typeof s === 'string' && !!s);
  } catch {
    return ctx.redirect(`/admin/scents/new?error=${encodeURIComponent('Invalid image data')}`, 303);
  }
```

- [ ] **Step 4: Update `src/pages/api/admin/scent-update.ts`**

Replace the same parsing block with the JSON.parse version. The redirect URL on error should be:

```ts
    return ctx.redirect(`/admin/scents/${parsed.data.id}?error=${encodeURIComponent('Invalid image data')}`, 303);
```

- [ ] **Step 5: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/admin/scents/ src/pages/api/admin/scent-create.ts src/pages/api/admin/scent-update.ts
git commit -m "feat(admin): switch scent forms to ImageUploadField"
```

---

## Task 10: Wire ImageUploadField into bundle forms

**Files:**
- Modify: `src/pages/admin/bundles/new.astro`
- Modify: `src/pages/admin/bundles/[id].astro`
- Modify: `src/pages/api/admin/bundle-create.ts`
- Modify: `src/pages/api/admin/bundle-update.ts`

- [ ] **Step 1: Update `src/pages/admin/bundles/new.astro`**

Add the import:

```astro
import ImageUploadField from '../../../components/admin/ImageUploadField.astro';
```

Find the existing `image_url` input (around line 24):

```astro
      <input name="image_url" type="url" class="w-full rounded border border-[#DDDDD8] px-3 py-2 text-sm" /></div>
```

Replace the entire surrounding `<div>` (label + input) with:

```astro
    <ImageUploadField mode="single" max={1} kind="bundle" />
    <ImageUploadField mode="multi"  max={5} kind="bundle" />
```

- [ ] **Step 2: Update `src/pages/admin/bundles/[id].astro`**

Same import. Replace the existing image_url input block with:

```astro
    <ImageUploadField mode="single" max={1} kind="bundle" initial={(bundle.image_urls ?? []).slice(0, 1)} />
    <ImageUploadField mode="multi"  max={5} kind="bundle" initial={(bundle.image_urls ?? []).slice(1, 6)} />
```

- [ ] **Step 3: Update `src/pages/api/admin/bundle-create.ts`**

Two changes. First, remove `image_url` from the zod schema and add `image_urls`:

```ts
const BundleBase = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  price_rupees: z.coerce.number().int().positive(),
  image_urls: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
});
```

Second, replace the destructure and `createBundle` call:

```ts
  const { price_rupees, image_urls, ...rest } = parsed.data;
  let urls: string[] = [];
  try {
    const arr = JSON.parse(image_urls ?? '[]');
    if (Array.isArray(arr)) urls = arr.filter((s): s is string => typeof s === 'string' && !!s);
  } catch {
    return ctx.redirect(`/admin/bundles/new?error=${encodeURIComponent('Invalid image data')}`, 303);
  }
  const items = parseItems(form, entries);
  try {
    await createBundle(
      { ...rest, price: price_rupees * 100, image_urls: urls },
      items,
    );
  } catch (err) {
    console.error('[admin/bundle-create]', err);
    return ctx.redirect(`/admin/bundles/new?error=${encodeURIComponent('Create failed')}`, 303);
  }
  return ctx.redirect('/admin/bundles', 303);
```

- [ ] **Step 4: Update `src/pages/api/admin/bundle-update.ts`**

Same zod-schema substitution. Replace the destructure and `updateBundle` call:

```ts
  const { id, price_rupees, image_urls, ...rest } = parsed.data;
  let urls: string[] = [];
  try {
    const arr = JSON.parse(image_urls ?? '[]');
    if (Array.isArray(arr)) urls = arr.filter((s): s is string => typeof s === 'string' && !!s);
  } catch {
    return ctx.redirect(`/admin/bundles/${id}?error=${encodeURIComponent('Invalid image data')}`, 303);
  }
  const items = parseItems(form, entries);
  try {
    await updateBundle(
      id,
      { ...rest, price: price_rupees * 100, image_urls: urls },
      items,
    );
  } catch (err) {
    console.error('[admin/bundle-update]', err);
    return ctx.redirect(`/admin/bundles/${id}?error=${encodeURIComponent('Update failed')}`, 303);
  }
  return ctx.redirect(`/admin/bundles/${id}?info=Saved`, 303);
```

- [ ] **Step 5: Update `src/lib/admin/bundles.ts`**

Open the file. In both the `createBundle` and `updateBundle` function bodies, find where the row is built/passed to Supabase. Replace any `image_url: bundle.image_url ?? null` with `image_urls: bundle.image_urls ?? []`. The function parameter types were already updated in Task 5; this step updates the body.

If `image_url` is referenced inside the function body anywhere, change it to `image_urls`.

- [ ] **Step 6: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/admin/bundles/ src/pages/api/admin/bundle-create.ts src/pages/api/admin/bundle-update.ts src/lib/admin/bundles.ts
git commit -m "feat(admin): switch bundle forms to ImageUploadField"
```

---

## Task 11: ImageSlideshow component

**Files:**
- Create: `src/components/product/ImageSlideshow.astro`

- [ ] **Step 1: Implement the component**

```astro
---
interface Props {
  images: string[];
  name: string;
}
const { images, name } = Astro.props;
const count = images.length;
---

{count === 0 && (
  <div class="from-aubergine via-navy to-near-black aspect-square w-full bg-gradient-to-br"></div>
)}

{count === 1 && (
  <div class="aspect-square w-full overflow-hidden bg-black">
    <img src={images[0]} alt={`${name} photo`} class="h-full w-full object-cover" loading="eager" />
  </div>
)}

{count > 1 && (
  <section
    class="image-slideshow"
    role="region"
    aria-roledescription="carousel"
    aria-label={`${name} photos`}
    data-slideshow
    data-count={count}
  >
    <div class="image-slideshow-stage">
      <div class="image-slideshow-track" data-slideshow-track>
        {images.map((src, i) => (
          <div
            class="image-slideshow-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`Photo ${i + 1} of ${count}`}
            data-slideshow-slide
            data-index={i}
          >
            <img
              src={src}
              alt={`${name} — photo ${i + 1} of ${count}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      <button class="image-slideshow-arrow image-slideshow-arrow-prev" type="button" data-slideshow-prev aria-label="Previous photo">‹</button>
      <button class="image-slideshow-arrow image-slideshow-arrow-next" type="button" data-slideshow-next aria-label="Next photo">›</button>
    </div>

    <div class="image-slideshow-thumbs" data-slideshow-thumbs aria-hidden="true">
      {images.map((src, i) => (
        <button
          class="image-slideshow-thumb"
          type="button"
          data-slideshow-thumb
          data-index={i}
          aria-label={`Show photo ${i + 1}`}
        >
          <img src={src} alt="" loading="lazy" />
        </button>
      ))}
    </div>

    <div class="image-slideshow-dots" data-slideshow-dots>
      {images.map((_, i) => (
        <button class="image-slideshow-dot" type="button" data-slideshow-dot data-index={i} aria-label={`Photo ${i + 1}`} />
      ))}
    </div>
  </section>
)}

<style>
  .image-slideshow { width: 100%; }
  .image-slideshow-stage { position: relative; aspect-ratio: 1; background: #000; overflow: hidden; }
  .image-slideshow-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; height: 100%; }
  .image-slideshow-track::-webkit-scrollbar { display: none; }
  .image-slideshow-slide { min-width: 100%; height: 100%; scroll-snap-align: center; }
  .image-slideshow-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .image-slideshow-arrow {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(255,255,255,0.85); border: 0; cursor: pointer; font-size: 18px;
    display: none;
  }
  .image-slideshow-arrow-prev { left: 12px; }
  .image-slideshow-arrow-next { right: 12px; }

  .image-slideshow-thumbs { display: none; gap: 8px; margin-top: 10px; }
  .image-slideshow-thumb { flex: 1; aspect-ratio: 1; padding: 0; border: 0; background: transparent; cursor: pointer; opacity: 0.6; }
  .image-slideshow-thumb[aria-current='true'] { opacity: 1; outline: 2px solid #1a1a1a; outline-offset: 1px; }
  .image-slideshow-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 3px; }

  .image-slideshow-dots { display: flex; justify-content: center; gap: 8px; padding: 12px 0 4px; }
  .image-slideshow-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #CCC; border: 0; padding: 0; cursor: pointer;
  }
  .image-slideshow-dot[aria-current='true'] { background: #1a1a1a; }

  @media (min-width: 768px) {
    .image-slideshow-arrow { display: block; }
    .image-slideshow-thumbs { display: flex; }
    .image-slideshow-dots { display: none; }
  }
</style>

<script>
  function init(): void {
    document.querySelectorAll<HTMLElement>('[data-slideshow]').forEach((root) => {
      if (root.dataset.bound) return;
      root.dataset.bound = '';
      const count = Number(root.dataset.count ?? '0');
      const track = root.querySelector<HTMLElement>('[data-slideshow-track]')!;
      const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slideshow-slide]'));
      const thumbs = Array.from(root.querySelectorAll<HTMLElement>('[data-slideshow-thumb]'));
      const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-slideshow-dot]'));
      const prev = root.querySelector<HTMLElement>('[data-slideshow-prev]')!;
      const next = root.querySelector<HTMLElement>('[data-slideshow-next]')!;
      let current = 0;

      const setCurrent = (i: number): void => {
        current = Math.max(0, Math.min(count - 1, i));
        thumbs.forEach((t, idx) => {
          if (idx === current) t.setAttribute('aria-current', 'true');
          else t.removeAttribute('aria-current');
        });
        dots.forEach((d, idx) => {
          if (idx === current) d.setAttribute('aria-current', 'true');
          else d.removeAttribute('aria-current');
        });
      };

      const goTo = (i: number): void => {
        const target = slides[Math.max(0, Math.min(count - 1, i))];
        if (target) target.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      };

      thumbs.forEach((t, i) => t.addEventListener('click', () => goTo(i)));
      dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
      prev.addEventListener('click', () => goTo(current - 1));
      next.addEventListener('click', () => goTo(current + 1));

      root.tabIndex = 0;
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
      });

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              const idx = Number((entry.target as HTMLElement).dataset.index ?? '0');
              setCurrent(idx);
            }
          }
        },
        { root: track, threshold: [0.6] },
      );
      slides.forEach((s) => io.observe(s));

      setCurrent(0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
</script>
```

- [ ] **Step 2: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```powershell
git add src/components/product/ImageSlideshow.astro
git commit -m "feat(product): add ImageSlideshow component for PDP"
```

---

## Task 12: Wire ImageSlideshow into PDPs

**Files:**
- Modify: `src/pages/scent/[slug].astro`
- Modify: `src/pages/bundles/[slug].astro`

- [ ] **Step 1: Update scent PDP**

Open `src/pages/scent/[slug].astro`. Add the import in the frontmatter near the other component imports:

```astro
import ImageSlideshow from '../../components/product/ImageSlideshow.astro';
```

Find the gradient placeholder div:

```astro
    <div class="mx-auto max-w-3xl">
      <div class="from-aubergine via-navy to-near-black aspect-square w-full bg-gradient-to-br">
      </div>
    </div>
```

Replace with:

```astro
    <div class="mx-auto max-w-3xl">
      <ImageSlideshow images={scent.image_urls ?? []} name={scent.name} />
    </div>
```

- [ ] **Step 2: Update bundle PDP**

Open `src/pages/bundles/[slug].astro`. Add the same import.

Find the gradient placeholder div (was updated in Task 5):

```astro
    <div class="from-champagne via-aubergine to-near-black aspect-square bg-gradient-to-br overflow-hidden">
      {bundle.image_urls?.[0] && <img src={bundle.image_urls[0]} alt={bundle.name} class="h-full w-full object-cover" />}
    </div>
```

Replace with:

```astro
    <ImageSlideshow images={bundle.image_urls ?? []} name={bundle.name} />
```

(The grid container around it stays — the slideshow takes the left column.)

- [ ] **Step 3: Type-check**

Run:
```powershell
npx astro check
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```powershell
git add src/pages/scent/[slug].astro src/pages/bundles/[slug].astro
git commit -m "feat(product): render ImageSlideshow on scent and bundle PDPs"
```

---

## Task 13: Playwright e2e (admin upload + slideshow render)

**Files:**
- Create: `tests/e2e/admin-image-upload.spec.ts`

This test is gated behind a real Supabase Storage bucket. **Skip this test gracefully** if the bucket doesn't exist yet — the admin should have applied Migration 3 before running it.

- [ ] **Step 1: Find an existing admin-login helper or sign-in flow**

Run:
```powershell
Get-ChildItem D:\qayra.in\tests\helpers
```

Read the contents of any login helper that's there to understand how admin sessions are established in the e2e suite. Use that pattern in the spec below.

- [ ] **Step 2: Write the e2e spec**

```ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE = resolve('tests/fixtures/test-image.png');

test.describe('admin image upload', () => {
  test.skip(
    !process.env.PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Supabase env not configured',
  );

  test('admin uploads a main photo, saves, slideshow renders on PDP', async ({ page }) => {
    // Helper: replace with the project's existing admin-sign-in pattern.
    // If there is no admin helper, point this test at an existing admin account
    // and adapt the sign-in flow here.
    await page.goto('/auth/sign-in');
    // … project-specific admin login …

    // Navigate to the new-scent form (or any existing scent's edit page)
    await page.goto('/admin/scents');
    const editLink = page.getByRole('link', { name: /azeziya|edit/i }).first();
    if (!(await editLink.count())) test.skip(true, 'no scent to edit');
    await editLink.click();

    // Upload a main photo via the hidden file input inside the single-mode field
    const singleInput = page
      .locator('[data-image-field-mode="single"] input[type="file"]')
      .first();
    await singleInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: readFileSync(FIXTURE),
    });

    // Wait for the tile to appear (upload completed)
    await expect(
      page.locator('[data-image-field-mode="single"] [data-image-field-tile] img'),
    ).toBeVisible({ timeout: 15_000 });

    // Save the form
    const submit = page.locator('form button[type="submit"]').first();
    await submit.click();

    // After redirect/save, scroll the scent's slug from the URL
    await page.waitForURL(/\/admin\/scents/);

    // Visit the public PDP. (We assume the scent slug from URL or known fixture.)
    // Adapt this to navigate to whatever scent slug was edited.
    await page.goto('/scent/azeziya');
    const slideshowImg = page.locator('[data-slideshow] img, img[alt*="photo"]').first();
    await expect(slideshowImg).toBeVisible();
    const src = await slideshowImg.getAttribute('src');
    expect(src).toMatch(/catalog-images\/scents\//);
  });
});
```

Note: this test is more of a smoke test against a live environment than a sealed unit. If you don't have an admin login helper, adapt the sign-in section.

- [ ] **Step 3: Run the test**

Run:
```powershell
npx playwright test --project=chromium tests/e2e/admin-image-upload.spec.ts
```

Expected: PASS (or SKIPPED if env not configured). If FAIL because the bucket doesn't exist, ensure Migration 3 was applied first.

- [ ] **Step 4: Commit**

```powershell
git add tests/e2e/admin-image-upload.spec.ts
git commit -m "test(e2e): cover admin image upload and PDP slideshow"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run all unit tests**

Run:
```powershell
npm run test:unit
```

Expected: all pass (existing + new `process-image` tests).

- [ ] **Step 2: Run the chromium e2e suite**

Run:
```powershell
npx playwright test --project=chromium
```

Expected: all pass. If `admin-image-upload` skips, that's OK — note that the bucket/admin login may not be set up.

- [ ] **Step 3: Manual smoke walk**

Run `npm run dev` and:

1. Sign in as admin → `/admin/scents` → edit a scent → upload a main photo → save → visit the public scent page → confirm the slideshow shows the image.
2. Repeat with multiple additional photos → confirm the slideshow has dots/thumbs and you can navigate.
3. Upload a >8 MB file → confirm the inline error appears and no request is sent to the server.
4. Upload an `.exe` (rename to fool the file picker if needed) → confirm the inline error appears.
5. Remove a thumbnail → confirm the corresponding bucket file gets deleted (check the Supabase Storage dashboard).
6. Save a form with 0 photos → confirm the PDP shows the gradient fallback unbroken.

- [ ] **Step 4: Final commit (only if anything was fixed during verification)**

```powershell
git status
# if clean, no commit needed
```

---

## Self-review notes

- **Spec coverage:** Section 1 (admin UX) → Tasks 8, 9, 10. Section 2 (storage + RLS) → Task 3. Section 3 (upload/delete endpoints) → Tasks 6, 7. Section 4 (bundles schema) → Tasks 4, 5. Section 5 (`<ImageUploadField>`) → Task 8. Section 6 (slideshow) → Tasks 11, 12. Section 7 (error handling) → covered in the endpoint code + the coordinator script. Section 8 (testing) → Tasks 2 (unit), 13 (e2e), 14 (manual).
- **Migrations apply manually** since Supabase CLI isn't installed locally — Tasks 3 and 4 print copy-paste instructions for the dashboard SQL editor.
- **Vercel + sharp:** `@astrojs/vercel` bundles native modules into the serverless function. If the function deploy fails after this lands, check Vercel logs for "Cannot find module 'sharp'" — fix is to add `sharp` to `external` in `astro.config.mjs` or use the official Vercel sharp layer. Not addressed proactively because most deploys just work.
- **Orphan files:** Removing a thumbnail before save triggers a delete API call. If the upload succeeded but the form was abandoned without remove + without save, that file becomes an orphan. Acceptable at admin-only scale; documented in the spec.
