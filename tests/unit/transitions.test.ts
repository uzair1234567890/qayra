import { describe, it, expect } from 'vitest';
import { canTransition } from '../../src/lib/ops/transitions';

describe('canTransition', () => {
  it('paid → packed allowed', () => expect(canTransition('paid', 'packed')).toBe(true));
  it('paid → shipped NOT allowed (must pack first)', () =>
    expect(canTransition('paid', 'shipped')).toBe(false));
  it('packed → shipped allowed', () => expect(canTransition('packed', 'shipped')).toBe(true));
  it('shipped → delivered allowed', () => expect(canTransition('shipped', 'delivered')).toBe(true));
  it('delivered → returned allowed', () =>
    expect(canTransition('delivered', 'returned')).toBe(true));
  it('cancelled is terminal', () => expect(canTransition('cancelled', 'paid')).toBe(false));
  it('cannot move back', () => expect(canTransition('shipped', 'packed')).toBe(false));
});
