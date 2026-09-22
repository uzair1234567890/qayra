import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  order_id: z.string().uuid(),
  note: z.string().min(1).max(500),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return ctx.redirect('/admin/orders?error=Invalid+input', 303);

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('code, status')
    .eq('id', parsed.data.order_id)
    .maybeSingle();

  if (!order) return ctx.redirect('/admin/orders?error=Order+not+found', 303);

  const { error } = await supabaseAdmin.from('order_status_history').insert({
    order_id: parsed.data.order_id,
    status: order.status,
    note: parsed.data.note,
    actor_id: result.userId,
  });
  if (error)
    return ctx.redirect(`/admin/orders/${order.code}?error=${encodeURIComponent('Note save failed')}`, 303);

  return ctx.redirect(`/admin/orders/${order.code}?info=Note+added`, 303);
};
