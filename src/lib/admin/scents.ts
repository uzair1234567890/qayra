import { supabaseAdmin } from '../supabase/admin';

export async function listScents() {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('id, name, slug, active, stock_qty, sort_order, product_id')
    .order('sort_order')
    .order('name');
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function getScent(id: string) {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}

export async function getProductForEdit(id: string) {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('*, product:products(id, base_price)')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}

export async function createScent(input: {
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  top_notes?: string | null;
  heart_notes?: string | null;
  base_notes?: string | null;
  image_urls: string[];
  stock_qty: number;
  sort_order: number;
  active: boolean;
  product_id: string;
}) {
  const { error } = await supabaseAdmin.from('scents').insert(input);
  if (error) throw error;
}

export async function updateScent(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    top_notes: string | null;
    heart_notes: string | null;
    base_notes: string | null;
    image_urls: string[];
    stock_qty: number;
    sort_order: number;
    active: boolean;
    product_id: string;
  }>,
) {
  const { error } = await supabaseAdmin.from('scents').update(input).eq('id', id);
  if (error) throw error;
}

export async function toggleScent(id: string, active: boolean) {
  const { error } = await supabaseAdmin.from('scents').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function listActiveScentsForSelect() {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('id, name')
    .eq('active', true)
    .order('name');
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}
