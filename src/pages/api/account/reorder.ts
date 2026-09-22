import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { getOrCreateCart } from '../../../lib/cart';
import { reorderToCart } from '../../../lib/orders';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const code = String(form.get('code') ?? '');
  if (!code) return new Response('bad request', { status: 400 });
  const cartId = await getOrCreateCart(ctx.request, ctx.cookies, ctx.locals.cartToken);
  const { restored, skipped } = await reorderToCart(
    ctx.request,
    ctx.cookies,
    result.userId,
    code,
    cartId,
  );
  if (skipped > 0) {
    const msg = `${restored} item${restored !== 1 ? 's' : ''} added; ${skipped} unavailable`;
    return ctx.redirect(`/cart?notice=${encodeURIComponent(msg)}`, 303);
  }
  return ctx.redirect('/cart?reordered=1', 303);
};
