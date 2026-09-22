import { supabaseAdmin } from '../supabase/admin';

export interface InventoryScent {
  id: string;
  name: string;
  stock_qty: number;
  active: boolean;
}

export async function listInventory(): Promise<InventoryScent[]> {
  const { data, error } = await supabaseAdmin
    .from('scents')
    .select('id, name, stock_qty, active')
    .order('name');
  if (error) { console.error('[ops] listInventory', error.message); return []; }
  return data ?? [];
}
