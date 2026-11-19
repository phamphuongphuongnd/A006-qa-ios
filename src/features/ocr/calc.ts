import { MAX_MINOR } from '@/domain/money';
import type { Minor } from '@/domain/types';

/**
 * Calculator in the amount field (Q20, S-03 / S-05). The hidden amount input holds an expression string made of
 * digits and the operators `+ - * /` (typed digits come from the system number pad, operators from the bar above it).
 *
 * - Operands after `+` / `-` (and the first one) are money, read the way they are written (Phương 2026-11-18, QA-100:
 *   "nhập thế nào viết bằng đó"): "1" = 1.00, "1250" = 1,250.00, "7.5" / "7,7" = 7.50 / 7.70, at most 2 digits after the
 *   point. Until 18/11 a number without a point was cash-register style ("1250" = 12.50) — `legacyToPlain` converts
 *   expressions saved that way (an old Quick capture draft).
 * - Operands after `*` / `/` are whole numbers (a count or a share): "1250*3" = 12.50 × 3 = 37.50.
 * - `*` / `/` bind tighter than `+` / `-`. A trailing operator is ignored while typing ("12.50+" → 12.50).
 * - Result rounds half up to whole pence/cents; ≤ 0, ÷ 0 or over 999,999.99 is an error ("Check the sum").
 */

export type CalcOp = '+' | '-' | '*' | '/';
export const CALC_OPS: CalcOp[] = ['+', '-', '*', '/'];
const OP_SET = new Set<string>(CALC_OPS);

/** Money operands stop at 8 digits in all (999,999.99: 6 before the point); counts at 4 (× 9999). */
const MONEY_DIGITS = 8;
const COUNT_DIGITS = 4;

export type CalcResult =
  | { kind: 'empty' }
  | { kind: 'value'; minor: Minor; expression: boolean }
  | { kind: 'error'; reason: 'div_zero' | 'not_positive' | 'too_big'; expression: true };

interface Token {
  op: CalcOp | null;
  digits: string;
}

function tokens(expr: string): Token[] {
  const out: Token[] = [{ op: null, digits: '' }];
  for (const ch of expr) {
    if (OP_SET.has(ch)) out.push({ op: ch as CalcOp, digits: '' });
    else out[out.length - 1].digits += ch;
  }
  return out;
}

/** Money operand → minor units: whole pounds / dollars, or a decimal when it has a point. */
function moneyMinor(digits: string): number {
  const dot = digits.indexOf('.');
  if (dot < 0) return Number(digits || '0') * 100;
  const whole = Number(digits.slice(0, dot) || '0');
  return whole * 100 + Number(digits.slice(dot + 1).padEnd(2, '0'));
}

/** Digits (and for money, one point) of an operand, capped like the old keypad. */
function cleanOperand(raw: string, count: boolean): string {
  if (count || !raw.includes('.')) {
    return raw.replace(/\./g, '').replace(/^0+(?=\d)/, '').slice(0, count ? COUNT_DIGITS : MONEY_DIGITS - 2);
  }
  const dot = raw.indexOf('.');
  const whole = raw.slice(0, dot).replace(/\./g, '').replace(/^0+(?=\d)/, '').slice(0, MONEY_DIGITS - 2);
  const frac = raw.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return `${whole || '0'}.${frac}`;
}

const isCount = (op: CalcOp | null) => op === '*' || op === '/';

/**
 * Cleans what the input produced: digits and operators only, no leading operator, two operators in a row keep the
 * newer one, operands capped at their digit limit (extra digits dropped, like the old keypad).
 */
export function sanitizeExpr(raw: string): string {
  let s = '';
  for (const ch of raw.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/,/g, '.')) {
    if (/[\d.]/.test(ch)) s += ch;
    else if (OP_SET.has(ch)) {
      if (s === '') continue;
      if (OP_SET.has(s[s.length - 1])) s = s.slice(0, -1);
      s += ch;
    }
  }
  return tokens(s)
    // Leading zeros carry no value; keep one so "0" still shows while typing a count.
    .map((tk) => (tk.op ?? '') + (tk.digits === '' ? '' : cleanOperand(tk.digits, isCount(tk.op))))
    .join('');
}

