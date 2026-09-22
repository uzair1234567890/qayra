import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { deleteOffer } from '../../../lib/admin/offers';

const Body = z.object({
  id: z.string().uuid(),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return ctx.redirect(`/admin/offers?error=${encodeURIComponent('Invalid request')}`, 303);
  try {
    await deleteOffer(parsed.data.id);
  } catch (err) {
    console.error('[admin/offer-delete]', err);
    return ctx.redirect(`/admin/offers?error=${encodeURIComponent('Delete failed')}`, 303);
  }
  return ctx.redirect('/admin/offers', 303);
};
