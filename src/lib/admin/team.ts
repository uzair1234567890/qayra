import { supabaseAdmin } from '../supabase/admin';

export async function listTeam() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, created_at')
    .in('role', ['operations', 'admin'])
    .order('role')
    .order('created_at');
  if (error) { console.error('[admin] listTeam', error.message); return []; }
  return data ?? [];
}
