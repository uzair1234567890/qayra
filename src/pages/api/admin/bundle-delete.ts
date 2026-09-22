import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { deleteBundle } from '../../../lib/admin/bundles';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const id = String(form.get('id') ?? '');
  if (!id) return ctx.redirect('/admin/bundles', 303);
  try {
    await deleteBundle(id);
  } catch (err) {
    console.error('[admin/bundle-delete]', err);
    return ctx.redirect(`/admin/bundles?error=${encodeURIComponent('Delete failed')}`, 303);
  }
  return ctx.redirect('/admin/bundles', 303);
};
