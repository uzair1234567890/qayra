import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;
let adminUser: TestUser;
let scentId: string;
let buyerOrderId: string;
let othersOrderId: string;
let publishedReviewId: string;
let pendingReviewId: string;
const RUN_TAG = `QA-RV-${Date.now()}`;
const ADDR = {
  name: 'QA',
  phone: '0000000000',
  line1: 'x',
  city: 'x',
  state: 'x',
  pincode: '000000',
};

beforeAll(async () => {
  [buyer, other, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
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
      status: 'delivered',
      payment_method: 'cod',
      subtotal: 100,
      shipping_total: 0,
      total: 100,
      address_snapshot: ADDR,
    })
    .select('id')
    .single();
  buyerOrderId = o1!.id;

  const { data: o2 } = await adminClient
    .from('orders')
    .insert({
      profile_id: other.id,
      code: `${RUN_TAG}-B`,
      status: 'delivered',
      payment_method: 'cod',
      subtotal: 100,
      shipping_total: 0,
      total: 100,
      address_snapshot: ADDR,
    })
    .select('id')
    .single();
  othersOrderId = o2!.id;

  const { data: r1 } = await adminClient
    .from('reviews')
    .insert({
      profile_id: buyer.id,
      scent_id: scentId,
      order_id: buyerOrderId,
      rating: 5,
      body: `${RUN_TAG} published`,
      status: 'published',
    })
    .select('id')
    .single();
  publishedReviewId = r1!.id;

  const { data: r2 } = await adminClient
    .from('reviews')
    .insert({
      profile_id: other.id,
      scent_id: scentId,
      order_id: othersOrderId,
      rating: 4,
      body: `${RUN_TAG} pending`,
      status: 'pending',
    })
    .select('id')
    .single();
  pendingReviewId = r2!.id;
});

afterAll(async () => {
  await adminClient.from('reviews').delete().ilike('body', `%${RUN_TAG}%`);
  await adminClient.from('orders').delete().like('code', `${RUN_TAG}%`);
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(other.id),
    dropUser(adminUser.id),
  ]);
});

describe('reviews RLS', () => {
  it('anon: sees only published reviews', async () => {
    const { data } = await anonClient()
      .from('reviews')
      .select('id, status')
      .in('id', [publishedReviewId, pendingReviewId]);
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(publishedReviewId);
    expect(ids).not.toContain(pendingReviewId);
  });

  it('customer: sees own pending review', async () => {
    const c = await signedInAs(other.email, other.password);
    const { data } = await c
      .from('reviews')
      .select('id')
      .eq('id', pendingReviewId);
    expect((data ?? []).length).toBe(1);
  });

  it('customer: cannot see another customer pending review', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('reviews')
      .select('id')
      .eq('id', pendingReviewId);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot UPDATE status', async () => {
    const c = await signedInAs(other.email, other.password);
    await c
      .from('reviews')
      .update({ status: 'published' })
      .eq('id', pendingReviewId);
    const { data: after } = await adminClient
      .from('reviews')
      .select('status')
      .eq('id', pendingReviewId)
      .single();
    expect(after!.status).toBe('pending');
  });

  it('admin: can UPDATE status', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c
      .from('reviews')
      .update({ status: 'published' })
      .eq('id', pendingReviewId);
    expect(error).toBeNull();
  });
});
