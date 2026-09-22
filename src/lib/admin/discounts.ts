import { supabaseAdmin } from '../supabase/admin';

export async function listDiscounts() {
  const { data, error } = await supabaseAdmin
    .from('discounts')
    .select('code, type, value, min_subtotal, max_uses, used_count, active_from, active_until')
    .order('created_at', { ascending: false });
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function getDiscount(code: string) {
  const { data, error } = await supabaseAdmin
    .from('discounts')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}

export async function createDiscount(input: {
  code: string;
  type: string;
  value: number;
  min_subtotal: number;
  max_uses?: number | null;
  active_from?: string | null;
  active_until?: string | null;
}) {
  const { error } = await supabaseAdmin.from('discounts').insert(input);
  if (error) throw error;
}

export async function updateDiscount(
  code: string,
  input: Partial<{
    code: string;
    type: string;
    value: number;
    min_subtotal: number;
    max_uses: number | null;
    active_from: string | null;
    active_until: string | null;
  }>,
) {
  const { error } = await supabaseAdmin.from('discounts').update(input).eq('code', code);
  if (error) throw error;
}

export async function deleteDiscount(code: string) {
  const { error } = await supabaseAdmin.from('discounts').delete().eq('code', code);
  if (error) throw error;
}
