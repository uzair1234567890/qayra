import { describe, it, expect } from 'vitest';
import { scrubPii, scrubTransaction, shouldInitSentry } from '../../../src/lib/sentry';

describe('scrubPii', () => {
  it('removes PII keys from request.data', () => {
    const event: any = {
      request: {
        data: {
          email: 'a@b.com',
          phone: '9999999999',
          pincode: '400001',
          name: 'Alice',
          line1: '1 Test',
          line2: 'Apt 2',
          address: { city: 'Mumbai' },
          quantity: 1,
        },
      },
    };
    const out = scrubPii(event) as any;
    expect(out.request.data.email).toBeUndefined();
    expect(out.request.data.phone).toBeUndefined();
    expect(out.request.data.pincode).toBeUndefined();
    expect(out.request.data.name).toBeUndefined();
    expect(out.request.data.line1).toBeUndefined();
    expect(out.request.data.line2).toBeUndefined();
    expect(out.request.data.address).toBeUndefined();
    expect(out.request.data.quantity).toBe(1);
  });

  it('removes PII keys from contexts', () => {
    const event: any = {
      contexts: { state: { email: 'a@b.com', mode: 'cod' } },
    };
    const out = scrubPii(event) as any;
    expect(out.contexts.state.email).toBeUndefined();
    expect(out.contexts.state.mode).toBe('cod');
  });

  it('removes PII keys from breadcrumb data', () => {
    const event: any = {
      breadcrumbs: [
        { category: 'http', data: { email: 'a@b.com', url: '/x' } },
      ],
    };
    const out = scrubPii(event) as any;
    expect(out.breadcrumbs[0].data.email).toBeUndefined();
    expect(out.breadcrumbs[0].data.url).toBe('/x');
  });
});

describe('scrubTransaction', () => {
  it('redacts email/phone/otp query params from request.url', () => {
    const txn: any = {
      request: { url: '/checkout?email=a%40b.com&phone=9999&keep=ok' },
    };
    const out = scrubTransaction(txn) as any;
    expect(out.request.url).toContain('email=REDACTED');
    expect(out.request.url).toContain('phone=REDACTED');
    expect(out.request.url).toContain('keep=ok');
  });
});

describe('shouldInitSentry', () => {
  it('returns false when DSN is undefined', () => {
    expect(shouldInitSentry(undefined)).toBe(false);
  });
  it('returns false when DSN is empty', () => {
    expect(shouldInitSentry('')).toBe(false);
  });
  it('returns false when DSN starts with placeholder', () => {
    expect(shouldInitSentry('placeholder-dsn')).toBe(false);
  });
  it('returns true for a real-looking DSN', () => {
    expect(shouldInitSentry('https://abc@o12345.ingest.sentry.io/12345')).toBe(
      true,
    );
  });
});
