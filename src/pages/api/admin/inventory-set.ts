import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { setStock } from '../../../lib/admin/inventory';

const Body = z.object({
  id: z.string().uuid(),
  stock_qty: z.coerce.number().int().min(0),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success)
    return ctx.redirect('/admin/inventory?error=Invalid+input', 303);
  try {
    await setStock(parsed.data.id, parsed.data.stock_qty);
  } catch (err) {
    console.error('[admin/inventory-set]', err);
    return ctx.redirect('/admin/inventory?error=Save+failed', 303);
  }
  return ctx.redirect('/admin/inventory?info=Saved', 303);
};
