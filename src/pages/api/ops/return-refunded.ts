import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  return_id: z.string().uuid(),
  refund_amount: z.coerce.number().int().min(0),
});

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/ops/returns?error=Invalid+input', 303);

  const { data: ret, error: fetchErr } = await supabaseAdmin
    .from('returns')
    .select('order_id, status')
    .eq('id', parsed.data.return_id)
    .eq('status', 'approved')
    .maybeSingle();
  if (fetchErr || !ret) return ctx.redirect('/ops/returns?error=Return+not+found', 303);

  const { error: updateErr } = await supabaseAdmin
    .from('returns')
    .update({
      status: 'refunded',
      refund_amount: parsed.data.refund_amount,
      processed_at: new Date().toISOString(),
      actor_id: me.userId,
    })
    .eq('id', parsed.data.return_id)
    .eq('status', 'approved');
  if (updateErr) return ctx.redirect('/ops/returns?error=Refund+update+failed', 303);

  const { error: orderErr } = await supabaseAdmin
    .from('orders')
    .update({ status: 'returned' })
    .eq('id', ret.order_id);
  if (orderErr) {
    console.error('[ops] return-refunded: order status update failed', orderErr.message);
    return ctx.redirect('/ops/returns?tab=approved&error=Refund+recorded+but+order+status+update+failed', 303);
  }

  return ctx.redirect('/ops/returns?tab=approved&info=Refund+marked', 303);
};
