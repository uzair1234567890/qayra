import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({
  return_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/ops/returns?error=Invalid+input', 303);

  // reason column stores the rejection note (schema has a single text field)
  const { data, error } = await supabaseAdmin
    .from('returns')
    .update({ status: 'rejected', reason: parsed.data.reason, actor_id: me.userId })
    .eq('id', parsed.data.return_id)
    .eq('status', 'requested')
    .select('id');
  if (error) return ctx.redirect('/ops/returns?error=Reject+failed', 303);
  if (!data || data.length === 0)
    return ctx.redirect('/ops/returns?error=Return+not+in+requested+state', 303);

  return ctx.redirect('/ops/returns?tab=requested&info=Return+rejected', 303);
};
