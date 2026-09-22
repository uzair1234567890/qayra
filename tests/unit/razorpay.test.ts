import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyRzpHmac, verifyRzpWebhook } from '../../src/lib/razorpay';

const SECRET = 'test_secret_value';

describe('verifyRzpHmac', () => {
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';
  const validSig = crypto
    .createHmac('sha256', SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  it('returns true for a matching signature', () => {
    expect(verifyRzpHmac(orderId, paymentId, validSig, SECRET)).toBe(true);
  });

  it('returns false for a tampered signature', () => {
    const tampered = validSig.slice(0, -2) + '00';
    expect(verifyRzpHmac(orderId, paymentId, tampered, SECRET)).toBe(false);
  });

  it('returns false for a signature of different length', () => {
    expect(verifyRzpHmac(orderId, paymentId, 'short', SECRET)).toBe(false);
  });

  it('returns false if the wrong secret is used', () => {
    expect(verifyRzpHmac(orderId, paymentId, validSig, 'wrong_secret')).toBe(false);
  });

  it('returns false if the payment id is swapped', () => {
    expect(verifyRzpHmac(orderId, 'pay_OTHER', validSig, SECRET)).toBe(false);
  });

  it('returns false if the order id is swapped (catches param-order regression)', () => {
    expect(verifyRzpHmac('order_OTHER', paymentId, validSig, SECRET)).toBe(false);
  });
});

describe('verifyRzpWebhook', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_XYZ' } } } });
  const validSig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

  it('returns true for a matching signature over the raw body', () => {
    expect(verifyRzpWebhook(body, validSig, SECRET)).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const tamperedBody = body.replace('pay_XYZ', 'pay_ATK');
    expect(verifyRzpWebhook(tamperedBody, validSig, SECRET)).toBe(false);
  });

  it('returns false for a tampered signature', () => {
    expect(verifyRzpWebhook(body, validSig.slice(0, -2) + '00', SECRET)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyRzpWebhook(body, '', SECRET)).toBe(false);
  });
});
