import { supabaseAdmin } from '../supabase/admin';

export async function getKpis(rangeDays: number) {
  const since = new Date(Date.now() - rangeDays * 86_400_000).toISOString();
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('total, status')
    .gte('created_at', since)
    .in('status', ['paid', 'packed', 'shipped', 'delivered']);
  const revenue = (orders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  const count = (orders ?? []).length;
  const aov = count ? Math.round(revenue / count) : 0;
  return { revenue, count, aov };
}

export async function recentOrders(limit = 5) {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('code, status, total, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function lowStock(threshold = 20) {
  const { data } = await supabaseAdmin
    .from('scents')
    .select('name, stock_qty')
    .lt('stock_qty', threshold)
    .order('stock_qty');
  return data ?? [];
}
