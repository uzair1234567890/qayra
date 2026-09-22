import { supabaseAdmin } from '../supabase/admin';

export async function listInventory() {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('id, name, stock_qty, active')
    .order('name');
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function setStock(id: string, stock_qty: number) {
  const { error } = await supabaseAdmin
    .from('scents')
    .update({ stock_qty })
    .eq('id', id);
  if (error) throw error;
}
