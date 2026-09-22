import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { AddressInput, createAddress } from '../../../lib/addresses';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = AddressInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/account/addresses/new?error=invalid', 303);
  try {
    await createAddress(ctx.request, ctx.cookies, result.userId, parsed.data);
  } catch (err) {
    console.error('[account/address-create]', err);
    return ctx.redirect('/account/addresses/new?error=failed', 303);
  }
  return ctx.redirect('/account/addresses', 303);
};
