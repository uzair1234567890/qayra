import type { AstroCookies } from 'astro';
import { serverClient } from './supabase/server';
import { addLine } from './cart';

export async function getCustomerOrders(request: Request, cookies: AstroCookies, profileId: string) {
  const supabase = serverClient(request, cookies);
  const { data, error } = await supabase
    .from('orders')
    .select('code, status, total, payment_method, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[orders] getCustomerOrders', error);
    throw error;
  }
  return data ?? [];
}

export async function getOrderByCode(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  code: string,
) {
  const supabase = serverClient(request, cookies);
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(status, note, created_at), shipments(*)')
    .eq('code', code)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    console.error('[orders] getOrderByCode', error);
    throw error;
  }
  return order;
}

export async function requestReturn(
  request: Request,
  cookies: AstroCookies,
  orderId: string,
  reason: string,
) {
  // RLS on returns enforces ownership via orders.profile_id = auth.uid(); serverClient carries user JWT
  const supabase = serverClient(request, cookies);
  const { error } = await supabase.from('returns').insert({ order_id: orderId, reason });
  if (error) throw error;
}

export async function reorderToCart(
  request: Request,
  cookies: AstroCookies,
  profileId: string,
  code: string,
  cartId: string,
): Promise<{ restored: number; skipped: number }> {
  const supabase = serverClient(request, cookies);

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id')
    .eq('code', code)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (orderErr) {
    console.error('[orders] reorderToCart order lookup', orderErr);
    throw orderErr;
  }
  if (!order) return { restored: 0, skipped: 0 };

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('scent_id, bundle_id, quantity')
    .eq('order_id', order.id);
  if (itemsErr) {
    console.error('[orders] reorderToCart items lookup', itemsErr);
    throw itemsErr;
  }
  if (!items?.length) return { restored: 0, skipped: 0 };

  // Pre-validate availability for scent-based items
  const scentIds = items.flatMap((it) => (it.scent_id ? [it.scent_id] : []));
  const availableScents = new Set<string>();
  if (scentIds.length) {
    const { data: scents, error: scentsErr } = await supabase
      .from('scents')
      .select('id')
      .in('id', scentIds)
      .eq('active', true)
      .gt('stock_qty', 0);
    if (scentsErr) {
      console.error('[orders] reorderToCart scents lookup', scentsErr);
      throw scentsErr;
    }
    scents?.forEach((s) => availableScents.add(s.id));
  }

  let restored = 0;
  let skipped = 0;
  for (const it of items) {
    if (it.scent_id && !availableScents.has(it.scent_id)) {
      skipped++;
      continue;
    }
    try {
      await addLine(request, cookies, cartId, {
        scent_id: it.scent_id ?? undefined,
        bundle_id: it.bundle_id ?? undefined,
        quantity: it.quantity,
      });
      restored++;
    } catch {
      skipped++;
    }
  }
  return { restored, skipped };
}
