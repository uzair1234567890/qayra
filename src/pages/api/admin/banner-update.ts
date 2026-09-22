import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { updateBanner } from '../../../lib/admin/banners';

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
  position: z.enum(['announcement', 'hero']),
  headline: z.string().max(200).optional().nullable(),
  image_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  cta_text: z.string().max(80).optional().nullable(),
  cta_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  active_from: z.union([z.string().regex(DTLOCAL), z.literal('')]).optional().nullable(),
  active_until: z.union([z.string().regex(DTLOCAL), z.literal('')]).optional().nullable(),
});

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const idParse = z.string().uuid().safeParse(form.get('id'));
  if (!idParse.success) return ctx.redirect('/admin/banners?error=Invalid+banner+id', 303);
  const id = idParse.data;
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return ctx.redirect(
      `/admin/banners/${id}?error=${encodeURIComponent('Invalid input')}`,
      303,
    );
  const { position, headline, image_url, cta_text, cta_url, active_from, active_until } =
    parsed.data;
  try {
    await updateBanner(id, {
      position,
      headline: headline || null,
      image_url: image_url || null,
      cta_text: cta_text || null,
      cta_url: cta_url || null,
      active_from: istToUtc(active_from),
      active_until: istToUtc(active_until),
    });
  } catch (err) {
    console.error('[admin/banner-update]', err);
    return ctx.redirect(
      `/admin/banners/${id}?error=${encodeURIComponent('Save failed')}`,
      303,
    );
  }
  return ctx.redirect(`/admin/banners/${id}?info=Saved`, 303);
};
