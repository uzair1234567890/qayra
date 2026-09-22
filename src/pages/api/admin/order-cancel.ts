import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { audit } from '../../../lib/admin/audit';

const Body = z.object({
  order_id: z.string().uuid(),
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

  if (!['pending', 'paid'].includes(order.status))
    return ctx.redirect(`/admin/orders/${order.code}?error=Cannot+cancel+at+this+stage`, 303);

  // payment_status is left as-is (preserves the payment audit trail; refund handled separately)
  const { error: cancelErr } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', parsed.data.order_id);
  if (cancelErr)
    return ctx.redirect(`/admin/orders/${order.code}?error=${encodeURIComponent('Cancel failed')}`, 303);

  const { error: histErr } = await supabaseAdmin.from('order_status_history').insert({
    order_id: parsed.data.order_id,
    status: 'cancelled',
    note: 'Cancelled by admin',
    actor_id: result.userId,
  });
  if (histErr) console.error('[admin] order_status_history insert failed', histErr.message);

  await audit(result.userId, 'order.cancel', { table: 'orders', id: parsed.data.order_id });

  return ctx.redirect(`/admin/orders/${order.code}?info=Order+cancelled`, 303);
};
