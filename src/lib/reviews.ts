import { serverClient } from './supabase/server';
import type { AstroCookies } from 'astro';

export async function listForScent(request: Request, cookies: AstroCookies, scentId: string) {
  const supabase = serverClient(request, cookies);
  const { data } = await supabase
    .from('reviews')
    .select('rating, title, body, photo_urls, created_at, profile:profiles(full_name)')
    .eq('scent_id', scentId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function aggregateForScent(request: Request, cookies: AstroCookies, scentId: string) {
  const supabase = serverClient(request, cookies);
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('scent_id', scentId)
    .eq('status', 'published');
  const n = (data ?? []).length;
  const avg = n === 0 ? 0 : (data ?? []).reduce((s, r) => s + r.rating, 0) / n;
  return { count: n, average: Math.round(avg * 10) / 10 };
}
