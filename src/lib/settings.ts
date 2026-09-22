import { supabaseAdmin } from './supabase/admin';

export async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) console.error('[settings] readSetting failed', key, error.message);
  return (data?.value as unknown as T) ?? fallback;
}
