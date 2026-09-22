import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { createOffer } from '../../../lib/admin/offers';
import type { Json } from '../../../lib/supabase/types';

const FreeShippingBody = z.object({
  name: z.string().min(1).max(100),
  active: z.preprocess((v) => v === 'true', z.boolean()),
  kind: z.literal('free_shipping'),
  min_subtotal_rupees: z.coerce.number().int().min(0),
});

const BuyXGetYBody = z.object({
  name: z.string().min(1).max(100),
  active: z.preprocess((v) => v === 'true', z.boolean()),
  kind: z.literal('buy_x_get_y_pct'),
  scent_id: z.string().uuid(),
  min_qty: z.coerce.number().int().min(2),
  pct_off_extra: z.coerce.number().int().min(1).max(100),
});

const Body = z.discriminatedUnion('kind', [FreeShippingBody, BuyXGetYBody]);

export const POST: APIRoute = async (ctx) => {
  const result = await requireRole(ctx as any, 'admin');
  if (result instanceof Response) return result;
  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return ctx.redirect(`/admin/offers/new?error=${encodeURIComponent('Invalid input')}`, 303);
  const rule_json: Json =
    parsed.data.kind === 'free_shipping'
      ? { kind: 'free_shipping', min_subtotal: parsed.data.min_subtotal_rupees * 100 }
      : {
          kind: 'buy_x_get_y_pct',
          scent_id: parsed.data.scent_id,
          min_qty: parsed.data.min_qty,
          pct_off_extra: parsed.data.pct_off_extra,
        };
  try {
    await createOffer({
      name: parsed.data.name,
      active: parsed.data.active,
      rule_json,
    });
  } catch (err) {
    console.error('[admin/offer-create]', err);
    return ctx.redirect(`/admin/offers/new?error=${encodeURIComponent('Save failed')}`, 303);
  }
  return ctx.redirect('/admin/offers', 303);
};
