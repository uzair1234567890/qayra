import { supabaseAdmin } from '../supabase/admin';

export async function audit(
  actorId: string,
  action: string,
  target: { table: string; id: string },
  payload?: unknown,
) {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    actor_id: actorId,
    action,
    target_table: target.table,
    target_id: target.id,
    payload: payload ? (payload as any) : null,
  });
  if (error) console.error('[audit]', error.message);
}
