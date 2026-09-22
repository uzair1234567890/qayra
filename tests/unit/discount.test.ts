import { describe, it, expect } from 'vitest';
import { evaluateDiscount, type Discount } from '../../src/lib/discount';

function disc(overrides: Partial<Discount> = {}): Discount {
  return {
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    min_subtotal: 0,
    max_uses: null,
    used_count: 0,
    active_from: null,
    active_until: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Discount;
}

describe('evaluateDiscount', () => {
  it('applies a 10% discount to a positive subtotal', () => {
    const r = evaluateDiscount(disc({ type: 'percent', value: 10 }), 10000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.discountPaise).toBe(1000);
      expect(r.code).toBe('WELCOME10');
    }
  });

  it('applies a fixed-paise discount', () => {
    const r = evaluateDiscount(disc({ type: 'fixed', value: 5000 }), 20000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discountPaise).toBe(5000);
  });

  it('caps fixed discount at subtotal so total never goes negative', () => {
    const r = evaluateDiscount(disc({ type: 'fixed', value: 100000 }), 30000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discountPaise).toBe(30000);
  });

  it('rejects when subtotal is zero', () => {
    const r = evaluateDiscount(disc(), 0);
    expect(r).toEqual({ ok: false, reason: 'subtotal_too_low' });
  });

  it('rejects when subtotal is below min_subtotal', () => {
    const r = evaluateDiscount(disc({ min_subtotal: 50000 }), 30000);
    expect(r).toEqual({ ok: false, reason: 'subtotal_too_low' });
  });

  it('rejects when not yet active', () => {
    const future = new Date('2026-12-01T00:00:00Z');
    const r = evaluateDiscount(
      disc({ active_from: future.toISOString() }),
      10000,
      new Date('2026-06-01T00:00:00Z'),
    );
    expect(r).toEqual({ ok: false, reason: 'not_yet' });
  });

  it('rejects when expired', () => {
    const past = new Date('2026-01-01T00:00:00Z');
    const r = evaluateDiscount(
      disc({ active_until: past.toISOString() }),
      10000,
      new Date('2026-06-01T00:00:00Z'),
    );
    expect(r).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects when usage limit reached', () => {
    const r = evaluateDiscount(disc({ max_uses: 5, used_count: 5 }), 10000);
    expect(r).toEqual({ ok: false, reason: 'limit_reached' });
  });

  it('accepts when used_count is below max_uses', () => {
    const r = evaluateDiscount(disc({ max_uses: 5, used_count: 4 }), 10000);
    expect(r.ok).toBe(true);
  });
});
