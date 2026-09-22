import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { createBundle } from '../../../lib/admin/bundles';

const BundleBase = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  price_rupees: z.coerce.number().int().positive(),
  image_urls: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
});

function parseItems(form: FormData, allEntries: [string, FormDataEntryValue][]): { scent_id: string; quantity: number }[] {
  return allEntries
    .filter(([k]) => k.startsWith('scent_'))
    .map(([k]) => {
      const scentId = k.slice(6); // strip 'scent_'
      const qty = parseInt(String(form.get(`qty_${scentId}`) ?? '1'), 10);
      return { scent_id: scentId, quantity: Number.isFinite(qty) && qty > 0 ? qty : 1 };
    });
}

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const entries = [...form.entries()];
  const parsed = BundleBase.safeParse(Object.fromEntries(entries));
  if (!parsed.success)
    return ctx.redirect(`/admin/bundles/new?error=${encodeURIComponent('Invalid input')}`, 303);
  const { price_rupees, image_urls, ...rest } = parsed.data;
  let urls: string[] = [];
  try {
    const arr = JSON.parse(image_urls ?? '[]');
    if (Array.isArray(arr)) urls = arr.filter((s): s is string => typeof s === 'string' && !!s);
  } catch {
    return ctx.redirect(`/admin/bundles/new?error=${encodeURIComponent('Invalid image data')}`, 303);
  }
  const items = parseItems(form, entries);
  try {
    await createBundle(
      { ...rest, price: price_rupees * 100, image_urls: urls },
      items,
    );
  } catch (err) {
    console.error('[admin/bundle-create]', err);
    return ctx.redirect(`/admin/bundles/new?error=${encodeURIComponent('Create failed')}`, 303);
  }
  return ctx.redirect('/admin/bundles', 303);
};
