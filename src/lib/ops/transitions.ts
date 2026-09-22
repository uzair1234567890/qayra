import type { OrderStatus } from '../order-status';

// Typed allow-list — adding a new OrderStatus forces TS to demand the
// transition entry. Function still accepts `string` so DB-derived statuses
// (typed as `string` by the generated Database types) flow through without
// each caller having to narrow first.
const allowed: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export function canTransition(from: string, to: string): boolean {
  return (allowed[from as OrderStatus] ?? []).includes(to as OrderStatus);
}
