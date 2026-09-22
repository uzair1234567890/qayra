export interface PricingInput {
  lines: { price: number; quantity: number }[];
  paymentMethod: 'prepaid' | 'cod';
  discountPaise: number;
  freeShippingPaise?: number;
  flatShippingPaise?: number;
  codSurchargePaise?: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  shipping: number;
  codSurcharge: number;
  total: number;
}

export const FREE_SHIPPING_THRESHOLD = 49900; // ₹499 in paise
const FLAT_SHIPPING = 5000;                   // ₹50 in paise
export const COD_SURCHARGE = 5000;            // ₹50 in paise

export function computeTotals(input: PricingInput): PricingResult {
  const freeShip = input.freeShippingPaise ?? FREE_SHIPPING_THRESHOLD;
  const flatShip = input.flatShippingPaise ?? FLAT_SHIPPING;
  const codSurcharge = input.codSurchargePaise ?? COD_SURCHARGE;
  const subtotal = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.min(input.discountPaise, subtotal);
  const afterDiscount = subtotal - discount;
  // Threshold applies to post-discount amount: a discounted order earns free shipping
  // only if the customer actually pays ≥ freeShip.
  const shipping = afterDiscount >= freeShip ? 0 : afterDiscount === 0 ? 0 : flatShip;
  const codSurchargeAmt = input.paymentMethod === 'cod' ? codSurcharge : 0;
  return {
    subtotal,
    discount,
    shipping,
    codSurcharge: codSurchargeAmt,
    total: Math.max(0, afterDiscount + shipping + codSurchargeAmt),
  };
}
