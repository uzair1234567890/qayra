import type { APIRoute } from 'astro';
import { env } from '../../../lib/env';
import { serviceClient } from '../../../lib/supabase/service';
import { verifyRzpWebhook } from '../../../lib/razorpay';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const sig = request.headers.get('x-razorpay-signature') ?? '';
  if (!verifyRzpWebhook(body, sig, env!.RAZORPAY_WEBHOOK_SECRET)) {
    return new Response('invalid', { status: 400 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return new Response('bad body', { status: 400 });
  }

  // Idempotency: prefer Razorpay's per-delivery event id header so non-payment
  // events also dedupe. Fall back to payment id, then to a synthetic key as last resort.
  const headerEventId = request.headers.get('x-razorpay-event-id');
  const paymentEntityId = (event.payload as Record<string, { entity: { id: string } }>)
    ?.payment?.entity?.id;
  const eventId = headerEventId ?? paymentEntityId ?? `${event.event}-${Date.now()}`;

  try {
    const svc = serviceClient();

    const { error: dedupErr } = await svc
      .from('razorpay_webhook_events')
      .insert({ id: eventId });

    if (dedupErr?.code === '23505') {
      return new Response('ok', { status: 200 });
    }

    if (event.event === 'payment.captured') {
      const payment = (
        event.payload as { payment: { entity: { order_id: string } } }
      ).payment.entity;

      // Capture the id so we can commit stock for orders the webhook finalized
      // (i.e. when the customer closed the tab before /api/checkout/verify ran).
      // The payment_status='pending' filter guarantees we only act when this
      // webhook actually transitioned the order — if /verify won the race the
      // filter returns 0 rows and verify will have committed stock itself.
      const { data: updated, error: updErr } = await svc
        .from('orders')
        .update({ status: 'paid', payment_status: 'paid' })
        .eq('razorpay_order_id', payment.order_id)
        .eq('payment_status', 'pending')
        .select('id');
      if (updErr) console.error('[razorpay webhook] order update failed', updErr.message);

      const orderId = updated?.[0]?.id;
      if (orderId) {
        const { error: stockErr } = await svc.rpc('commit_order_stock', { p_order_id: orderId });
        if (stockErr) console.error('[razorpay webhook] stock commit failed', orderId, stockErr.message);
      }
    }
  } catch (err) {
    console.error('razorpay webhook', err);
  }

  return new Response('ok', { status: 200 });
};
