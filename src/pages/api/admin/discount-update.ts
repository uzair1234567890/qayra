import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { updateDiscount } from '../../../lib/admin/discounts';

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
  original_code: z.string().min(1),
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
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fallbackCode = form.get('original_code');
    const redirectCode = typeof fallbackCode === 'string' && fallbackCode ? fallbackCode : '';
    return ctx.redirect(
      `/admin/discounts/${redirectCode}?error=${encodeURIComponent('Invalid input')}`,
      303,
    );
  }
  const {
    original_code,
    code,
    type,
    value_input,
    min_subtotal_rupees,
    max_uses,
    active_from,
    active_until,
  } = parsed.data;
  // For 'percent', value is whole percent (e.g. 20 for 20%). For 'fixed', value is paise (rupees × 100).
  const value = type === 'fixed' ? value_input * 100 : value_input;
  try {
    await updateDiscount(original_code, {
      code,
      type,
      value,
      min_subtotal: min_subtotal_rupees * 100,
      max_uses: max_uses || null,
      active_from: istToUtc(active_from),
      active_until: istToUtc(active_until),
    });
  } catch (err) {
    console.error('[admin/discount-update]', err);
    return ctx.redirect(
      `/admin/discounts/${original_code}?error=${encodeURIComponent('Save failed')}`,
      303,
    );
  }
  // Redirect to the (potentially new) code
  return ctx.redirect(`/admin/discounts/${code}?info=Saved`, 303);
};
