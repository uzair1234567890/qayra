import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeUser, dropUser, type TestUser } from '../fixtures/users';
import { signedInAs, anonClient } from './helpers';

let buyer: TestUser;
let adminUser: TestUser;

beforeAll(async () => {
  [buyer, adminUser] = await Promise.all([
    makeUser('customer'),
    makeUser('admin'),
  ]);
});

afterAll(async () => {
  await Promise.allSettled([dropUser(buyer.id), dropUser(adminUser.id)]);
});

describe('contact_messages RLS', () => {
  it('anon: can INSERT contact message (public contact form)', async () => {
    const { error } = await anonClient().from('contact_messages').insert({
      name: 'QA Anon',
      email: 'qa@example.com',
      message: 'hello',
    });
    expect(error).toBeNull();
  });

  it('anon: cannot SELECT contact messages', async () => {
    const { data } = await anonClient()
      .from('contact_messages')
      .select('id')
      .limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('customer: cannot SELECT contact messages', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c.from('contact_messages').select('id').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('admin: can SELECT contact messages', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c.from('contact_messages').select('id').limit(5);
    expect(error).toBeNull();
  });
});

describe('razorpay_webhook_events RLS', () => {
  it('anon: cannot SELECT webhook events', async () => {
    const { data } = await anonClient()
      .from('razorpay_webhook_events')
      .select('id')
      .limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('anon: cannot INSERT webhook event (only server-role)', async () => {
    const { error } = await anonClient()
      .from('razorpay_webhook_events')
      .insert({ id: `qa-${Date.now()}` });
    expect(error).not.toBeNull();
  });

  it('customer: cannot SELECT webhook events', async () => {
    const c = await signedInAs(buyer.email, buyer.password);
    const { data } = await c
      .from('razorpay_webhook_events')
      .select('id')
      .limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('admin: can SELECT webhook events', async () => {
    const c = await signedInAs(adminUser.email, adminUser.password);
    const { error } = await c
      .from('razorpay_webhook_events')
      .select('id')
      .limit(5);
    expect(error).toBeNull();
  });
});
