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
    return json({ error: 'invalid_json' }, 400);
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'invalid_path' }, 400);
  }

  const { error } = await supabaseAdmin.storage
    .from('catalog-images')
    .remove([parsed.data.path]);

  if (error) {
    console.error('[image-delete] storage error', error);
    return json({ error: 'storage_failed' }, 500);
  }

  return json({ ok: true }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
