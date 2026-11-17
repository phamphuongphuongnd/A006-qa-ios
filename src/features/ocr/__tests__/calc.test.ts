import { digitIgnored, evaluate, exprMinor, exprOf, formatExpr, pushOp, sanitizeExpr } from '../calc';

describe('amount calculator (Q20)', () => {
  it('plain cash-register typing is unchanged', () => {
    expect(evaluate('1250')).toEqual({ kind: 'value', minor: 1250, expression: false });
    expect(evaluate('')).toEqual({ kind: 'empty' });
    expect(exprMinor(evaluate(''))).toBe(0);
    expect(formatExpr('1250')).toBe('12.50');
  });

  it('12.50+4.20 = 16.70 (mockup)', () => {
    const r = evaluate('1250+420');
    expect(r).toEqual({ kind: 'value', minor: 1670, expression: true });
    expect(formatExpr('1250+420')).toBe('12.50+4.20');
  });

  it('× and ÷ take whole numbers and bind tighter than + −', () => {
    expect(exprMinor(evaluate('1250*3'))).toBe(3750);
    expect(formatExpr('1250*3')).toBe('12.50×3');
    expect(exprMinor(evaluate('500+1250*2'))).toBe(3000);
    expect(exprMinor(evaluate('1000/3'))).toBe(333);
    expect(exprMinor(evaluate('1001/2'))).toBe(501); // 5.005 rounds half up
    expect(exprMinor(evaluate('2000-450-50'))).toBe(1500);
    expect(formatExpr('2000-450/2')).toBe('20.00−4.50÷2');
  });

  it('a trailing operator is ignored while typing', () => {
    expect(evaluate('1250+')).toEqual({ kind: 'value', minor: 1250, expression: false });
    expect(formatExpr('1250+')).toBe('12.50+');
    expect(exprMinor(evaluate('1250*'))).toBe(1250);
  });

  it('invalid sums are errors ("Check the sum")', () => {
    expect(evaluate('1250/0')).toMatchObject({ kind: 'error', reason: 'div_zero' });
    expect(evaluate('500-1250')).toMatchObject({ kind: 'error', reason: 'not_positive' });
    expect(evaluate('500-500')).toMatchObject({ kind: 'error', reason: 'not_positive' });
    expect(evaluate('99999999+1')).toMatchObject({ kind: 'error', reason: 'too_big' });
    expect(exprMinor(evaluate('1250/0'))).toBe(0);
  });

  it('sanitises input: no leading operator, double operators replaced, digit caps', () => {
    expect(sanitizeExpr('+12')).toBe('12');
    expect(sanitizeExpr('12+-5')).toBe('12-5');
    expect(sanitizeExpr('12×3÷2')).toBe('12*3/2');
    expect(sanitizeExpr('123456789')).toBe('12345678');
    expect(sanitizeExpr('100*123456')).toBe('100*1234');
    expect(sanitizeExpr('12a.5')).toBe('12.5'); // QA-100: the point is now a decimal point
    expect(pushOp('', '+')).toBe('');
    expect(pushOp('1250+', '*')).toBe('1250*');
    expect(exprOf(7240)).toBe('7240');
    expect(exprOf(0)).toBe('');
  });

  it('notices a digit dropped at the limit (haptic)', () => {
    expect(digitIgnored('12345678', '123456789', sanitizeExpr('123456789'))).toBe(true);
    expect(digitIgnored('1234', '12345', sanitizeExpr('12345'))).toBe(false);
    expect(digitIgnored('1234', '123', sanitizeExpr('123'))).toBe(false);
  });
});

describe('decimal point (QA-100, Android number pads show ".")', () => {
  it('reads a typed point as a decimal; no point stays cash-register style', () => {
    expect(evaluate(sanitizeExpr('7.5'))).toEqual({ kind: 'value', minor: 750, expression: false });
    expect(evaluate(sanitizeExpr('120.'))).toEqual({ kind: 'value', minor: 12000, expression: false });
    expect(evaluate(sanitizeExpr('12.34'))).toEqual({ kind: 'value', minor: 1234, expression: false });
    expect(evaluate(sanitizeExpr('120'))).toEqual({ kind: 'value', minor: 120, expression: false });
    expect(evaluate(sanitizeExpr('7,5'))).toEqual({ kind: 'value', minor: 750, expression: false });
  });

  it('keeps one point, two decimals, and a leading 0', () => {
    expect(sanitizeExpr('1.2.3')).toBe('1.23');
    expect(sanitizeExpr('9.999')).toBe('9.99');
    expect(sanitizeExpr('.5')).toBe('0.5');
    expect(sanitizeExpr('007.5')).toBe('7.5');
    expect(sanitizeExpr('1234567.5')).toBe('123456.5');
  });

  it('works inside sums; counts after × ÷ ignore the point', () => {
    expect(evaluate(sanitizeExpr('7.5+1250'))).toEqual({ kind: 'value', minor: 2000, expression: true });
    expect(evaluate(sanitizeExpr('10.*3.'))).toEqual({ kind: 'value', minor: 3000, expression: true });
    expect(formatExpr('7.5+1250')).toBe('7.50+12.50');
  });
});
