import { defaultTaxLine, mapTaxLine, TAX_LINES, taxLinesFor } from '../categories';

describe('tax lines by type (B-31)', () => {
  it.each(['UK', 'US'] as const)('%s splits every line into income or expense, never both', (region) => {
    const income = taxLinesFor(region, 'income');
    const expense = taxLinesFor(region, 'expense');
    expect(income).toHaveLength(2);
    expect([...income, ...expense].sort()).toEqual([...TAX_LINES[region]].sort());
    expect(expense).not.toContain(TAX_LINES[region][0]);
  });

  it('defaults to the "Other" line of the type', () => {
    expect(defaultTaxLine('UK', 'income')).toBe('SA103: Other business income');
    expect(defaultTaxLine('UK', 'expense')).toBe('SA103: Other allowable business expenses');
    expect(defaultTaxLine('US', 'expense')).toBe('Schedule C: Line 27a Other expenses');
    expect(taxLinesFor('UK', 'expense')).toContain(defaultTaxLine('UK', 'expense'));
  });
});

describe('mapTaxLine (B-33)', () => {
  it('follows the built-ins that shared the old line', () => {
    expect(mapTaxLine('SA103: Car, van and travel expenses', 'expense', 'UK', 'US')).toBe('Schedule C: Line 9 Car and truck expenses');
    expect(mapTaxLine('Schedule C: Line 15 Insurance', 'expense', 'US', 'UK')).toBe('SA103: Car, van and travel expenses');
  });
  it('falls back to the type default when no built-in used the line', () => {
    expect(mapTaxLine('SA103: Wages, salaries and other staff costs', 'expense', 'UK', 'US')).toBe('Schedule C: Line 27a Other expenses');
    expect(mapTaxLine('weird', 'income', 'US', 'UK')).toBe('SA103: Other business income');
  });
  it('keeps a line that is already valid for the region', () => {
    expect(mapTaxLine('SA103: Turnover', 'income', 'US', 'UK')).toBe('SA103: Turnover');
  });
});
