import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { createDiscount } from '../../../lib/admin/discounts';

// Treat datetime-local string as IST (UTC+5:30, no DST) and convert to UTC ISO.
function istToUtc(s: string | null | undefined): string | null {
  if (!s) return null;
  const [date, time] = s.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 5, mi - 30)).toISOString();
}

const DTLOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const Body = z.object({
  code: z.string().regex(/^[A-Z0-9_-]{3,40}$/),
  type: z.enum(['percent', 'fixed']),
  value_input: z.coerce.number().int().positive(),
  min_subtotal_rupees: z.coerce.number().int().min(0),
  max_uses: z.union([z.coerce.number().int().positive(), z.literal('')]).optional().nullable(),
  active_from: z.union([z.string().regex(DTLOCAL), z.literal('')]).optional().nullable(),
  active_until: z.union([z.string().regex(DTLOCAL), z.literal('')]).optional().nullable(),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const parsed = Body.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success)
    return ctx.redirect(`/admin/discounts/new?error=${encodeURIComponent('Invalid input')}`, 303);
  const { code, type, value_input, min_subtotal_rupees, max_uses, active_from, active_until } =
    parsed.data;
  // For 'percent', value is whole percent (e.g. 20 for 20%). For 'fixed', value is paise (rupees × 100).
  const value = type === 'fixed' ? value_input * 100 : value_input;
  try {
    await createDiscount({
      code,
      type,
      value,
      min_subtotal: min_subtotal_rupees * 100,
      max_uses: max_uses || null,
      active_from: istToUtc(active_from),
      active_until: istToUtc(active_until),
    });
  } catch (err) {
    console.error('[admin/discount-create]', err);
    return ctx.redirect(`/admin/discounts/new?error=${encodeURIComponent('Create failed')}`, 303);
  }
  return ctx.redirect('/admin/discounts', 303);
};
