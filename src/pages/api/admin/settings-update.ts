import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { audit } from '../../../lib/admin/audit';

const Body = z.object({
  store_name: z.string().min(1).max(100),
  support_email: z.string().email(),
  shipping_flat: z.coerce.number().int().min(0),
  shipping_free_threshold: z.coerce.number().int().min(0),
  cod_enabled: z.preprocess(v => v === 'on', z.boolean()),
  cod_surcharge: z.coerce.number().int().min(0),
});

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'admin');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return ctx.redirect('/admin/settings?error=Invalid+input', 303);

  const { store_name, support_email, shipping_flat, shipping_free_threshold, cod_enabled, cod_surcharge } = parsed.data;
  const now = new Date().toISOString();

  const upserts = [
    supabaseAdmin.from('store_settings').upsert({ key: 'store_name', value: store_name, updated_at: now }, { onConflict: 'key' }),
    supabaseAdmin.from('store_settings').upsert({ key: 'support_email', value: support_email, updated_at: now }, { onConflict: 'key' }),
    supabaseAdmin.from('store_settings').upsert({ key: 'shipping', value: { flat_paise: shipping_flat * 100, free_threshold_paise: shipping_free_threshold * 100 }, updated_at: now }, { onConflict: 'key' }),
    supabaseAdmin.from('store_settings').upsert({ key: 'cod', value: { enabled: cod_enabled, surcharge_paise: cod_surcharge * 100 }, updated_at: now }, { onConflict: 'key' }),
  ];

  const results = await Promise.all(upserts);
  const failed = results.find(r => r.error);
  if (failed?.error) {
    console.error('[admin] settings-update', failed.error.message);
    return ctx.redirect('/admin/settings?error=Settings+save+failed', 303);
  }

  await audit(me.userId, 'settings.update', { table: 'store_settings', id: 'all' });
  return ctx.redirect('/admin/settings?info=Settings+saved', 303);
};
