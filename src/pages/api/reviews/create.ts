import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { serverClient } from '../../../lib/supabase/server';

const Body = z.object({
  scent_id: z.string().uuid(),
  order_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/account?error=Invalid+review', 303);

  // Verify the order belongs to this user and is delivered
  const supabase = serverClient(ctx.request, ctx.cookies);
  const { data: orderCheck } = await supabase
    .from('orders')
    .select('id')
    .eq('id', parsed.data.order_id)
    .eq('profile_id', result.userId)
    .eq('status', 'delivered')
    .maybeSingle();
  if (!orderCheck) return ctx.redirect('/account?error=Order+not+eligible', 303);

  const { error } = await supabase.from('reviews').insert({
    scent_id: parsed.data.scent_id,
    order_id: parsed.data.order_id,
    profile_id: result.userId,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
    status: 'pending',
  });
  if (error) return ctx.redirect('/account?error=Review+submission+failed', 303);
  return ctx.redirect('/account?info=Review+submitted', 303);
};
