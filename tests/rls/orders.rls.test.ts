import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;
let ops: TestUser;
let adminUser: TestUser;
let orderId: string;
let othersOrderId: string;
let scentId: string;
const RUN_TAG = `QA-RLS-${Date.now()}`;
const ADDR = {
  name: 'QA',
  phone: '0000000000',
  line1: 'x',
  city: 'x',
  state: 'x',
  pincode: '000000',
};

beforeAll(async () => {
  [buyer, other, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
  const { data: scent } = await adminClient
    .from('scents')
    .select('id')
    .eq('active', true)
    .limit(1)
    .single();
  scentId = scent!.id;
  const { data: o1 } = await adminClient
    .from('orders')
    .insert({
      profile_id: buyer.id,
      code: `${RUN_TAG}-A`,
      status: 'pending',
      payment_method: 'cod',
      subtotal: 100,
      shipping_total: 0,
      total: 100,
      address_snapshot: ADDR,
    })
    .select('id')
    .single();
  orderId = o1!.id;
  const { data: o2 } = await adminClient
    .from('orders')
    .insert({
      profile_id: other.id,
      code: `${RUN_TAG}-B`,
      status: 'pending',
      payment_method: 'cod',
      subtotal: 100,
      shipping_total: 0,
      total: 100,
      address_snapshot: ADDR,
    })
    .select('id')
    .single();
  othersOrderId = o2!.id;
});

afterAll(async () => {
  const { data: tagged } = await adminClient
    .from('orders')
    .select('id')
    .like('code', `${RUN_TAG}%`);
  const ids = (tagged ?? []).map((r) => r.id);
  if (ids.length) {
    await adminClient.from('shipments').delete().in('order_id', ids);
    await adminClient.from('order_items').delete().in('order_id', ids);
    await adminClient.from('order_status_history').delete().in('order_id', ids);
    await adminClient.from('returns').delete().in('order_id', ids);
    await adminClient.from('orders').delete().in('id', ids);
  }
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(other.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('orders RLS', () => {
  it('anon: SELECT returns empty', async () => {
    const { data } = await anonClient().from('orders').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: sees only own orders', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('orders').select('id, profile_id');
    expect((data ?? []).every((r) => r.profile_id === buyer.id)).toBe(true);
  });

  it('customer: cannot see another buyer order by id', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('orders')
      .select('id')
      .eq('id', othersOrderId);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot INSERT order for another profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('orders').insert({
      profile_id: other.id,
      code: `${RUN_TAG}-FORGE`,
      status: 'pending',
      payment_method: 'cod',
      subtotal: 100,
      shipping_total: 0,
      total: 100,
      address_snapshot: ADDR,
    });
    expect(error).not.toBeNull();
  });

  it('customer: cannot UPDATE status', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);
    const { data: after } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    expect(after!.status).toBe('pending');
  });

  it('ops: sees all orders', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data } = await c.from('orders').select('id').limit(10);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('ops: can UPDATE status', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('orders')
      .update({ status: 'packed' })
      .eq('id', orderId);
    expect(error).toBeNull();
    const { data: after } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    expect(after!.status).toBe('packed');
  });

  it('admin: sees all orders', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { data } = await c.from('orders').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('no role: can DELETE order', async () => {
    for (const u of [buyer, ops, adminUser]) {
      const c = await signedInAs(u.email, u.password);
      await c.from('orders').delete().eq('id', orderId);
    }
    const { data: still } = await adminClient
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();
    expect(still).not.toBeNull();
  });
});

describe('order_items RLS', () => {
  let itemId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('order_items')
      .insert({
        order_id: orderId,
        scent_id: scentId,
        name_snapshot: 'QA Scent',
        price_snapshot: 100,
        quantity: 1,
      })
      .select('id')
      .single();
    itemId = data!.id;
  });

  it('customer: sees own order items', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('order_items')
      .select('id')
      .eq('id', itemId);
    expect((data ?? []).length).toBe(1);
  });

  it('customer: cannot see other order items', async () => {
    const c = await signedInAs(other.email, other.password);
    const { data } = await c
      .from('order_items')
      .select('id')
      .eq('id', itemId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('shipments RLS', () => {
  beforeAll(async () => {
    await adminClient.from('shipments').insert({
      order_id: orderId,
      awb_number: `AWB-${Date.now()}`,
      courier_name: 'test',
    });
  });

  it('customer: sees own shipment', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('shipments')
      .select('order_id')
      .eq('order_id', orderId);
    expect((data ?? []).length).toBe(1);
  });

  it('customer: cannot UPDATE shipment', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('shipments')
      .update({ awb_number: 'HACK' })
      .eq('order_id', orderId);
    const { data: after } = await adminClient
      .from('shipments')
      .select('awb_number')
      .eq('order_id', orderId)
      .single();
    expect(after!.awb_number).not.toBe('HACK');
  });

  it('ops: can UPDATE shipment', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const newAwb = `AWB-OPS-${Date.now()}`;
    const { error } = await c
      .from('shipments')
      .update({ awb_number: newAwb })
      .eq('order_id', orderId);
    expect(error).toBeNull();
  });
});

describe('order_status_history RLS', () => {
  it('customer: sees only own history rows', async () => {
    await adminClient
      .from('order_status_history')
      .insert({ order_id: orderId, status: 'pending' });
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('order_status_history')
      .select('id, order_id');
    expect((data ?? []).every((r) => r.order_id === orderId)).toBe(true);
  });

  it('customer: cannot INSERT history', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c
      .from('order_status_history')
      .insert({ order_id: orderId, status: 'delivered' });
    expect(error).not.toBeNull();
  });
});

describe('returns RLS', () => {
  let returnId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('returns')
      .insert({
        order_id: orderId,
        reason: 'damaged',
        status: 'requested',
      })
      .select('id')
      .single();
    returnId = data!.id;
  });

  it('customer: can INSERT return for own order', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('returns').insert({
      order_id: orderId,
      reason: 'wrong-item',
      status: 'requested',
    });
    expect(error).toBeNull();
  });

  it('customer: cannot INSERT return for another order', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('returns').insert({
      order_id: othersOrderId,
      reason: 'wrong-item',
      status: 'requested',
    });
    expect(error).not.toBeNull();
  });

  it('ops: can UPDATE return status', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('returns')
      .update({ status: 'approved' })
      .eq('id', returnId);
    expect(error).toBeNull();
  });
});
