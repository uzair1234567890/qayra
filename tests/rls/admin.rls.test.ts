import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient, adminClient } from './helpers';

let buyer: TestUser;
let ops: TestUser;
let adminUser: TestUser;

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

describe('store_settings RLS', () => {
  it('anon: can SELECT (public settings drive the storefront)', async () => {
    const { data } = await anonClient()
      .from('store_settings')
      .select('key')
      .limit(5);
    expect(data).not.toBeNull();
  });

  it('customer: cannot UPSERT store_settings', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { error } = await c
      .from('store_settings')
      .upsert({ key: 'qa-rls-attempt', value: 'pwned' });
    expect(error).not.toBeNull();
  });

  it('ops: cannot UPSERT store_settings', async () => {
    const c = await signedInAs(ops.email, ops.password);
    const { error } = await c
      .from('store_settings')
      .upsert({ key: 'qa-rls-attempt-ops', value: 'pwned' });
    expect(error).not.toBeNull();
  });

  it('admin: can UPSERT store_settings', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const key = `qa-rls-${Date.now()}`;
    const { error } = await c
      .from('store_settings')
      .upsert({ key, value: 'ok' });
    expect(error).toBeNull();
    await adminClient.from('store_settings').delete().eq('key', key);
  });
});

describe('audit_log RLS', () => {
  it('anon: cannot SELECT audit_log', async () => {
    const { data } = await anonClient().from('audit_log').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot SELECT audit_log', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('audit_log').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('admin: can SELECT audit_log', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('audit_log').select('id').limit(5);
    expect(error).toBeNull();
  });

  it('no role: can INSERT audit_log directly (writes are server-only)', async () => {
    for (const u of [buyer, ops, adminUser]) {
      const c = await signedInAs(u.email, u.password);
      const { error } = await c
        .from('audit_log')
        .insert({
          actor_id: u.id,
          action: 'rls.bypass',
          target_table: 'rls',
        });
      expect(error).not.toBeNull();
    }
  });
});
