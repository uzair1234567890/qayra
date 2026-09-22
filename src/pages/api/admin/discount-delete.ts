import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { deleteDiscount } from '../../../lib/admin/discounts';

const Body = z.object({
  code: z.string().min(1),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success)
    return ctx.redirect(`/admin/discounts?error=${encodeURIComponent('Invalid request')}`, 303);
  try {
    await deleteDiscount(parsed.data.code);
  } catch (err) {
    console.error('[admin/discount-delete]', err);
    return ctx.redirect(`/admin/discounts?error=${encodeURIComponent('Delete failed')}`, 303);
  }
  return ctx.redirect('/admin/discounts', 303);
};
