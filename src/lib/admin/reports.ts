import { supabaseAdmin } from '../supabase/admin';

export async function revenueByDay(rangeDays: number) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('created_at, total')
    .gte('created_at', since)
    .in('status', ['paid', 'packed', 'shipped', 'delivered']);
  if (error) { console.error('[admin] revenueByDay', error.message); return []; }
  const buckets = new Map<string, number>();
  for (const o of data ?? []) {
    const day = o.created_at.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + (o.total ?? 0));
  }
  return Array.from(buckets.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export async function topScents(rangeDays: number, limit = 5) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select('quantity, price_snapshot, scent:scents(name), order:orders!inner(created_at, status)')
    .gte('order.created_at', since)
    .in('order.status', ['paid', 'packed', 'shipped', 'delivered']);
  if (error) { console.error('[admin] topScents', error.message); return []; }
  const agg = new Map<string, { qty: number; revenue: number }>();
  for (const it of data ?? []) {
    const name = (it.scent as any)?.name ?? '—';
    const a = agg.get(name) ?? { qty: 0, revenue: 0 };
    a.qty += it.quantity ?? 0;
    a.revenue += (it.price_snapshot ?? 0) * (it.quantity ?? 0);
    agg.set(name, a);
  }
  return Array.from(agg.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function codVsPrepaidSplit(rangeDays: number) {
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('payment_method')
    .gte('created_at', since)
    .in('status', ['paid', 'packed', 'shipped', 'delivered']);
  if (error) { console.error('[admin] codVsPrepaidSplit', error.message); return { cod: 0, prepaid: 0, total: 0 }; }
  const all = data ?? [];
  const cod = all.filter(o => o.payment_method === 'cod').length;
  return { cod, prepaid: all.length - cod, total: all.length };
}
