import { supabaseAdmin } from '../supabase/admin';

export async function listCustomers({
  search,
  page = 1,
  pageSize = 20,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  if (search) {
    // Search profiles by name — auth.users has no server-side name filter
    const from = (page - 1) * pageSize;
    const { data: profiles, count } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, created_at', { count: 'exact' })
      .ilike('full_name', `%${search}%`)
      .range(from, from + pageSize - 1);

    if (!profiles || profiles.length === 0) return { customers: [], total: count ?? 0 };

    const ids = profiles.map(p => p.id);
    const authUsers = await Promise.all(ids.map(id => supabaseAdmin.auth.admin.getUserById(id)));
    const emailMap = new Map(
      authUsers
        .filter(r => r.data.user)
        .map(r => [r.data.user!.id, r.data.user!.email ?? '']),
    );

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('profile_id, total')
      .in('profile_id', ids)
      .in('status', ['paid', 'packed', 'shipped', 'delivered']);

    const orderAgg = new Map<string, { count: number; spend: number }>();
    for (const o of orders ?? []) {
      const pid = o.profile_id;
      if (!pid) continue;
      const a = orderAgg.get(pid) ?? { count: 0, spend: 0 };
      a.count += 1;
      a.spend += o.total ?? 0;
      orderAgg.set(pid, a);
    }

    const customers = profiles.map(p => ({
      id: p.id,
      email: emailMap.get(p.id) ?? '',
      full_name: p.full_name ?? null,
      phone: p.phone ?? null,
      joined: p.created_at,
      orders: orderAgg.get(p.id)?.count ?? 0,
      spend: orderAgg.get(p.id)?.spend ?? 0,
    }));

    return { customers, total: count ?? 0 };
  }

  // No search: paginate through auth users
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });
  if (authErr) { console.error('[admin]', authErr.message); return { customers: [], total: 0 }; }

  const users = authData.users;
  const total = authData.total ?? users.length;

  if (users.length === 0) return { customers: [], total: 0 };

  const ids = users.map(u => u.id);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .in('id', ids);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('profile_id, total')
    .in('profile_id', ids)
    .in('status', ['paid', 'packed', 'shipped', 'delivered']);

  const orderAgg = new Map<string, { count: number; spend: number }>();
  for (const o of orders ?? []) {
    const pid = o.profile_id;
    if (!pid) continue;
    const a = orderAgg.get(pid) ?? { count: 0, spend: 0 };
    a.count += 1;
    a.spend += o.total ?? 0;
    orderAgg.set(pid, a);
  }

  const customers = users.map(u => ({
    id: u.id,
    email: u.email ?? '',
    full_name: profileMap.get(u.id)?.full_name ?? null,
    phone: profileMap.get(u.id)?.phone ?? null,
    joined: profileMap.get(u.id)?.created_at ?? u.created_at,
    orders: orderAgg.get(u.id)?.count ?? 0,
    spend: orderAgg.get(u.id)?.spend ?? 0,
  }));

  return { customers, total };
}

export async function getCustomer(id: string) {
  const [{ data: authUser, error: authErr }, { data: profile }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(id),
    supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle(),
  ]);

  if (authErr) console.error('[admin] getUserById failed', authErr.message);
  if (!profile) return null;

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, code, status, total, created_at')
    .eq('profile_id', id)
    .order('created_at', { ascending: false });

  const { data: addresses } = await supabaseAdmin
    .from('addresses')
    .select('id, name, line1, line2, city, state, pincode, phone, is_default')
    .eq('profile_id', id)
    .order('is_default', { ascending: false });

  const paidStatuses = new Set(['paid', 'packed', 'shipped', 'delivered']);
  const lifeSpend = (orders ?? [])
    .filter(o => paidStatuses.has(o.status))
    .reduce((s, o) => s + (o.total ?? 0), 0);

  return {
    id,
    email: authUser?.user?.email ?? '',
    full_name: profile.full_name,
    phone: profile.phone,
    role: profile.role,
    joined: profile.created_at,
    orders: orders ?? [],
    addresses: addresses ?? [],
    lifeSpend,
  };
}
