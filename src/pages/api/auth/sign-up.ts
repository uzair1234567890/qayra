import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { env } from '../../../lib/env';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().trim().min(1).max(80).optional(),
  next: z.string().optional(),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues.map((i) => i.message).join(', '));
    return redirect(`/auth/sign-up?error=${msg}`, 303);
  }

  const supabase = serverClient(request, cookies);
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${env!.PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) {
    return redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`, 303);
  }
  return redirect(
    `/auth/sign-in?info=${encodeURIComponent('Check your email to confirm your account.')}`,
    303,
  );
};
