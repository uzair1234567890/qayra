import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { audit } from '../../../lib/admin/audit';

const Body = z.object({
  email: z.string().email(),
  role: z.enum(['operations', 'admin']),
});

export const POST: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'admin');
  if (me instanceof Response) return me;

  const form = await ctx.request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) return ctx.redirect('/admin/team?error=Invalid+input', 303);

  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    parsed.data.email,
  );

  // Resolve user ID — inviteUserByEmail returns null data when user already exists
  let userId = invited?.user?.id;
  if (!userId) {
    if (inviteErr && inviteErr.status !== 422) {
      return ctx.redirect(`/admin/team?error=${encodeURIComponent(inviteErr.message)}`, 303);
    }
    // Existing user — find by email via auth admin list
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const match = usersData?.users.find(u => u.email === parsed.data.email);
    if (!match) return ctx.redirect('/admin/team?error=Could+not+resolve+user', 303);
    userId = match.id;
  }

  const { error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', userId);
  if (updateErr) return ctx.redirect(`/admin/team?error=${encodeURIComponent(updateErr.message)}`, 303);

  await audit(me.userId, 'team.grant_role', { table: 'profiles', id: userId }, { role: parsed.data.role });
  return ctx.redirect('/admin/team?info=Role+granted', 303);
};
