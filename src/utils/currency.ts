/**
 * Consistent Currency and Monetary Formatting Utility for Portabox
 *
 * Requirements:
 * - "450.5 -> 450.50 format make sure this is formatted across the platform"
 * - Whenever an amount has fractional cents/decimals, it must always display with 2 decimal places (e.g. 450.5 -> 450.50).
 * - Full ledger and financial tables show standard 2 decimal places.
 */

/**
 * Formats a monetary number into Australian display:
 * If it has cents (fractional part), guarantees 2 decimal places (e.g. 450.5 -> "450.50").
 * If whole number and forceTwoDecimals is true: "450.00".
 * If whole number and forceTwoDecimals is false: "450".
 */
export function formatMoney(
  amount: number | string | undefined | null,
  forceTwoDecimals: boolean = false
): string {
  if (amount === undefined || amount === null || amount === '') {
    return forceTwoDecimals ? '0.00' : '0';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return forceTwoDecimals ? '0.00' : '0';
  }

  if (forceTwoDecimals || num % 1 !== 0) {
    return num.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return num.toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Returns formatted currency with dollar sign prefix:
 * e.g. formatCurrency(450.5) -> "$450.50"
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  forceTwoDecimals: boolean = false
): string {
  return `$${formatMoney(amount, forceTwoDecimals)}`;
}

/**
 * Formats raw number to string: 450.5 -> "450.50", 450 -> "450"
 */
export function formatAudNumber(val: number): string {
  if (isNaN(val)) return '0';
  if (val % 1 !== 0) {
    return val.toFixed(2);
  }
  return val.toString();
}
