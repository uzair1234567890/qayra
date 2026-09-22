import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth/session';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const GET: APIRoute = async (ctx) => {
  const me = await requireRole(ctx as any, 'operations');
  if (me instanceof Response) return me;
  const since = new Date(new Date().toDateString()).toISOString();
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .eq('status', 'paid');
  return new Response(JSON.stringify({ count: count ?? 0 }), {
    headers: { 'content-type': 'application/json' },
  });
};
