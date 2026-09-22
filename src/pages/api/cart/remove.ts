import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getOrCreateCart, removeLine } from '../../../lib/cart';

const Body = z.object({
  id: z.string().uuid(),
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
    await removeLine(request, cookies, cartId, body.data.id);
  } catch (err) {
    console.error('[cart/remove]', err);
    return new Response('server error', { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
