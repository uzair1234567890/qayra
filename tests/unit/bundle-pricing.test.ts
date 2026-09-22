import { describe, it, expect } from 'vitest';
import { bundleSavings, itemwiseTotal } from '../../src/lib/bundle-pricing';

describe('itemwiseTotal', () => {
  it('sums price × quantity for each item', () => {
    expect(itemwiseTotal([{ price: 34900, quantity: 2 }, { price: 10000, quantity: 1 }])).toBe(79800);
  });
  it('returns 0 for empty array', () => {
    expect(itemwiseTotal([])).toBe(0);
  });
});

describe('bundleSavings', () => {
  it('returns 0 if bundle priced at or above sum of items', () => {
    expect(bundleSavings(140000, [
      { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 },
      { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 },
    ])).toBe(0);
  });
  it('returns positive saving when bundle priced below sum', () => {
    expect(bundleSavings(99900, [
      { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 },
      { price: 34900, quantity: 1 }, { price: 34900, quantity: 1 },
    ])).toBe(39700);
  });
});
