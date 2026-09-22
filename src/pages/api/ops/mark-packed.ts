import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { canTransition } from '../../../lib/ops/transitions';

const Body = z.object({ order_id: z.string().uuid() });

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return new Response('bad request', { status: 400 });

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status, code')
    .eq('id', parsed.data.order_id)
    .maybeSingle();
  if (!order || !canTransition(order.status, 'packed'))
    return new Response('invalid transition', { status: 409 });

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'packed' })
    .eq('id', parsed.data.order_id);
  if (error) return ctx.redirect(`/ops/orders/${order.code}?error=Mark+packed+failed`, 303);

  const { error: histErr } = await supabaseAdmin.from('order_status_history').insert({
    order_id: parsed.data.order_id,
    status: 'packed',
    actor_id: me.userId,
  });
  if (histErr) console.error('[ops] history insert failed', histErr.message);
  return ctx.redirect(`/ops/orders/${order.code}?info=Marked+packed`, 303);
};
