export const ROLES = ['customer', 'operations', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  customer: 1,
  operations: 2,
  admin: 3,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function requiresAtLeast(have: Role, need: Role): boolean {
  return RANK[have] >= RANK[need];
}
