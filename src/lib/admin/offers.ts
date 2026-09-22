import { supabaseAdmin } from '../supabase/admin';
import type { Json } from '../supabase/types';

export async function listOffers() {
  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('id, name, active, rule_json, created_at')
    .order('created_at', { ascending: false });
  if (error) console.error('[admin]', error.message);
  return data ?? [];
}

export async function getOffer(id: string) {
  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  return data;
}

export async function createOffer(input: {
  name: string;
  active: boolean;
  rule_json: Json;
}) {
  const { error } = await supabaseAdmin.from('offers').insert(input);
  if (error) throw error;
}

export async function updateOffer(
  id: string,
  input: Partial<{
    name: string;
    active: boolean;
    rule_json: Json;
  }>,
) {
  const { error } = await supabaseAdmin.from('offers').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteOffer(id: string) {
  const { error } = await supabaseAdmin.from('offers').delete().eq('id', id);
  if (error) throw error;
}
