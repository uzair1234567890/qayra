import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { setDefaultAddress } from '../../../lib/addresses';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const id = String(form.get('id') ?? '');
  if (!id) return ctx.redirect('/account/addresses', 303);
  try {
    await setDefaultAddress(ctx.request, ctx.cookies, result.userId, id);
  } catch (err) {
    console.error('[account/address-default]', err);
    return ctx.redirect('/account/addresses?error=failed', 303);
  }
  return ctx.redirect('/account/addresses', 303);
};
