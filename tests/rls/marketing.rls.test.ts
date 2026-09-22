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
  await adminClient.from('discounts').delete().ilike('code', `QA-RLS-%`);
  await adminClient.from('offers').delete().ilike('name', `QA RLS%`);
  await adminClient.from('banners').delete().ilike('headline', `QA RLS%`);
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('discounts RLS', () => {
  it('anon: can SELECT an active discount by code (apply-code path)', async () => {
    const code = `QA-RLS-PUB-${suffix}`;
    await adminClient.from('discounts').insert({
      code,
      type: 'percent',
      value: 10,
    });
    const { data } = await anonClient()
      .from('discounts')
      .select('code')
      .eq('code', code)
      .maybeSingle();
    expect(data?.code).toBe(code);
  });

  it('customer: cannot INSERT discount', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('discounts').insert({
      code: `QA-RLS-C-${suffix}`,
      type: 'percent',
      value: 10,
    });
    expect(error).not.toBeNull();
  });

  it('ops: cannot INSERT discount', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c.from('discounts').insert({
      code: `QA-RLS-O-${suffix}`,
      type: 'percent',
      value: 10,
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT discount', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('discounts').insert({
      code: `QA-RLS-A-${suffix}`,
      type: 'percent',
      value: 10,
    });
    expect(error).toBeNull();
  });
});

describe('offers RLS', () => {
  it('anon: can SELECT active offers (storefront evaluates them)', async () => {
    await adminClient.from('offers').insert({
      name: `QA RLS offer ${suffix}`,
      rule_json: {},
      active: true,
    });
    const { data } = await anonClient()
      .from('offers')
      .select('id')
      .eq('active', true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT offer', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('offers').insert({
      name: `QA RLS ${suffix}`,
      rule_json: {},
      active: true,
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT offer', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('offers').insert({
      name: `QA RLS admin ${suffix}`,
      rule_json: {},
      active: true,
    });
    expect(error).toBeNull();
  });
});

describe('banners RLS', () => {
  it('anon: can SELECT currently-active banners', async () => {
    await adminClient.from('banners').insert({
      headline: `QA RLS ${suffix}`,
      position: 'announcement',
    });
    const { data } = await anonClient()
      .from('banners')
      .select('id, headline')
      .ilike('headline', `QA RLS%`);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('customer: cannot INSERT banner', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('banners').insert({
      headline: `QA RLS ${suffix}`,
      position: 'announcement',
    });
    expect(error).not.toBeNull();
  });

  it('admin: can INSERT banner', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('banners').insert({
      headline: `QA RLS admin ${suffix}`,
      position: 'announcement',
    });
    expect(error).toBeNull();
  });
});
