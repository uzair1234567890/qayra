import type { APIRoute } from 'astro';
import { z } from 'zod';
import { addLine, getCartLineCount, getOrCreateCart } from '../../../lib/cart';

const Body = z
  .object({
    scent_id: z.string().uuid().optional(),
    bundle_id: z.string().uuid().optional(),
    quantity: z.number().int().positive().max(50).default(1),
  })
  .refine((v) => !!v.scent_id !== !!v.bundle_id, { message: 'Exactly one of scent_id/bundle_id required' });

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const body = Body.safeParse(raw);
  if (!body.success)
    return new Response(JSON.stringify({ error: body.error.issues }), { status: 400 });
  try {
    const cartId = await getOrCreateCart(request, cookies, locals.cartToken);
    await addLine(request, cookies, cartId, body.data);
    const bagCount = await getCartLineCount(request, cookies, locals.cartToken);
    return new Response(JSON.stringify({ ok: true, bagCount }), { status: 200 });
  } catch (err) {
    console.error('[cart/add]', err);
    return new Response('server error', { status: 500 });
  }
};
