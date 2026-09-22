import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { audit } from '../../../lib/admin/audit';

const Body = z.object({ profile_id: z.string().uuid() });

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'admin');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/admin/team?error=Invalid+input', 303);

  if (parsed.data.profile_id === me.userId)
    return ctx.redirect('/admin/team?error=Cannot+revoke+your+own+role', 303);

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'customer' })
    .eq('id', parsed.data.profile_id);
  if (error) return ctx.redirect(`/admin/team?error=${encodeURIComponent(error.message)}`, 303);

  await audit(me.userId, 'team.revoke_role', { table: 'profiles', id: parsed.data.profile_id });
  return ctx.redirect('/admin/team?info=Role+revoked', 303);
};
