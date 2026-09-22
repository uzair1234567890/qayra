import { supabaseAdmin } from '../supabase/admin';

export async function listProducts() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, base_price, status')
    .order('name');
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function getProduct(id: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}
