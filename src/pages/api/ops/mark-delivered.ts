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
  if (!order || !canTransition(order.status, 'delivered'))
    return new Response('invalid transition', { status: 409 });

  // shipments PK is order_id (no `id` column). Selecting a non-existent column
  // made every call fail with "No shipment record found" even though the row
  // was updated.
  const { data: shipRows, error: shipErr } = await supabaseAdmin
    .from('shipments')
    .update({ delivered_at: new Date().toISOString() })
    .eq('order_id', parsed.data.order_id)
    .select('order_id');
  if (shipErr) return ctx.redirect(`/ops/orders/${order.code}?error=Shipment+update+failed`, 303);
  if (!shipRows || shipRows.length === 0)
    return ctx.redirect(`/ops/orders/${order.code}?error=No+shipment+record+found`, 303);

  const { error: orderErr } = await supabaseAdmin
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', parsed.data.order_id);
  if (orderErr) return ctx.redirect(`/ops/orders/${order.code}?error=Status+update+failed`, 303);

  const { error: histErr } = await supabaseAdmin.from('order_status_history').insert({
    order_id: parsed.data.order_id,
    status: 'delivered',
    actor_id: me.userId,
  });
  if (histErr) console.error('[ops] history insert failed', histErr.message);
  return ctx.redirect(`/ops/orders/${order.code}?info=Marked+delivered`, 303);
};
