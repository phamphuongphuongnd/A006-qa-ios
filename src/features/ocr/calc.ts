import { MAX_MINOR } from '@/domain/money';
import type { Minor } from '@/domain/types';

/**
 * Calculator in the amount field (Q20, S-03 / S-05). The hidden amount input holds an expression string made of
 * digits and the operators `+ - * /` (typed digits come from the system number pad, operators from the bar above it).
 *
 * - Operands after `+` / `-` (and the first one) are money typed cash-register style: "1250" = 12.50.
 * - Operands after `*` / `/` are whole numbers (a count or a share): "1250*3" = 12.50 × 3 = 37.50.
 * - `*` / `/` bind tighter than `+` / `-`. A trailing operator is ignored while typing ("12.50+" → 12.50).
 * - Result rounds half up to whole pence/cents; ≤ 0, ÷ 0 or over 999,999.99 is an error ("Check the sum").
 */

export type CalcOp = '+' | '-' | '*' | '/';
export const CALC_OPS: CalcOp[] = ['+', '-', '*', '/'];
const OP_SET = new Set<string>(CALC_OPS);

/** Money operands stop at 8 digits (999,999.99); counts at 4 (× 9999). */
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

const isCount = (op: CalcOp | null) => op === '*' || op === '/';

/**
 * Cleans what the input produced: digits and operators only, no leading operator, two operators in a row keep the
 * newer one, operands capped at their digit limit (extra digits dropped, like the old keypad).
 */
export function sanitizeExpr(raw: string): string {
  let s = '';
  for (const ch of raw.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')) {
    if (/\d/.test(ch)) s += ch;
    else if (OP_SET.has(ch)) {
      if (s === '') continue;
      if (OP_SET.has(s[s.length - 1])) s = s.slice(0, -1);
      s += ch;
    }
  }
  return tokens(s)
    .map((tk) => {
      const max = isCount(tk.op) ? COUNT_DIGITS : MONEY_DIGITS;
      // Leading zeros carry no value; keep one so "0" still shows while typing a count.
      const digits = tk.digits.replace(/^0+(?=\d)/, '').slice(0, max);
      return (tk.op ?? '') + digits;
    })
    .join('');
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
    const n = Number(tk.digits || '0');
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
      const v = Number(tk.digits);
      return `${op}${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`;
    })
    .join('');
}

/** Expression that represents a plain amount (OCR fill, "Use", opening S-05). */
export const exprOf = (minor: Minor): string => (minor > 0 ? String(minor) : '');

/** A digit was typed (`raw` grew) but the limit kept the expression as it was: buzz instead of silently ignoring. */
export const digitIgnored = (prev: string, raw: string, next: string): boolean => /\d$/.test(raw) && raw.length > prev.length && next === prev;
