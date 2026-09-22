import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { deleteBanner } from '../../../lib/admin/banners';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const idParse = z.string().uuid().safeParse((await ctx.request.formData()).get('id'));
  if (!idParse.success) return ctx.redirect('/admin/banners?error=Invalid+id', 303);
  try {
    await deleteBanner(idParse.data);
  } catch (err) {
    console.error('[admin/banner-delete]', err);
    return ctx.redirect(`/admin/banners?error=${encodeURIComponent('Delete failed')}`, 303);
  }
  return ctx.redirect('/admin/banners', 303);
};
