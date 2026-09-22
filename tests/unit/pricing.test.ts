import { describe, it, expect } from 'vitest';
import { computeTotals } from '../../src/lib/pricing';

describe('computeTotals', () => {
  it('free shipping at or above ₹499 prepaid', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 2 }],
      paymentMethod: 'prepaid',
      discountPaise: 0,
    });
    expect(t.subtotal).toBe(69800);
    expect(t.shipping).toBe(0);
    expect(t.codSurcharge).toBe(0);
    expect(t.total).toBe(69800);
  });

  it('₹50 shipping below threshold', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 1 }],
      paymentMethod: 'prepaid',
      discountPaise: 0,
    });
    expect(t.shipping).toBe(5000);
    expect(t.total).toBe(39900);
  });

  it('COD adds ₹50 surcharge', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 2 }],
      paymentMethod: 'cod',
      discountPaise: 0,
    });
    expect(t.codSurcharge).toBe(5000);
    expect(t.total).toBe(74800);
  });

  it('subtracts discount, never below 0', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 1 }],
      paymentMethod: 'prepaid',
      discountPaise: 100000,
    });
    expect(t.total).toBe(0);
  });

  it('COD + above threshold: free shipping, surcharge still applies', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 2 }],
      paymentMethod: 'cod',
      discountPaise: 0,
    });
    expect(t.shipping).toBe(0);
    expect(t.codSurcharge).toBe(5000);
    expect(t.total).toBe(74800);
  });

  it('empty cart returns all zeros', () => {
    const t = computeTotals({ lines: [], paymentMethod: 'prepaid', discountPaise: 0 });
    expect(t.subtotal).toBe(0);
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(0);
  });

  it('100% discount with COD: no shipping, COD surcharge still applies', () => {
    const t = computeTotals({
      lines: [{ price: 34900, quantity: 1 }],
      paymentMethod: 'cod',
      discountPaise: 34900,
    });
    expect(t.subtotal).toBe(34900);
    expect(t.discount).toBe(34900);
    expect(t.shipping).toBe(0);
    expect(t.codSurcharge).toBe(5000);
    expect(t.total).toBe(5000);
  });
});
