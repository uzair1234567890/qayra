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
    const issue = parsed.error.issues[0];
    const detail = issue ? `${issue.path.join('.') || 'form'}: ${issue.message}` : 'Invalid input';
    console.error('[admin/scent-create] validation failed', parsed.error.issues);
    return ctx.redirect(`/admin/products/new?error=${encodeURIComponent(detail)}`, 303);
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
