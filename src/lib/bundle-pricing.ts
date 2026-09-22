export function itemwiseTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

export function bundleSavings(bundlePrice: number, items: { price: number; quantity: number }[]): number {
  return Math.max(0, itemwiseTotal(items) - bundlePrice);
}
