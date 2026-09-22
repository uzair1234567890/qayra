import type { APIRoute } from 'astro';
import { z } from 'zod';
import { verifySignature } from '../../../lib/razorpay';
import { serviceClient } from '../../../lib/supabase/service';
import { emptyCartByProfileId } from '../../../lib/cart';

const Body = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const body = Body.safeParse(raw);
  if (!body.success) return new Response('bad request', { status: 400 });

  const ok = verifySignature(
    body.data.razorpay_order_id,
    body.data.razorpay_payment_id,
    body.data.razorpay_signature,
  );
  if (!ok) return new Response('invalid signature', { status: 400 });

  try {
    const svc = serviceClient();
    const { data, error } = await svc.rpc('finalize_paid_order', {
      p_rzp_order_id: body.data.razorpay_order_id,
      p_rzp_payment_id: body.data.razorpay_payment_id,
    });

    let result: { order_id: string; code: string; profile_id: string };

    if (error) {
      if (error.message.includes('order_not_found_or_already_finalized')) {
        // Race: the Razorpay webhook finalized this order before the browser
        // callback reached us. Look up the now-paid order and proceed as
        // success so the user is redirected to /checkout/success.
        const { data: row, error: lookupErr } = await svc
          .from('orders')
          .select('id, code, profile_id, payment_status')
          .eq('razorpay_order_id', body.data.razorpay_order_id)
          .maybeSingle();
        if (lookupErr || !row || row.payment_status !== 'paid') {
          return new Response('order not found', { status: 404 });
        }
        result = { order_id: row.id, code: row.code, profile_id: row.profile_id };
      } else {
        throw error;
      }
    } else {
      result = data as { order_id: string; code: string; profile_id: string };
    }

    const { error: stockErr } = await svc.rpc('commit_order_stock', { p_order_id: result.order_id });
    if (stockErr) console.error('[verify] stock commit failed', stockErr.message);

    await emptyCartByProfileId(result.profile_id);

    // finalize_paid_order preserves discount_code on the order row
    const { data: orderRow } = await svc.from('orders').select('discount_code').eq('id', result.order_id).maybeSingle();
    if (orderRow?.discount_code) {
      const { data: disc } = await svc.from('discounts').select('used_count').eq('code', orderRow.discount_code).maybeSingle();
      if (disc != null) {
        const { error: incErr } = await svc
          .from('discounts')
          .update({ used_count: (disc.used_count ?? 0) + 1 })
          .eq('code', orderRow.discount_code);
        if (incErr) console.error('[checkout] used_count increment failed', orderRow.discount_code, incErr.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, code: result.code }), { status: 200 });
  } catch (err) {
    console.error('verify', err);
    return new Response('server error', { status: 500 });
  }
};
