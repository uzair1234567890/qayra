import { describe, it, expect } from 'vitest';
import { parseEnv } from '../../src/lib/env';

const baseEnv = {
  PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  PUBLIC_SITE_URL: 'http://localhost:4321',
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'test_secret',
  PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
};

describe('parseEnv', () => {
  it('returns a typed config when all required vars are present', () => {
    const env = parseEnv(baseEnv);
    expect(env.PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co');
    expect(env.PUBLIC_SITE_URL).toBe('http://localhost:4321');
    expect(env.RAZORPAY_KEY_ID).toBe('rzp_test_key');
  });

  it('throws if PUBLIC_SUPABASE_URL is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = { ...baseEnv, PUBLIC_SUPABASE_URL: undefined } as any;
    expect(() => parseEnv(input)).toThrow(/PUBLIC_SUPABASE_URL/);
  });

  it('throws if PUBLIC_SITE_URL is not a valid URL', () => {
    expect(() => parseEnv({ ...baseEnv, PUBLIC_SITE_URL: 'not-a-url' })).toThrow();
  });

  it('throws if RAZORPAY_KEY_ID is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = { ...baseEnv, RAZORPAY_KEY_ID: undefined } as any;
    expect(() => parseEnv(input)).toThrow(/RAZORPAY_KEY_ID/);
  });

  it('throws if RAZORPAY_WEBHOOK_SECRET is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = { ...baseEnv, RAZORPAY_WEBHOOK_SECRET: undefined } as any;
    expect(() => parseEnv(input)).toThrow(/RAZORPAY_WEBHOOK_SECRET/);
  });
});
