import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { getOrCreateCart, getCartLines } from '../../../lib/cart';
import { evaluateDiscount } from '../../../lib/discount';

const Body = z.object({ code: z.string().min(1).max(40) });

const REASON_MESSAGES = {
  not_yet: 'Not yet active',
  expired: 'Expired',
  limit_reached: 'Limit reached',
  subtotal_too_low: 'Subtotal too low',
} as const;

export const POST: APIRoute = async (ctx) => {
  const body = Body.safeParse(await ctx.request.json());
  if (!body.success)
    return new Response(JSON.stringify({ error: 'Bad code' }), { status: 400 });

  const supabase = serverClient(ctx.request, ctx.cookies);
  const { data: d } = await supabase
    .from('discounts')
    .select('*')
    .eq('code', body.data.code.toUpperCase())
    .maybeSingle();

  if (!d)
    return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 404 });

  const cartId = await getOrCreateCart(ctx.request, ctx.cookies, ctx.locals.cartToken);
  const lines = await getCartLines(ctx.request, ctx.cookies, cartId);
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  const result = evaluateDiscount(d, subtotal);
  if (!result.ok)
    return new Response(JSON.stringify({ error: REASON_MESSAGES[result.reason] }), { status: 400 });

  return new Response(
    JSON.stringify({ code: result.code, discountPaise: result.discountPaise }),
    { status: 200 },
  );
};
