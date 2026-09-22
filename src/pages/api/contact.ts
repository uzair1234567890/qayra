import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverClient } from '../../lib/supabase/server';

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  message: z.string().trim().min(1).max(2000),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();

  // Honeypot — bots fill the hidden "website" field; humans leave it empty
  if (form.get('website')) return redirect('/contact?sent=1', 303);

  const parsed = Body.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return redirect(`/contact?error=${encodeURIComponent('Please fill all fields correctly')}`, 303);
  const supabase = serverClient(request, cookies);
  const { error } = await supabase.from('contact_messages').insert(parsed.data);
  if (error) {
    console.error('contact insert', error);
    return redirect(`/contact?error=${encodeURIComponent('Something went wrong')}`, 303);
  }
  return redirect('/contact?sent=1', 303);
};
