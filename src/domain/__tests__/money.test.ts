import { appendDigit, backspace, formatMoney, MAX_MINOR, parseMinor, toDecimalString } from '../money';

describe('formatMoney', () => {
  it('formats pounds and dollars with thousands', () => {
    expect(formatMoney(125050, 'GBP')).toBe('£1,250.50');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
    expect(formatMoney(0, 'GBP')).toBe('£0.00');
    expect(formatMoney(99_999_999, 'GBP')).toBe('£999,999.99');
  });
  it('signs', () => {
    expect(formatMoney(-350, 'GBP')).toBe('−£3.50');
    expect(formatMoney(350, 'GBP', { sign: 'always' })).toBe('+£3.50');
    expect(formatMoney(0, 'GBP', { sign: 'always' })).toBe('£0.00');
  });
  it('rejects floats', () => {
    expect(() => formatMoney(1.5, 'GBP')).toThrow();
  });
});

describe('keypad entry', () => {
  it('builds cash-register style', () => {
    let v = 0;
    for (const d of [1, 2, 5, 0]) v = appendDigit(v, d);
    expect(v).toBe(1250);
    expect(backspace(v)).toBe(125);
    expect(backspace(0)).toBe(0);
  });
  it('caps at max and ignores bad digits', () => {
    expect(appendDigit(MAX_MINOR, 1)).toBe(MAX_MINOR);
    expect(appendDigit(12, 10)).toBe(12);
    expect(appendDigit(0, 0)).toBe(0);
  });
});

describe('parseMinor / toDecimalString', () => {
  it('parses', () => {
    expect(parseMinor('12.5')).toBe(1250);
    expect(parseMinor('£1,250.50')).toBe(125050);
    expect(parseMinor('-3')).toBe(-300);
    expect(parseMinor('1.234')).toBeNull();
    expect(parseMinor('abc')).toBeNull();
    expect(parseMinor('')).toBeNull();
  });
  it('round-trips', () => {
    expect(toDecimalString(125050)).toBe('1250.50');
    expect(toDecimalString(-7)).toBe('-0.07');
    expect(parseMinor(toDecimalString(9)) ).toBe(9);
  });
});
