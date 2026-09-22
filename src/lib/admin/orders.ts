import { supabaseAdmin } from '../supabase/admin';

// Email lives on auth.users, NOT on the public.profiles table. Earlier code
// tried to SELECT profiles.email which made the entire row error and broke
// both the admin and ops order pages. Fetch the email via the auth admin API
// after the main query and attach it to the profile result.
async function attachEmail<T extends { id: string }>(profile: T | null): Promise<(T & { email: string | null }) | null> {
  if (!profile) return null;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (error) {
    console.error('[admin] getUserById', error.message);
    return { ...profile, email: null };
  }
  return { ...profile, email: data.user.email ?? null };
}

export async function getShipment(orderId: string) {
  const { data } = await supabaseAdmin
    .from('shipments')
    .select('courier_name, awb_number, dispatched_at, delivered_at')
    .eq('order_id', orderId)
    .maybeSingle();
  return data;
}

export async function listOrders({
  status,
  search,
  page = 1,
  pageSize = 20,
}: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let q = supabaseAdmin
    .from('orders')
    .select('id, code, status, payment_method, total, created_at, profile:profiles(id, full_name)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (status) q = q.eq('status', status);
  if (search) q = q.ilike('code', `%${search}%`);
  const { data, count, error } = await q;
  if (error) console.error('[admin]', error.message);
  // Attach email per order (small N — page size 20 — keeps it bounded).
  const withEmail = await Promise.all(
    (data ?? []).map(async (o) => ({ ...o, profile: await attachEmail(o.profile as any) })),
  );
  return { orders: withEmail, total: count ?? 0 };
}

export async function getOrder(code: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(
      `
      *,
      profile:profiles(id, full_name, phone),
      items:order_items(id, name_snapshot, price_snapshot, quantity, scent_id, bundle_id),
      history:order_status_history(id, status, note, actor_id, created_at)
    `,
    )
    .eq('code', code)
    .maybeSingle();
  if (error) console.error('[admin]', error.message);
  if (!data) return data;
  return { ...data, profile: await attachEmail(data.profile as any) };
}
