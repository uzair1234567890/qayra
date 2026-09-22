import type { AstroCookies } from 'astro';
import { z } from 'zod';
import { serviceClient } from './supabase/service';
import { getOrCreateCart, getCartLines, emptyCart } from './cart';
import { computeTotals } from './pricing';
import { nextOrderCode } from './order-code';
import { getSession } from './auth/session';
import { evaluateDiscount } from './discount';

export const CheckoutInput = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{10}$/),
  name: z.string().min(1).max(80).transform((s) => s.trim()),
  line1: z.string().min(1).max(200).transform((s) => s.trim()),
  line2: z.string().max(200).optional().transform((s) => s?.trim() || undefined),
  city: z.string().min(1).max(80).transform((s) => s.trim()),
  state: z.string().min(1).max(80).transform((s) => s.trim()),
  pincode: z.string().regex(/^[0-9]{6}$/),
  payment_method: z.enum(['prepaid', 'cod']),
  discount_code: z.string().max(40).optional(),
});
export type CheckoutPayload = z.infer<typeof CheckoutInput>;

export async function buildPendingOrder(
  request: Request,
  cookies: AstroCookies,
  anonToken: string,
  payload: CheckoutPayload,
) {
  const svc = serviceClient();
  const session = await getSession(request, cookies);

  let profileId = session?.userId;
  if (!profileId) {
    const password = crypto.randomUUID();
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: payload.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: payload.name },
    });

    if (created?.user) {
      profileId = created.user.id;
    } else {
      // Email already registered — look up the existing user
      const { data: existingId } = await svc.rpc('get_auth_uid_by_email', {
        p_email: payload.email,
      });
      if (!existingId)
        throw new Error(`Could not resolve account: ${createErr?.message}`);
      profileId = existingId as string;
    }
  }

  const cartId = await getOrCreateCart(request, cookies, anonToken);
  const lines = await getCartLines(request, cookies, cartId);
  if (lines.length === 0) throw new Error('Cart is empty');

  // Validate stock for scent lines
  const outOfStock = lines.filter((l) => l.scent_id && l.stock_qty !== null && l.stock_qty < l.quantity);
  if (outOfStock.length > 0) {
    throw new Error(`Out of stock: ${outOfStock.map((l) => l.name).join(', ')}`);
  }

  // Server-side discount re-validation (prevents client-side amount tampering)
  let discountPaise = 0;
  let validatedCode: string | null = null;
  if (payload.discount_code) {
    const { data: disc } = await svc.from('discounts').select('*')
      .eq('code', payload.discount_code.toUpperCase())
      .maybeSingle();
    if (disc) {
      const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
      const result = evaluateDiscount(disc, subtotal);
      if (result.ok) {
        discountPaise = result.discountPaise;
        validatedCode = result.code;
      }
    }
  }

  const totals = computeTotals({
    lines: lines.map((l) => ({ price: l.price, quantity: l.quantity })),
    paymentMethod: payload.payment_method,
    discountPaise,
  });

  const code = await nextOrderCode();

  const address_snapshot = {
    name: payload.name,
    line1: payload.line1,
    line2: payload.line2 ?? null,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    phone: payload.phone,
  };

  const { data: order, error: oerr } = await svc
    .from('orders')
    .insert({
      code,
      profile_id: profileId,
      status: 'pending',
      payment_method: payload.payment_method,
      payment_status: 'pending',
      subtotal: totals.subtotal,
      discount_total: totals.discount,
      shipping_total: totals.shipping,
      cod_surcharge: totals.codSurcharge,
      total: totals.total,
      address_snapshot,
      discount_code: validatedCode,
    })
    .select('id')
    .single();
  if (oerr || !order) throw new Error('Could not create order: ' + oerr?.message);

  const { error: itemsErr } = await svc.from('order_items').insert(
    lines.map((l) => ({
      order_id: order.id,
      scent_id: l.scent_id,
      bundle_id: l.bundle_id,
      name_snapshot: l.name,
      price_snapshot: l.price,
      quantity: l.quantity,
    })),
  );
  if (itemsErr) throw new Error('Could not create order items: ' + itemsErr.message);

  return { orderId: order.id, code, profileId, totals, discountCode: validatedCode };
}

export { emptyCart };
