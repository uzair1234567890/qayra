import type { APIRoute } from 'astro';
import { CheckoutInput, buildPendingOrder } from '../../../lib/checkout';
import { createRzpOrder } from '../../../lib/razorpay';
import { serviceClient } from '../../../lib/supabase/service';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const body = CheckoutInput.safeParse(raw);
  if (!body.success)
    return new Response(JSON.stringify({ error: body.error.issues }), { status: 400 });
  if (body.data.payment_method !== 'prepaid')
    return new Response('only prepaid orders are accepted', { status: 400 });

  try {
    const { orderId, code, totals } = await buildPendingOrder(
      request,
      cookies,
      locals.cartToken,
      body.data,
    );
    const rzp = await createRzpOrder({ amountPaise: totals.total, receipt: code });

    const svc = serviceClient();
    await svc.from('orders').update({ razorpay_order_id: rzp.id }).eq('id', orderId);

    return new Response(
      JSON.stringify({
        rzp_order_id: rzp.id,
        amount: totals.total,
        code,
        contact: { email: body.data.email, phone: body.data.phone, name: body.data.name },
      }),
      { status: 200 },
    );
  } catch (err) {
    console.error('create-order', err);
    return new Response(JSON.stringify({ error: 'Order creation failed' }), { status: 500 });
  }
};
