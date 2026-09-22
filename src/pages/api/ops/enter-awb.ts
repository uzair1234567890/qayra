import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { canTransition } from '../../../lib/ops/transitions';

const Body = z.object({
  order_id: z.string().uuid(),
  courier_name: z.string().min(1).max(80),
  awb_number: z.string().min(3).max(60),
});

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
  if (!order || !canTransition(order.status, 'shipped'))
    return new Response('invalid transition', { status: 409 });

  const { error: shipErr } = await supabaseAdmin.from('shipments').upsert(
    {
      order_id: parsed.data.order_id,
      courier_name: parsed.data.courier_name,
      awb_number: parsed.data.awb_number,
      dispatched_at: new Date().toISOString(),
    },
    { onConflict: 'order_id' },
  );
  if (shipErr) return ctx.redirect(`/ops/orders/${order.code}?error=Shipment+save+failed`, 303);

  const { error: orderErr } = await supabaseAdmin
    .from('orders')
    .update({ status: 'shipped' })
    .eq('id', parsed.data.order_id);
  if (orderErr) return ctx.redirect(`/ops/orders/${order.code}?error=Status+update+failed`, 303);

  const { error: histErr } = await supabaseAdmin.from('order_status_history').insert({
    order_id: parsed.data.order_id,
    status: 'shipped',
    actor_id: me.userId,
    note: `AWB ${parsed.data.awb_number} via ${parsed.data.courier_name}`,
  });
  if (histErr) console.error('[ops] history insert failed', histErr.message);
  return ctx.redirect(`/ops/orders/${order.code}?info=Shipped`, 303);
};
