import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { toggleScent } from '../../../lib/admin/scents';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const id = String(form.get('id') ?? '');
  const active = form.get('active') === 'true';
  if (!id) return ctx.redirect('/admin/products', 303);
  try {
    await toggleScent(id, active);
  } catch (err) {
    console.error('[admin/scent-toggle]', err);
    return ctx.redirect('/admin/products?error=toggle-failed', 303);
  }
  return ctx.redirect('/admin/products', 303);
};