/**
 * B-133: a plain amount field (no calculator — split parts, Sort edit, rule limits) reads like Quick add: "33,01" =
 * 33.01, two decimals at most, 999,999.99 at most (extra digits dropped; `digitIgnored` tells).
 */
export function sanitizeAmount(raw: string): string {
  const digits = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  return digits === '' ? '' : cleanOperand(digits, false);
}

/** Appends an operator from the bar (replaces a trailing one; ignored on an empty field). */
export function pushOp(expr: string, op: CalcOp): string {
  return sanitizeExpr(expr + op);
}

export function evaluate(expr: string): CalcResult {
  const tks = tokens(sanitizeExpr(expr));
  // An operator still waiting for its number does not count yet.
  while (tks.length > 1 && tks[tks.length - 1].digits === '') tks.pop();
  const expression = tks.length > 1;
  if (!expression && tks[0].digits === '') return { kind: 'empty' };

  let total = 0;
  let term = 0;
  let sign = 1;
  for (const tk of tks) {
    const n = isCount(tk.op) ? Number(tk.digits || '0') : moneyMinor(tk.digits);
    if (tk.op === '*') term *= n;
    else if (tk.op === '/') {
      if (n === 0) return { kind: 'error', reason: 'div_zero', expression: true };
      term /= n;
    } else {
      total += sign * term;
      sign = tk.op === '-' ? -1 : 1;
      term = n;
    }
  }
  total += sign * term;
  // Half up, with a nudge for binary fractions (37.5 must round to 38, not 37.4999…).
  const minor = Math.floor(total + 0.5 + 1e-9);
  if (!expression) return { kind: 'value', minor, expression: false };
  if (minor <= 0) return { kind: 'error', reason: 'not_positive', expression: true };
  if (minor > MAX_MINOR) return { kind: 'error', reason: 'too_big', expression: true };
  return { kind: 'value', minor, expression: true };
}

/** Amount that Save stores (0 = nothing valid yet). */
export const exprMinor = (r: CalcResult): Minor => (r.kind === 'value' ? r.minor : 0);

/** Expression for the small line above the amount: "12.50+4.20", "12.50×3". */
export function formatExpr(expr: string): string {
  return tokens(sanitizeExpr(expr))
    .map((tk) => {
      const op = tk.op === '*' ? '×' : tk.op === '/' ? '÷' : tk.op === '-' ? '−' : (tk.op ?? '');
      if (tk.digits === '') return op;
      if (isCount(tk.op)) return op + String(Number(tk.digits));
      const v = moneyMinor(tk.digits);
      return `${op}${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`;
    })
    .join('');
}

/** Expression that represents a plain amount (OCR fill, "Use", opening S-05): "12.5" → typed form "12.50", "40" → "40". */
export const exprOf = (minor: Minor): string => {
  if (!(minor > 0)) return '';
  const whole = Math.floor(minor / 100);
  const cents = minor % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`;
};

/** An expression written the old way (no point = cash-register pence/cents) in the new plain form, same value. */
export function legacyToPlain(expr: string): string {
  return tokens(sanitizeExpr(expr))
    .map((tk) => {
      if (tk.digits === '' || isCount(tk.op) || tk.digits.includes('.')) return (tk.op ?? '') + tk.digits;
      const minor = Number(tk.digits);
      return (tk.op ?? '') + (minor > 0 ? exprOf(minor) : '0');
    })
    .join('');
}

/** A digit was typed (`raw` grew) but the limit kept the expression as it was: buzz instead of silently ignoring. */
export const digitIgnored = (prev: string, raw: string, next: string): boolean => /\d$/.test(raw) && raw.length > prev.length && next === prev;
