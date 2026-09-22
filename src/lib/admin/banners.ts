import { supabaseAdmin } from '../supabase/admin';

export async function listBanners() {
  const { data, error } = await supabaseAdmin
    .from('banners')
    .select('id, position, headline, active_from, active_until, created_at')
    .order('created_at', { ascending: false });
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function getBanner(id: string) {
  const { data, error } = await supabaseAdmin
    .from('banners')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}

export async function createBanner(input: {
  position: string;
  headline?: string | null;
  image_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  active_from?: string | null;
  active_until?: string | null;
}) {
  const { error } = await supabaseAdmin.from('banners').insert(input);
  if (error) throw error;
}

export async function updateBanner(
  id: string,
  input: Partial<{
    position: string;
    headline: string | null;
    image_url: string | null;
    cta_text: string | null;
    cta_url: string | null;
    active_from: string | null;
    active_until: string | null;
  }>,
) {
  const { error } = await supabaseAdmin.from('banners').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteBanner(id: string) {
  const { error } = await supabaseAdmin.from('banners').delete().eq('id', id);
  if (error) throw error;
}
