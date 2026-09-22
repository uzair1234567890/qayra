import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  base_price_rupees: z.coerce.number().int().positive(),
  status: z.enum(['draft', 'active', 'archived']),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success)
    return ctx.redirect(`/admin/products?error=${encodeURIComponent('Invalid input')}`, 303);
  const { id, name, description, base_price_rupees, status } = parsed.data;
  const { error } = await supabaseAdmin
    .from('products')
    .update({
      name,
      description: description ?? null,
      base_price: base_price_rupees * 100,
      status,
    })
    .eq('id', id);
  if (error) return ctx.redirect(`/admin/products/${id}?error=${encodeURIComponent('Save failed')}`, 303);
  return ctx.redirect(`/admin/products/${id}?info=Saved`, 303);
};
