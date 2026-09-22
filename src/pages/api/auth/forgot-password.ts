import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { env } from '../../../lib/env';

const Body = z.object({ email: z.string().email() });

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return redirect('/auth/forgot-password?error=Invalid+email', 303);
  }
  const supabase = serverClient(request, cookies);
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env!.PUBLIC_SITE_URL}/auth/reset-password`,
  });
  return redirect(
    `/auth/forgot-password?info=${encodeURIComponent('If that email exists, a reset link is on the way.')}`,
    303,
  );
};
