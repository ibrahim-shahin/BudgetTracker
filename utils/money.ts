// Money is kept as a whole number of the currency's smallest unit (fils,
// cents...), so sums and comparisons are exact. 12.345 JOD is 12345.

export interface Currency {
  code: string;
  name: string;
  /** Digits after the decimal point: 3 for the dinar, 2 for most others. */
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'JOD', name: 'Jordanian dinar', decimals: 3 },
  { code: 'USD', name: 'US dollar', decimals: 2 },
  { code: 'EUR', name: 'Euro', decimals: 2 },
  { code: 'GBP', name: 'Pound sterling', decimals: 2 },
  { code: 'AED', name: 'UAE dirham', decimals: 2 },
  { code: 'SAR', name: 'Saudi riyal', decimals: 2 },
  { code: 'EGP', name: 'Egyptian pound', decimals: 2 },
  { code: 'KWD', name: 'Kuwaiti dinar', decimals: 3 },
  { code: 'QAR', name: 'Qatari riyal', decimals: 2 },
  { code: 'BHD', name: 'Bahraini dinar', decimals: 3 },
  { code: 'OMR', name: 'Omani rial', decimals: 3 },
];

export const DEFAULT_CURRENCY = 'JOD';

/** The largest amount one expense or budget can have, in whole units. */
export const MAX_WHOLE_UNITS = 999_999_999;

export function isKnownCurrency(code: unknown): code is string {
  return typeof code === 'string' && CURRENCIES.some(c => c.code === code);
}

export function currencyDecimals(code: string): number {
  return CURRENCIES.find(c => c.code === code)?.decimals ?? 2;
}

/** The largest amount in minor units for a currency with these decimals. */
export function maxMinor(decimals: number): number {
  return (MAX_WHOLE_UNITS + 1) * 10 ** decimals - 1;
}

/** True for a whole, non-negative amount no bigger than maxMinor(). */
export function isValidMinor(value: unknown, decimals: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maxMinor(decimals);
}

/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits become 0-9, the Arabic decimal
 * separator (٫) becomes a point and the Arabic thousands separator (٬) a
 * comma. Spaces, including no-break spaces, are dropped.
 */
export function normalizeNumberText(text: string): string {
  return text
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',')
    .replace(/\s/g, '');
}

export type ParseResult =
  | { ok: true; minor: number }
  | { ok: false; error: 'empty' | 'invalid' | 'too-many-decimals' | 'too-large' };

/**
 * Reads a typed or pasted amount into minor units, without rounding.
 *
 * - "12.5", ".5", "12," and "١٢٫٥" are accepted.
 * - With both "," and ".", the one that comes last is the decimal point:
 *   "1,234.50" and "1.234,50" are both 1234.50.
 * - A single "," with no "." is a decimal point ("12,5" is 12.5), which is
 *   what number keyboards type in many locales. Several commas group
 *   thousands ("1,234,567").
 * - More decimals than the currency has are refused rather than rounded,
 *   unless the extra digits are zeros ("1.500" is fine for 2 decimals).
 */
export function parseAmount(text: string, decimals: number): ParseResult {
  let s = normalizeNumberText(text);
  if (s === '') return { ok: false, error: 'empty' };

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const commas = s.split(',').length - 1;
    s = commas === 1 ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const match = /^(\d*)(?:\.(\d*))?$/.exec(s);
  if (!match || (match[1] === '' && !match[2])) return { ok: false, error: 'invalid' };

  const whole = match[1].replace(/^0+(?=\d)/, '');
  let fraction = match[2] ?? '';
  if (fraction.length > decimals) {
    if (/[^0]/.test(fraction.slice(decimals))) return { ok: false, error: 'too-many-decimals' };
    fraction = fraction.slice(0, decimals);
  }
  if (whole.length > String(MAX_WHOLE_UNITS).length) return { ok: false, error: 'too-large' };

  const minor = Number(whole || '0') * 10 ** decimals + Number(fraction.padEnd(decimals, '0') || '0');
  if (minor > maxMinor(decimals)) return { ok: false, error: 'too-large' };
  return { ok: true, minor };
}

/** A short message for a failed parseAmount(). */
export function amountErrorMessage(error: Exclude<ParseResult, { ok: true }>['error'], decimals: number): string {
  switch (error) {
    case 'empty':
      return 'Enter an amount';
    case 'too-many-decimals':
      return decimals === 0 ? 'Use whole numbers for this currency' : `Use at most ${decimals} decimals`;
    case 'too-large':
      return 'That amount is too large';
    default:
      return 'Enter a number, like 12.5';
  }
}

/**
 * Keeps an amount field tidy as it is typed: Arabic digits become 0-9, any
 * decimal separator becomes ".", only one is kept, and no more decimals than
 * the currency allows.
 */
export function cleanAmountInput(text: string, decimals: number): string {
  const s = normalizeNumberText(text).replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...rest] = s.split('.');
  const cleanWhole = whole.slice(0, String(MAX_WHOLE_UNITS).length);
  if (rest.length === 0 || decimals === 0) return cleanWhole;
  return `${cleanWhole}.${rest.join('').slice(0, decimals)}`;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The number alone, with all the currency's decimals: "1,234.500". */
export function formatAmount(minor: number, decimals: number): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const unit = 10 ** decimals;
  const whole = groupThousands(String(Math.floor(abs / unit)));
  const fraction = decimals > 0 ? '.' + String(abs % unit).padStart(decimals, '0') : '';
  return `${negative ? '−' : ''}${whole}${fraction}`;
}

/** Like "JOD 12.345", or "−JOD 3.000" below zero. */
export function formatMoney(minor: number, currency: string): string {
  const text = formatAmount(Math.abs(minor), currencyDecimals(currency));
  return `${minor < 0 ? '−' : ''}${currency} ${text}`;
}

/** The amount as an editable field value: "12.5" for 12.500, "12" for 12.000. */
export function amountInputValue(minor: number, decimals: number): string {
  if (decimals === 0) return String(minor);
  const unit = 10 ** decimals;
  const fraction = String(minor % unit).padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${Math.floor(minor / unit)}.${fraction}` : String(Math.floor(minor / unit));
}

/**
 * Converts minor units between currencies with different decimals, keeping
 * the same written amount (12.5 stays 12.5). Going to fewer decimals rounds
 * halves up; `exact` says whether anything was lost.
 */
export function rescaleMinor(minor: number, fromDecimals: number, toDecimals: number): { minor: number; exact: boolean } {
  if (toDecimals >= fromDecimals) return { minor: minor * 10 ** (toDecimals - fromDecimals), exact: true };
  const factor = 10 ** (fromDecimals - toDecimals);
  const sign = minor < 0 ? -1 : 1;
  const abs = Math.abs(minor);
  const rounded = Math.floor(abs / factor) + (abs % factor >= factor / 2 ? 1 : 0);
  return { minor: sign * rounded, exact: abs % factor === 0 };
}

/** A decimal amount from an old export (12.35) in minor units, read as written. */
export function minorFromDecimal(value: number, decimals: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  // Number("12.35e2") is exactly 1235, unlike 12.35 * 100 (1234.9999...).
  const shifted = Number(`${value}e${decimals}`);
  const minor = Math.round(Number.isFinite(shifted) ? shifted : value * 10 ** decimals);
  return isValidMinor(minor, decimals) ? minor : null;
}

/** The whole-number percentage of `part` in `whole`, rounded; 0 without a whole. */
export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part * 100) / whole);
}
