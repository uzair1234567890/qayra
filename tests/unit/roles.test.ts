import { describe, it, expect } from 'vitest';
import { isRole, requiresAtLeast } from '../../src/lib/auth/roles';

describe('isRole', () => {
  it('accepts customer, operations, admin', () => {
    expect(isRole('customer')).toBe(true);
    expect(isRole('operations')).toBe(true);
    expect(isRole('admin')).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(isRole('superuser')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole('')).toBe(false);
  });
});

describe('requiresAtLeast', () => {
  it('customer satisfies customer', () => {
    expect(requiresAtLeast('customer', 'customer')).toBe(true);
  });
  it('admin satisfies operations', () => {
    expect(requiresAtLeast('admin', 'operations')).toBe(true);
  });
  it('operations does NOT satisfy admin', () => {
    expect(requiresAtLeast('operations', 'admin')).toBe(false);
  });
  it('customer does NOT satisfy operations', () => {
    expect(requiresAtLeast('customer', 'operations')).toBe(false);
  });
});
