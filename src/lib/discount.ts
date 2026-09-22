import type { Database } from './supabase/types';

export type Discount = Database['public']['Tables']['discounts']['Row'];

export type DiscountEval =
  | { ok: true; code: string; discountPaise: number }
  | { ok: false; reason: 'not_yet' | 'expired' | 'limit_reached' | 'subtotal_too_low' };

// Post-fetch validation shared by apply-code (preview) and checkout
// (server-side re-validation). Fetching the discount row is left to each
// caller because the choice of client (RLS-gated serverClient vs
// service-role serviceClient) differs by call site.
export function evaluateDiscount(
  disc: Discount,
  subtotal: number,
  now: Date = new Date(),
): DiscountEval {
  if (disc.active_from && new Date(disc.active_from) > now)
    return { ok: false, reason: 'not_yet' };
  if (disc.active_until && new Date(disc.active_until) <= now)
    return { ok: false, reason: 'expired' };
  if (disc.max_uses != null && (disc.used_count ?? 0) >= disc.max_uses)
    return { ok: false, reason: 'limit_reached' };
  if (subtotal <= 0 || subtotal < (disc.min_subtotal ?? 0))
    return { ok: false, reason: 'subtotal_too_low' };

  const raw =
    disc.type === 'percent'
      ? Math.round(subtotal * (disc.value / 100))
      : disc.value;
  // Cap discount at subtotal so totals never go negative.
  return { ok: true, code: disc.code, discountPaise: Math.min(raw, subtotal) };
}
