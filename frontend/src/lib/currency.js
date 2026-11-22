const CURRENCY_PREFIX = {
  PKR: 'Rs',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
};

export function formatMoney(amount, currency = 'PKR') {
  const prefix = CURRENCY_PREFIX[currency] ?? currency ?? 'Rs';
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return prefix.length === 1 ? `${prefix}${formatted}` : `${prefix} ${formatted}`;
}
