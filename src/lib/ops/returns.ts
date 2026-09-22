import { supabaseAdmin } from '../supabase/admin';

export async function listReturns(status: string) {
  const { data, error } = await supabaseAdmin
    .from('returns')
    .select('*, order:orders(code, total, profile:profiles(full_name))')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) { console.error('[ops] listReturns', error.message); return []; }
  return data ?? [];
}
