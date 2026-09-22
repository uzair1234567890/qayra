import type { APIRoute } from 'astro';
import { serverClient } from '../../lib/supabase/server';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/auth/sign-in?error=Missing+code', 303);

  const supabase = serverClient(request, cookies);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, 303);
  }
  const next = url.searchParams.get('next') || '/';
  return redirect(next, 303);
};
