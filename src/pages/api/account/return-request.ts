import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { requestReturn } from '../../../lib/orders';

const Body = z.object({
  order_id: z.string().uuid(),
  reason: z.string().min(5).max(2000),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/account/orders?error=invalid', 303);
  try {
    await requestReturn(ctx.request, ctx.cookies, parsed.data.order_id, parsed.data.reason);
  } catch (err) {
    console.error('[account/return-request]', err);
    return ctx.redirect('/account/orders?error=return+failed', 303);
  }
  return ctx.redirect(
    `/account/orders?info=${encodeURIComponent('Return request submitted')}`,
    303,
  );
};
