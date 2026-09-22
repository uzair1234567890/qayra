import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let ops: TestUser;
let adminUser: TestUser;
const suffix = Date.now();

beforeAll(async () => {
  [buyer, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('products RLS', () => {
  it('anon: can SELECT active products', async () => {
    const { data, error } = await anonClient()
      .from('products')
      .select('id, status')
      .eq('status', 'active')
      .limit(5);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT product', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('products').insert({
      slug: `qa-rls-${suffix}`,
      name: 'qa',
      base_price: 100,
      status: 'active',
    });
    expect(error).not.toBeNull();
  });

  it('ops: cannot INSERT product', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c.from('products').insert({
      slug: `qa-ops-${suffix}`,
      name: 'qa',
      base_price: 100,
      status: 'active',
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT product', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const slug = `qa-admin-${suffix}`;
    const { error } = await c.from('products').insert({
      slug,
      name: 'qa',
      base_price: 100,
      status: 'active',
    });
    expect(error).toBeNull();
    await adminClient.from('products').delete().eq('slug', slug);
  });
});

describe('scents RLS', () => {
  it('anon: can SELECT active scents', async () => {
    const { data } = await anonClient()
      .from('scents')
      .select('id')
      .eq('active', true)
      .limit(5);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot UPDATE stock', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data: any_scent } = await adminClient
      .from('scents')
      .select('id, stock_qty')
      .limit(1)
      .single();
    const original = any_scent!.stock_qty;
    await c
      .from('scents')
      .update({ stock_qty: 99999 })
      .eq('id', any_scent!.id);
    const { data: after } = await adminClient
      .from('scents')
      .select('stock_qty')
      .eq('id', any_scent!.id)
      .single();
    expect(after!.stock_qty).toBe(original);
  });

  it('ops: cannot UPDATE stock (admin-only writes; ops page is read-only)', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data: any_scent } = await adminClient
      .from('scents')
      .select('id, stock_qty')
      .limit(1)
      .single();
    const original = any_scent!.stock_qty;
    await c
      .from('scents')
      .update({ stock_qty: 88888 })
      .eq('id', any_scent!.id);
    const { data: after } = await adminClient
      .from('scents')
      .select('stock_qty')
      .eq('id', any_scent!.id)
      .single();
    expect(after!.stock_qty).toBe(original);
  });
});

describe('bundles + bundle_items RLS', () => {
  it('anon: can SELECT active bundles', async () => {
    const { data } = await anonClient()
      .from('bundles')
      .select('id')
      .eq('status', 'active');
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('anon: can SELECT bundle_items (read-through for PDP)', async () => {
    const { data } = await anonClient().from('bundle_items').select('bundle_id').limit(1);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT bundle', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('bundles').insert({
      slug: `qa-bundle-${suffix}`,
      name: 'qa',
      price: 100,
      status: 'active',
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT bundle', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const slug = `qa-admin-bundle-${suffix}`;
    const { error } = await c.from('bundles').insert({
      slug,
      name: 'qa',
      price: 100,
      status: 'active',
    });
    expect(error).toBeNull();
    await adminClient.from('bundles').delete().eq('slug', slug);
  });
});
