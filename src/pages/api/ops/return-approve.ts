import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const Body = z.object({ return_id: z.string().uuid() });

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/ops/returns?error=Invalid+input', 303);

  const { data, error } = await supabaseAdmin
    .from('returns')
    .update({ status: 'approved' })
    .eq('id', parsed.data.return_id)
    .eq('status', 'requested')
    .select('id');
  if (error) return ctx.redirect('/ops/returns?error=Approve+failed', 303);
  if (!data || data.length === 0)
    return ctx.redirect('/ops/returns?error=Return+not+in+requested+state', 303);

  return ctx.redirect('/ops/returns?tab=requested&info=Return+approved', 303);
};
