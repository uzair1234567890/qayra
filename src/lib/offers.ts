import { z } from 'zod';
import { supabaseAdmin } from './supabase/admin';

export interface OfferInput {
  lines: { scent_id: string | null; bundle_id: string | null; price: number; quantity: number }[];
  subtotalAfterDiscount: number;
}

export interface OfferResult {
  freeShipping: boolean;
  extraDiscount: number; // paise
  notes: string[];
}

// Discriminated union for offer rule_json. Any new rule shape must be added here;
// malformed rules silently no-op (logged) instead of dereferencing undefined fields.
const OfferRule = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('free_shipping'),
    min_subtotal: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('buy_x_get_y_pct'),
    scent_id: z.string().uuid(),
    min_qty: z.number().int().positive(),
    pct_off_extra: z.number().min(0).max(100),
  }),
]);

export async function evaluateOffers(input: OfferInput): Promise<OfferResult> {
  const { data: offers } = await supabaseAdmin
    .from('offers')
    .select('rule_json')
    .eq('active', true);
  const result: OfferResult = { freeShipping: false, extraDiscount: 0, notes: [] };
  for (const o of offers ?? []) {
    const parsed = OfferRule.safeParse(o.rule_json);
    if (!parsed.success) {
      console.error('[offers] malformed rule_json, skipping', parsed.error.issues);
      continue;
    }
    const rule = parsed.data;
    if (rule.kind === 'free_shipping' && input.subtotalAfterDiscount >= rule.min_subtotal) {
      result.freeShipping = true;
      result.notes.push('Free shipping unlocked');
    }
    if (rule.kind === 'buy_x_get_y_pct') {
      const matching = input.lines.find((l) => l.scent_id === rule.scent_id);
      if (matching && matching.quantity >= rule.min_qty) {
        const extraCount = Math.floor(matching.quantity / rule.min_qty);
        const discountPerExtra = Math.round(matching.price * (rule.pct_off_extra / 100));
        result.extraDiscount += extraCount * discountPerExtra;
        result.notes.push(`Buy-${rule.min_qty} discount applied`);
      }
    }
  }
  return result;
}
