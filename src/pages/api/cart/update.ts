import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getOrCreateCart, updateQty } from '../../../lib/cart';

const Body = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().min(0).max(50),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const body = Body.safeParse(raw);
  if (!body.success) return new Response('bad request', { status: 400 });
  try {
    const cartId = await getOrCreateCart(request, cookies, locals.cartToken);
    await updateQty(request, cookies, cartId, body.data.id, body.data.quantity);
  } catch (err) {
    console.error('[cart/update]', err);
    return new Response('server error', { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
