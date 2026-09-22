export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const opts: Intl.NumberFormatOptions = Number.isInteger(rupees)
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `₹${rupees.toLocaleString('en-IN', opts)}`;
}
