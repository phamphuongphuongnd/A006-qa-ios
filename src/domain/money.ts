import type { Currency, Minor } from './types';

/** Largest amount the capture keypad accepts: 999,999.99. */
export const MAX_MINOR: Minor = 99_999_999;

const SYMBOL: Record<Currency, string> = { GBP: '£', USD: '$' };

export const currencySymbol = (currency: Currency) => SYMBOL[currency];

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 125050 -> "£1,250.50". Negative values get a leading minus: "−£3.50" when `sign` is 'always'. */
export function formatMoney(
  minor: Minor,
  currency: Currency,
  opts: { sign?: 'auto' | 'always' } = {},
): string {
  if (!Number.isInteger(minor)) throw new Error(`formatMoney expects integer minor units, got ${minor}`);
  const abs = Math.abs(minor);
  const body = `${SYMBOL[currency]}${groupThousands(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, '0')}`;
  if (minor < 0) return `−${body}`;
  if (opts.sign === 'always' && minor > 0) return `+${body}`;
  return body;
}

/** Cash-register style entry: typing 1,2,5,0 gives 1250 (= 12.50). Ignores digits past MAX_MINOR. */
export function appendDigit(current: Minor, digit: number): Minor {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return current;
  const next = current * 10 + digit;
  return next > MAX_MINOR ? current : next;
}

export const backspace = (current: Minor): Minor => Math.floor(current / 10);

/** "12.5" / "£1,250.50" / "-3" -> minor units; null when not a valid amount. */
export function parseMinor(text: string): Minor | null {
  const cleaned = text.replace(/[£$,\s]/g, '').replace('−', '-');
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith('-');
  const [whole, frac = ''] = cleaned.replace('-', '').split('.');
  const value = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return negative ? -value : value;
}

/** Plain decimal string for CSV: 125050 -> "1250.50". */
export function toDecimalString(minor: Minor): string {
  const abs = Math.abs(minor);
  return `${minor < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Rates are kept as integer millionths: "1.27" -> 1_270_000. */
export const RATE_SCALE = 1_000_000;

/** Exchange rate typed by the user ("1.27", "0,79") -> millionths; null unless a positive number with ≤ 6 decimals. */
export function parseRate(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  const micro = Number(whole) * RATE_SCALE + Number(frac.padEnd(6, '0'));
  return micro > 0 ? micro : null;
}

/** Converts an amount at a rate in millionths, rounded to the nearest minor unit (half away from zero). */
export function convertMinor(minor: Minor, rateMicro: number): Minor {
  const abs = Math.round((Math.abs(minor) * rateMicro) / RATE_SCALE);
  return minor < 0 ? -abs : abs;
}
