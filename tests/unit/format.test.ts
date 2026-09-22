import { describe, it, expect } from 'vitest';
import { formatINR } from '../../src/lib/format';

describe('formatINR', () => {
  it('formats whole rupees with en-IN grouping', () => {
    expect(formatINR(34900)).toBe('₹349');
    expect(formatINR(99900)).toBe('₹999');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(100)).toBe('₹1');
  });

  it('formats non-whole rupees with 2dp and en-IN grouping', () => {
    expect(formatINR(34950)).toBe('₹349.50');
    // Grouping was broken before — toFixed skips toLocaleString
    expect(formatINR(1234567)).toBe('₹12,345.67');
  });

  it('formats large whole amounts with en-IN lakh grouping', () => {
    // 10,00,000 = 10 lakh in Indian grouping
    expect(formatINR(100000000)).toBe('₹10,00,000');
  });
});
