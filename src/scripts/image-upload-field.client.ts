// Coordinates one or more <ImageUploadField> instances on a page.
// Writes a single hidden <input name="image_urls"> with a JSON-encoded
// string[] — single-mode fields come first, then multi-mode fields.

import { resizeImage } from './image-resize.client';

interface Tile {
  url: string;
  path?: string;
}

const MAX_BYTES = 4 * 1024 * 1024;
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
  form.querySelectorAll<HTMLElement>('[data-image-field-mode="single"]').forEach((field) => {
    for (const t of readField(field)) all.push(t.url);
  });
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
  });
}

function initImageUploadFields(): void {
  document.querySelectorAll<HTMLElement>('.image-upload-field').forEach((el) => {
    if (el.dataset.imageFieldBound) return;
    el.dataset.imageFieldBound = '';
    bindField(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageUploadFields);
} else {
  initImageUploadFields();
}
