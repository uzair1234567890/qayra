import type { APIContext, AstroCookies } from 'astro';
import { serverClient } from '../supabase/server';
import { isRole, requiresAtLeast, type Role } from './roles';

export interface Session {
  userId: string;
  email: string;
  role: Role;
}

export async function getSession(request: Request, cookies: AstroCookies): Promise<Session | null> {
  const supabase = serverClient(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;
  if (!isRole(role)) return null;

  return { userId: user.id, email: user.email ?? '', role };
}

export async function requireRole(ctx: APIContext, minimum: Role): Promise<Session | Response> {
  const session = await getSession(ctx.request, ctx.cookies);
  if (!session) {
    const next = encodeURIComponent(ctx.url.pathname + ctx.url.search);
    return ctx.redirect(`/auth/sign-in?next=${next}`, 302);
  }
  if (!requiresAtLeast(session.role, minimum)) {
    return new Response('Forbidden', { status: 403 });
  }
  return session;
}
