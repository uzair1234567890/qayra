import { supabaseAdmin } from '../supabase/admin';

export async function listReviews(status: 'pending' | 'published' | 'hidden') {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, title, body, photo_urls, created_at, status, scent:scents(name), profile:profiles(full_name)')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) { console.error('[admin] listReviews', error.message); return []; }
  return data ?? [];
}
