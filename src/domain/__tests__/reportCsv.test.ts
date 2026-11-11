import { csvField, entriesCsv, mileageCsv } from '../csv';
import { buildReport, type ReportEntry } from '../report';
import { taxYearFor } from '../taxYear';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const year = taxYearFor(2026, 'UK');
const cats = [
  { id: 'fuel', name: 'Fuel', taxLine: 'SA103: Car, van and travel expenses' },
  { id: 'parking', name: 'Parking, tolls & congestion', taxLine: 'SA103: Car, van and travel expenses' },
  { id: 'inc', name: 'Delivery income', taxLine: 'SA103: Turnover' },
];
const entries: ReportEntry[] = [
  { type: 'income', amountMinor: 62000, occurredAt: at(2026, 11, 10), categoryId: 'inc', scope: 'work' },
  { type: 'expense', amountMinor: 7240, occurredAt: at(2026, 11, 9), categoryId: 'fuel', scope: 'work' },
  { type: 'expense', amountMinor: 350, occurredAt: at(2026, 11, 9), categoryId: 'parking', scope: 'work' },
  { type: 'expense', amountMinor: 420, occurredAt: at(2026, 11, 9), categoryId: null, scope: 'personal' },
  { type: 'expense', amountMinor: 1500, occurredAt: at(2026, 11, 14), categoryId: null, scope: 'work' },
  { type: 'expense', amountMinor: 99999, occurredAt: at(2026, 4, 5), categoryId: 'fuel', scope: 'work' }, // previous tax year
];

describe('buildReport', () => {
  it('totals work entries in the period', () => {
    const r = buildReport(entries, cats, year);
    expect(r.incomeMinor).toBe(62000);
    expect(r.expenseMinor).toBe(7240 + 350 + 1500);
    expect(r.profitMinor).toBe(62000 - 9090);
    expect(r.personalExcludedMinor).toBe(420);
    expect(r.unsortedCount).toBe(2);
    expect(r.byCategory[0]).toMatchObject({ categoryId: 'inc', totalMinor: 62000 });
    expect(r.byCategory.find((c) => c.categoryId === null)).toMatchObject({ name: 'Unsorted', totalMinor: 1500 });
    expect(r.byTaxLine.find((l) => l.taxLine === 'SA103: Car, van and travel expenses')?.totalMinor).toBe(7590);
  });
  it('can include personal entries', () => {
    const r = buildReport(entries, cats, year, { includePersonal: true });
    expect(r.expenseMinor).toBe(9510);
    expect(r.personalExcludedMinor).toBe(0);
  });
});

describe('csv', () => {
  it('escapes and blocks formula injection', () => {
    expect(csvField('Tesco, Leeds')).toBe('"Tesco, Leeds"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvField(null)).toBe('');
    expect(csvField(-3)).toBe('-3');
  });
  it('builds the entries file with BOM, header and sorted rows', () => {
    const doc = entriesCsv([
      { id: 'b', occurredAt: at(2026, 11, 10), type: 'income', amountMinor: 62000, currency: 'GBP', categoryName: 'Delivery income', taxLine: 'SA103: Turnover', scope: 'work', note: 'DPD weekly payout', receiptCount: 0 },
      { id: 'a', occurredAt: at(2026, 11, 9), type: 'expense', amountMinor: 7240, currency: 'GBP', categoryName: null, taxLine: null, scope: 'work', note: 'Shell M62', receiptCount: 1 },
    ]);
    expect(doc.startsWith('﻿date,time,type,amount')).toBe(true);
    const lines = doc.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-11-09,12:00,expense,72.40,GBP,Unsorted,,work,Shell M62,yes,a');
  });
  it('builds the mileage log', () => {
    const doc = mileageCsv([{ startedAt: at(2026, 11, 10), miles: 128.44, scope: 'work', purpose: 'Route DLS4', source: 'gps', odoStart: null, odoEnd: null }]);
    expect(doc.trim().split('\r\n')[1]).toBe('2026-11-10,128.4,work,Route DLS4,gps,,');
  });
});
