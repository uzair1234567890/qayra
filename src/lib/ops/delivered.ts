import { supabaseAdmin } from '../supabase/admin';

export interface DeliveredOrder {
  id: string;
  code: string;
  status: string;
  total: number;
  payment_method: string;
  created_at: string;
  profile: { full_name: string | null } | null;
}

export async function listDelivered({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ orders: DeliveredOrder[]; total: number }> {
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, code, status, total, payment_method, created_at, profile:profiles(full_name)',
      { count: 'exact' },
    )
    .in('status', ['delivered', 'returned'])
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) { console.error('[ops] listDelivered', error.message); return { orders: [], total: 0 }; }
  return { orders: (data ?? []) as DeliveredOrder[], total: count ?? 0 };
}
