import { supabaseAdmin } from '../supabase/admin';

export async function listBundles() {
  const { data, error } = await supabaseAdmin
    .from('bundles')
    .select('id, name, slug, price, status, bundle_items(count)')
    .order('name');
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function getBundle(id: string) {
  const { data, error } = await supabaseAdmin
    .from('bundles')
    .select('*, bundle_items(scent_id, quantity)')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}

export async function createBundle(
  bundle: { name: string; slug: string; description?: string | null; price: number; image_urls?: string[]; status: string },
  items: { scent_id: string; quantity: number }[],
) {
  const { data, error } = await supabaseAdmin.from('bundles').insert(bundle).select('id').single();
  if (error) throw error;
  if (items.length) {
    const { error: itemsError } = await supabaseAdmin
      .from('bundle_items')
      .insert(items.map(i => ({ bundle_id: data.id, scent_id: i.scent_id, quantity: i.quantity })));
    if (itemsError) throw itemsError;
  }
  return data.id;
}

export async function updateBundle(
  id: string,
  bundle: Partial<{ name: string; slug: string; description: string | null; price: number; image_urls: string[]; status: string }>,
  items: { scent_id: string; quantity: number }[],
) {
  const { error } = await supabaseAdmin.from('bundles').update(bundle).eq('id', id);
  if (error) throw error;
  // Replace bundle items atomically
  await supabaseAdmin.from('bundle_items').delete().eq('bundle_id', id);
  if (items.length) {
    const { error: itemsError } = await supabaseAdmin
      .from('bundle_items')
      .insert(items.map(i => ({ bundle_id: id, scent_id: i.scent_id, quantity: i.quantity })));
    if (itemsError) throw itemsError;
  }
}

export async function deleteBundle(id: string) {
  const { error } = await supabaseAdmin.from('bundles').delete().eq('id', id);
  if (error) throw error;
}
