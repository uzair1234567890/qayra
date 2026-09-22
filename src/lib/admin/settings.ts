import { supabaseAdmin } from '../supabase/admin';

export type Settings = {
  store_name: string;
  support_email: string;
  shipping_flat_paise: number;
  shipping_free_threshold_paise: number;
  cod_enabled: boolean;
  cod_surcharge_paise: number;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from('store_settings')
    .select('key, value');
  if (error) { console.error('[admin] getSettings', error.message); }
  const map = new Map((data ?? []).map(r => [r.key, r.value]));

  return {
    store_name: (map.get('store_name') as string) ?? 'qayra',
    support_email: (map.get('support_email') as string) ?? 'hello@qayra.in',
    shipping_flat_paise: ((map.get('shipping') as any)?.flat_paise) ?? 5000,
    shipping_free_threshold_paise: ((map.get('shipping') as any)?.free_threshold_paise) ?? 49900,
    cod_enabled: ((map.get('cod') as any)?.enabled) ?? true,
    cod_surcharge_paise: ((map.get('cod') as any)?.surcharge_paise) ?? 5000,
  };
}
