import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { AddressInput, updateAddress } from '../../../lib/addresses';

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'customer');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const id = String(form.get('id') ?? '');
  if (!id) return ctx.redirect('/account/addresses', 303);
  const parsed = AddressInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return ctx.redirect(`/account/addresses/${id}/edit?error=invalid`, 303);
  try {
    await updateAddress(ctx.request, ctx.cookies, result.userId, id, parsed.data);
  } catch (err) {
    console.error('[account/address-update]', err);
    return ctx.redirect(`/account/addresses/${id}/edit?error=failed`, 303);
  }
  return ctx.redirect('/account/addresses', 303);
};
