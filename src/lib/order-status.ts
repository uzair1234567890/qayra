// Single source of truth for orders.status values. Must stay aligned with the
// CHECK constraint in supabase/migrations/20260517000000_initial_schema.sql
// (orders.status check ('pending','paid','packed','shipped','delivered','cancelled','returned')).

export const ACTIVE_STEPS = ['paid', 'packed', 'shipped', 'delivered'] as const;
export type ActiveStep = (typeof ACTIVE_STEPS)[number];

export const TERMINAL_STATUSES = ['cancelled', 'returned'] as const;
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export type OrderStatus = 'pending' | ActiveStep | TerminalStatus;
