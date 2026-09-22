import type { AstroCookies } from 'astro';
import { serviceClient } from './supabase/service';
import { getSession } from './auth/session';

export interface CartLine {
  id: string;
  cart_id: string;
  scent_id: string | null;
  bundle_id: string | null;
  quantity: number;
  name: string;
  price: number; // paise
  stock_qty: number | null; // null for bundles
  image_url: string | null;
}

export async function getOrCreateCart(
  request: Request,
  cookies: AstroCookies,
  anonToken: string,
): Promise<string> {
  const svc = serviceClient();
  const session = await getSession(request, cookies);

  if (session) {
    const ins = await svc
      .from('carts')
      .insert({ profile_id: session.userId })
      .select('id')
      .single();

    if (!ins.error && ins.data) return ins.data.id;

    // Conflict (23505) → fetch the already-existing cart
    if (ins.error?.code === '23505') {
      const { data: existing, error } = await svc
        .from('carts')
        .select('id')
        .eq('profile_id', session.userId)
        .single();
      if (error || !existing) throw new Error(`Cart lookup failed: ${error?.message}`);
      return existing.id;
    }

    throw new Error(`Cart creation failed: ${ins.error.message}`);
  }

  const ins = await svc
    .from('carts')
    .insert({ anon_token: anonToken })
    .select('id')
    .single();

  if (!ins.error && ins.data) return ins.data.id;

  if (ins.error?.code === '23505') {
    const { data: existing, error } = await svc
      .from('carts')
      .select('id')
      .eq('anon_token', anonToken)
      .single();
    if (error || !existing) throw new Error(`Cart lookup failed: ${error?.message}`);
    return existing.id;
  }

  throw new Error(`Cart creation failed: ${ins.error?.message}`);
}

export async function getCartLines(
  request: Request,
  cookies: AstroCookies,
  cartId: string,
): Promise<CartLine[]> {
  const svc = serviceClient();
  const { data: items, error } = await svc
    .from('cart_items')
    .select(
      'id, cart_id, scent_id, bundle_id, quantity, scent:scents(name, stock_qty, image_urls, products(base_price)), bundle:bundles(name, image_urls, price)',
    )
    .eq('cart_id', cartId);

  if (error) throw new Error(`Failed to load cart lines: ${error.message}`);

  return (items ?? [])
    .filter((row) => {
      if (row.scent_id && !row.scent) return false;
      if (row.bundle_id && !row.bundle) return false;
      return true;
    })
    .map((row) => {
      if (row.scent_id) {
        const s = row.scent as { name: string; stock_qty: number; image_urls: string[] | null; products: { base_price: number } };
        return {
          id: row.id,
          cart_id: row.cart_id,
          scent_id: row.scent_id,
          bundle_id: null,
          quantity: row.quantity,
          name: s.name,
          price: s.products.base_price,
          stock_qty: s.stock_qty,
          image_url: s.image_urls?.[0] ?? null,
        };
      }
      const b = row.bundle as { name: string; image_urls: string[] | null; price: number };
      return {
        id: row.id,
        cart_id: row.cart_id,
        scent_id: null,
        bundle_id: row.bundle_id,
        quantity: row.quantity,
        name: b.name,
        price: b.price,
        stock_qty: null,
        image_url: b.image_urls?.[0] ?? null,
      };
    });
}

export async function addLine(
  request: Request,
  cookies: AstroCookies,
  cartId: string,
  opts: { scent_id?: string; bundle_id?: string; quantity?: number },
): Promise<void> {
  const qty = opts.quantity ?? 1;
  const svc = serviceClient();
  const { error } = await svc.rpc('upsert_cart_item', {
    p_cart_id: cartId,
    p_scent_id: opts.scent_id ?? null,
    p_bundle_id: opts.bundle_id ?? null,
    p_quantity: qty,
  });
  if (error) throw new Error(`Failed to add cart item: ${error.message}`);
}

export async function updateQty(
  request: Request,
  cookies: AstroCookies,
  cartId: string,
  lineId: string,
  quantity: number,
): Promise<void> {
  const svc = serviceClient();
  if (quantity <= 0) {
    const { error } = await svc
      .from('cart_items')
      .delete()
      .eq('id', lineId)
      .eq('cart_id', cartId);
    if (error) throw new Error(`Failed to remove cart item: ${error.message}`);
  } else {
    const { error } = await svc
      .from('cart_items')
      .update({ quantity })
      .eq('id', lineId)
      .eq('cart_id', cartId);
    if (error) throw new Error(`Failed to update cart item: ${error.message}`);
  }
}

export async function removeLine(
  request: Request,
  cookies: AstroCookies,
  cartId: string,
  lineId: string,
): Promise<void> {
  const svc = serviceClient();
  const { error } = await svc
    .from('cart_items')
    .delete()
    .eq('id', lineId)
    .eq('cart_id', cartId);
  if (error) throw new Error(`Failed to remove cart item: ${error.message}`);
}

export async function getCartLineCount(
  request: Request,
  cookies: AstroCookies,
  anonToken: string,
): Promise<number> {
  const svc = serviceClient();
  const session = await getSession(request, cookies);

  const { data: cart } = session
    ? await svc.from('carts').select('id').eq('profile_id', session.userId).maybeSingle()
    : await svc.from('carts').select('id').eq('anon_token', anonToken).maybeSingle();

  if (!cart) return 0;

  const { data: items } = await svc.from('cart_items').select('quantity').eq('cart_id', cart.id);
  return (items ?? []).reduce<number>((s, i) => s + i.quantity, 0);
}

export async function mergeOnSignIn(
  anonToken: string,
  profileId: string,
): Promise<void> {
  const svc = serviceClient();
  const { data: anonCart } = await svc
    .from('carts')
    .select('id')
    .eq('anon_token', anonToken)
    .maybeSingle();

  if (!anonCart) return;

  const { data: profileCart } = await svc
    .from('carts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!profileCart) {
    await svc.from('carts').update({ profile_id: profileId, anon_token: null }).eq('id', anonCart.id);
    return;
  }

  const { data: items } = await svc
    .from('cart_items')
    .select('scent_id, bundle_id, quantity')
    .eq('cart_id', anonCart.id);

  for (const item of items ?? []) {
    const { error } = await svc.rpc('upsert_cart_item', {
      p_cart_id: profileCart.id,
      p_scent_id: item.scent_id ?? null,
      p_bundle_id: item.bundle_id ?? null,
      p_quantity: item.quantity,
    });
    if (error) console.error('mergeOnSignIn upsert_cart_item', error);
  }

  await svc.from('carts').delete().eq('id', anonCart.id);
}

export async function emptyCart(
  request: Request,
  cookies: AstroCookies,
  anonToken: string,
): Promise<void> {
  const cartId = await getOrCreateCart(request, cookies, anonToken);
  const svc = serviceClient();
  await svc.from('cart_items').delete().eq('cart_id', cartId);
}

export async function emptyCartByProfileId(profileId: string): Promise<void> {
  const svc = serviceClient();
  const { data: cart } = await svc
    .from('carts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (!cart) return;
  await svc.from('cart_items').delete().eq('cart_id', cart.id);
}
