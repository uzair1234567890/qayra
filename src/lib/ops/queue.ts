import { supabaseAdmin } from '../supabase/admin';

export interface QueueOrder {
  id: string;
  code: string;
  status: string;
  payment_method: string;
  total: number;
  full_name: string | null;
  items_label: string;
  created_at: string;
}

export async function loadQueue(): Promise<{
  toPack: QueueOrder[];
  toAwb: QueueOrder[];
  inTransit: QueueOrder[];
}> {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, code, status, payment_method, total, created_at, profile:profiles(full_name), order_items(name_snapshot, quantity)',
    )
    .in('status', ['paid', 'packed', 'shipped'])
    .order('created_at');
  if (error) { console.error('[ops] loadQueue', error.message); }
  const map = (o: any): QueueOrder => ({
    id: o.id,
    code: o.code,
    status: o.status,
    payment_method: o.payment_method,
    total: o.total,
    full_name: o.profile?.full_name ?? null,
    items_label: (o.order_items ?? [])
      .map((i: any) => `${i.name_snapshot} × ${i.quantity}`)
      .join(', '),
    created_at: o.created_at,
  });
  return {
    toPack: (orders ?? []).filter((o: any) => o.status === 'paid').map(map),
    toAwb: (orders ?? []).filter((o: any) => o.status === 'packed').map(map),
    inTransit: (orders ?? []).filter((o: any) => o.status === 'shipped').map(map),
  };
}
