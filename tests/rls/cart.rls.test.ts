import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;

beforeAll(async () => {
  [buyer, other] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
  ]);
});

afterAll(async () => {
  // Clean any carts left behind (FK cascade clears cart_items).
  await adminClient.from('carts').delete().in('profile_id', [buyer.id, other.id]);
  await Promise.allSettled([dropUser(buyer.id), dropUser(other.id)]);
});

describe('carts RLS', () => {
  let buyerCartId: string;
  let othersCartId: string;

  it('customer: can INSERT own cart', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data, error } = await c
      .from('carts')
      .insert({ profile_id: buyer.id })
      .select('id')
      .single();
    expect(error).toBeNull();
    buyerCartId = data!.id;
  });

  it('customer: cannot INSERT cart for another profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('carts').insert({ profile_id: other.id });
    expect(error).not.toBeNull();
  });

  it('customer: cannot SELECT another buyer cart', async () => {
    const { data: othersCart } = await adminClient
      .from('carts')
      .insert({ profile_id: other.id })
      .select('id')
      .single();
    othersCartId = othersCart!.id;
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('carts')
      .select('id')
      .eq('id', othersCartId);
    expect(data ?? []).toHaveLength(0);
  });

  it('anon: cannot SELECT authenticated carts', async () => {
    const { data } = await anonClient()
      .from('carts')
      .select('id')
      .eq('id', buyerCartId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('cart_items RLS', () => {
  let buyerCartId: string;
  let scentId: string;

  beforeAll(async () => {
    // The previous suite already created buyer + other carts; reuse buyer's
    // by fetching its id from the unique-per-profile cart.
    const { data: existing } = await adminClient
      .from('carts')
      .select('id')
      .eq('profile_id', buyer.id)
      .maybeSingle();
    if (existing) {
      buyerCartId = existing.id;
    } else {
      const { data: cart } = await adminClient
        .from('carts')
        .insert({ profile_id: buyer.id })
        .select('id')
        .single();
      buyerCartId = cart!.id;
    }
    const { data: scent } = await adminClient
      .from('scents')
      .select('id')
      .eq('active', true)
      .limit(1)
      .single();
    scentId = scent!.id;
  });

  afterAll(async () => {
    await adminClient.from('cart_items').delete().eq('cart_id', buyerCartId);
  });

  it('customer: can INSERT item in own cart', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('cart_items').insert({
      cart_id: buyerCartId,
      scent_id: scentId,
      quantity: 1,
    });
    expect(error).toBeNull();
  });

  it('customer: cannot INSERT item in another buyer cart', async () => {
    // Reuse the existing `other` cart from carts suite if present, else create one.
    let othersCartId: string;
    const { data: existing } = await adminClient
      .from('carts')
      .select('id')
      .eq('profile_id', other.id)
      .maybeSingle();
    if (existing) {
      othersCartId = existing.id;
    } else {
      const { data: created } = await adminClient
        .from('carts')
        .insert({ profile_id: other.id })
        .select('id')
        .single();
      othersCartId = created!.id;
    }
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('cart_items').insert({
      cart_id: othersCartId,
      scent_id: scentId,
      quantity: 1,
    });
    expect(error).not.toBeNull();
  });
});
