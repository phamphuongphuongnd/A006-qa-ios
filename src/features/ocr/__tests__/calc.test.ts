import { digitIgnored, evaluate, exprMinor, exprOf, formatExpr, legacyToPlain, pushOp, sanitizeExpr } from '../calc';

// Phương 2026-11-18 (QA-100): amounts are read the way they are written — "1" = 1.00, "1250" = 1,250.00, "7,7" = 7.70.
describe('amount calculator (Q20)', () => {
  it('a number without a point is whole pounds / dollars', () => {
    expect(evaluate('1')).toEqual({ kind: 'value', minor: 100, expression: false });
    expect(evaluate('100')).toEqual({ kind: 'value', minor: 10000, expression: false });
    expect(evaluate('1250')).toEqual({ kind: 'value', minor: 125000, expression: false });
    expect(evaluate('')).toEqual({ kind: 'empty' });
    expect(exprMinor(evaluate(''))).toBe(0);
    expect(formatExpr('1250')).toBe('1250.00');
    expect(formatExpr('1')).toBe('1.00');
  });

  it('12.50+4.20 = 16.70 (mockup)', () => {
    const r = evaluate('12.5+4.2');
    expect(r).toEqual({ kind: 'value', minor: 1670, expression: true });
    expect(formatExpr('12.50+4.20')).toBe('12.50+4.20');
  });

  it('× and ÷ take whole numbers and bind tighter than + −', () => {
    expect(exprMinor(evaluate('12.50*3'))).toBe(3750);
    expect(formatExpr('12.5*3')).toBe('12.50×3');
    expect(exprMinor(evaluate('5+12.50*2'))).toBe(3000);
    expect(exprMinor(evaluate('10/3'))).toBe(333);
    expect(exprMinor(evaluate('10.01/2'))).toBe(501); // 5.005 rounds half up
    expect(exprMinor(evaluate('20-4.50-0.50'))).toBe(1500);
    expect(formatExpr('20-4.5/2')).toBe('20.00−4.50÷2');
  });

  it('a trailing operator is ignored while typing', () => {
    expect(evaluate('12.50+')).toEqual({ kind: 'value', minor: 1250, expression: false });
    expect(formatExpr('12.5+')).toBe('12.50+');
    expect(exprMinor(evaluate('12.50*'))).toBe(1250);
  });

  it('invalid sums are errors ("Check the sum")', () => {
    expect(evaluate('12.50/0')).toMatchObject({ kind: 'error', reason: 'div_zero' });
    expect(evaluate('5-12.50')).toMatchObject({ kind: 'error', reason: 'not_positive' });
    expect(evaluate('5-5')).toMatchObject({ kind: 'error', reason: 'not_positive' });
    expect(evaluate('999999+1')).toMatchObject({ kind: 'error', reason: 'too_big' });
    expect(exprMinor(evaluate('12.50/0'))).toBe(0);
  });

  it('sanitises input: no leading operator, double operators replaced, digit caps', () => {
    expect(sanitizeExpr('+12')).toBe('12');
    expect(sanitizeExpr('12+-5')).toBe('12-5');
    expect(sanitizeExpr('12×3÷2')).toBe('12*3/2');
    expect(sanitizeExpr('123456789')).toBe('123456'); // 999,999 is the most a whole amount can be
    expect(sanitizeExpr('100*123456')).toBe('100*1234');
    expect(sanitizeExpr('12a.5')).toBe('12.5');
    expect(pushOp('', '+')).toBe('');
    expect(pushOp('12.50+', '*')).toBe('12.50*');
  });

  it('an amount set by the app is written the way the driver would type it', () => {
    expect(exprOf(7240)).toBe('72.40');
    expect(exprOf(7200)).toBe('72');
    expect(exprOf(5)).toBe('0.05');
    expect(exprOf(0)).toBe('');
    expect(exprMinor(evaluate(exprOf(7240)))).toBe(7240);
    expect(exprMinor(evaluate(exprOf(5)))).toBe(5);
  });

  it('notices a digit dropped at the limit (haptic)', () => {
    expect(digitIgnored('123456', '1234567', sanitizeExpr('1234567'))).toBe(true);
    expect(digitIgnored('1234', '12345', sanitizeExpr('12345'))).toBe(false);
    expect(digitIgnored('1234', '123', sanitizeExpr('123'))).toBe(false);
  });
});

describe('decimal point / comma', () => {
  it('reads a typed point or comma as a decimal', () => {
    expect(evaluate(sanitizeExpr('7.5'))).toEqual({ kind: 'value', minor: 750, expression: false });
    expect(evaluate(sanitizeExpr('7,7'))).toEqual({ kind: 'value', minor: 770, expression: false });
    expect(evaluate(sanitizeExpr('120.'))).toEqual({ kind: 'value', minor: 12000, expression: false });
    expect(evaluate(sanitizeExpr('12.34'))).toEqual({ kind: 'value', minor: 1234, expression: false });
    expect(evaluate(sanitizeExpr('120'))).toEqual({ kind: 'value', minor: 12000, expression: false });
  });

  it('keeps one point, two decimals, and a leading 0', () => {
    expect(sanitizeExpr('1.2.3')).toBe('1.23');
    expect(sanitizeExpr('9.999')).toBe('9.99');
    expect(sanitizeExpr('.5')).toBe('0.5');
    expect(sanitizeExpr('007.5')).toBe('7.5');
    expect(sanitizeExpr('1234567.5')).toBe('123456.5');
  });

  it('works inside sums; counts after × ÷ ignore the point', () => {
    expect(evaluate(sanitizeExpr('7.5+12'))).toEqual({ kind: 'value', minor: 1950, expression: true });
    expect(evaluate(sanitizeExpr('10.*3.'))).toEqual({ kind: 'value', minor: 3000, expression: true });
    expect(formatExpr('7.5+12')).toBe('7.50+12.00');
  });
});

describe('drafts saved before 18/11 (cash-register form)', () => {
  it('keep their value in the new form', () => {
    expect(legacyToPlain('1250')).toBe('12.50');
    expect(legacyToPlain('1250+420')).toBe('12.50+4.20');
    expect(legacyToPlain('1250*3')).toBe('12.50*3');
    expect(legacyToPlain('7.5')).toBe('7.5');
    expect(legacyToPlain('5')).toBe('0.05');
    expect(exprMinor(evaluate(legacyToPlain('1250+420')))).toBe(1670);
  });
});
