import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = serverClient(request, cookies);
  await supabase.auth.signOut();
  return redirect('/', 303);
};
