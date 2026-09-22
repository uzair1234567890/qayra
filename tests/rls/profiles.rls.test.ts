import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let other: TestUser;
let ops: TestUser;
let adminUser: TestUser;

beforeAll(async () => {
  [buyer, other, ops, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('customer'),
    makeUser('operations'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([
    dropUser(buyer.id),
    dropUser(other.id),
    dropUser(ops.id),
    dropUser(adminUser.id),
  ]);
});

describe('profiles RLS', () => {
  it('anon: SELECT returns empty', async () => {
    const { data } = await anonClient().from('profiles').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: sees only own profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('profiles').select('id').limit(10);
    expect(data?.map((r) => r.id)).toEqual([buyer.id]);
  });

  it('customer: cannot UPDATE another customer profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('profiles')
      .update({ full_name: 'HACKED' })
      .eq('id', other.id);
    const { data } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', other.id)
      .single();
    expect(data!.full_name).not.toBe('HACKED');
  });

  it('customer: cannot change own role', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    await c
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', buyer.id);
    const { data } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', buyer.id)
      .single();
    expect(data!.role).toBe('customer');
  });

  it('ops: sees all profiles', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data } = await c.from('profiles').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('admin: sees all profiles', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { data } = await c.from('profiles').select('id');
    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

describe('addresses RLS', () => {
  let addrId: string;

  beforeAll(async () => {
    const { data } = await adminClient
      .from('addresses')
      .insert({
        profile_id: buyer.id,
        name: 'QA Buyer',
        phone: '9999999999',
        line1: '1 Test',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        is_default: true,
      })
      .select('id')
      .single();
    addrId = data!.id;
  });

  afterAll(async () => {
    await adminClient.from('addresses').delete().eq('id', addrId);
  });

  it('anon: SELECT returns empty', async () => {
    const { data } = await anonClient().from('addresses').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: sees only own address', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('addresses').select('id, profile_id');
    expect((data ?? []).every((r) => r.profile_id === buyer.id)).toBe(true);
  });

  it('customer: cannot see another customer address', async () => {
    const c = await signedInAs(other.email, other.password);
    const { data } = await c
      .from('addresses')
      .select('id')
      .eq('id', addrId);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot INSERT address for another profile', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c.from('addresses').insert({
      profile_id: other.id,
      name: 'Spoof',
      phone: '0000000000',
      line1: 'x',
      city: 'x',
      state: 'x',
      pincode: '000000',
    });
    expect(error).not.toBeNull();
  });

  it('ops: sees all addresses', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { data } = await c.from('addresses').select('id');
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
