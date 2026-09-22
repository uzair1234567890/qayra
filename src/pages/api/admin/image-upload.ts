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
const MAX_BYTES = 4 * 1024 * 1024;

export const POST: APIRoute = async (ctx) => {
  const auth = await requireRole(ctx as any, 'admin');
  if (auth instanceof Response) return auth;

  const form = await ctx.request.formData();
  const file = form.get('file');
  const kind = form.get('kind');

  if (!(file instanceof File)) {
    return json({ error: 'file_required' }, 400);
  }
  if (kind !== 'scent' && kind !== 'bundle') {
    return json({ error: 'invalid_kind' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ error: 'too_large' }, 413);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json({ error: 'unsupported_type' }, 415);
  }

  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await processImage(input);
  } catch (err) {
    console.error('[image-upload] processing failed', err);
    return json({ error: 'invalid_image' }, 422);
  }

  const path = `${kind}s/${nanoid(12)}.webp`;
  const { error } = await supabaseAdmin.storage
    .from('catalog-images')
    .upload(path, processed, { contentType: 'image/webp', upsert: false });

  if (error) {
    console.error('[image-upload] storage error', error);
    return json({ error: 'storage_failed', detail: error.message }, 500);
  }

  const { data: pub } = supabaseAdmin.storage.from('catalog-images').getPublicUrl(path);
  return json({ url: pub.publicUrl, path }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
