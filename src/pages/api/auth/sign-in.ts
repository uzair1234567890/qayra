import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { mergeOnSignIn } from '../../../lib/cart';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

// Restrict ?next= to same-origin paths. Rejects protocol-relative (//host)
// and backslash-prefixed paths (/\host) that some browsers normalize to host changes.
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return redirect(`/auth/sign-in?error=${encodeURIComponent('Invalid email or password')}`, 303);
  }
  const supabase = serverClient(request, cookies);
  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, 303);
  }
  if (user) await mergeOnSignIn(locals.cartToken, user.id);
  return redirect(safeNext(parsed.data.next), 303);
};
