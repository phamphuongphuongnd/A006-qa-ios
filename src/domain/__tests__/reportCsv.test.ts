import { csvField, entriesCsv, mileageCsv, totalsCsv } from '../csv';
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
    // B-06: unsorted expenses get their own named line.
    expect(r.byTaxLine.find((l) => l.taxLine === 'Unsorted expenses')?.totalMinor).toBe(1500);
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
    expect(
      doc.startsWith('﻿date,time,type,amount,currency,category,tax_line,mtd_category,work_personal,note,receipts,source,auto_sorted,recurring,entry_id'),
    ).toBe(true);
    const lines = doc.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-11-09,12:00,expense,72.40,GBP,Unsorted,,,work,Shell M62,1,manual,no,no,a');
  });
  it('marks recurring and auto-sorted entries and the MTD category (F-15)', () => {
    const doc = entriesCsv([
      { id: 'r', occurredAt: at(2026, 11, 1), type: 'expense', amountMinor: 1500, currency: 'GBP', categoryName: 'Phone & data', taxLine: 'SA103: Phone, fax, stationery and other office costs', mtdCategory: 'Administrative costs', scope: 'work', note: '', receiptCount: 2, source: 'recurring', autoSorted: true },
    ]);
    expect(doc.trim().split('\r\n')[1]).toBe(
      '2026-11-01,12:00,expense,15.00,GBP,Phone & data,"SA103: Phone, fax, stationery and other office costs",Administrative costs,work,,2,recurring,yes,yes,r',
    );
  });
  it('builds the mileage log', () => {
    const doc = mileageCsv([{ startedAt: at(2026, 11, 10), miles: 128.44, scope: 'work', purpose: 'Route DLS4', source: 'gps', odoStart: null, odoEnd: null }]);
    expect(doc.trim().split('\r\n')[0]).toBe('date,start,end,miles,work_personal,purpose,source,edited,original_miles,odometer_start,odometer_end');
    expect(doc.trim().split('\r\n')[1]).toBe('2026-11-10,12:00,,128.4,work,Route DLS4,GPS,no,,,');
  });
  it('mileage log: automatic / NFC trips, edited times and manual odometer trips', () => {
    const doc = mileageCsv([
      { startedAt: new Date(2026, 10, 11, 7).getTime(), endedAt: new Date(2026, 10, 11, 11).getTime(), miles: 40, scope: 'unsorted', purpose: '', source: 'gps', startedBy: 'auto', edited: true, originalMiles: 42.34, odoStart: null, odoEnd: null },
      { startedAt: new Date(2026, 10, 12, 8).getTime(), endedAt: new Date(2026, 10, 12, 9).getTime(), miles: 10, scope: 'work', purpose: '', source: 'gps', startedBy: 'nfc', odoStart: null, odoEnd: null },
      { startedAt: at(2026, 11, 13), miles: 25, scope: 'work', purpose: 'Depot', source: 'manual', odoStart: 1000, odoEnd: 1025 },
    ]);
    const l = doc.trim().split('\r\n');
    expect(l[1]).toBe('2026-11-11,07:00,11:00,40.0,unsorted,,auto,yes,42.3,,');
    expect(l[2]).toBe('2026-11-12,08:00,09:00,10.0,work,,NFC,no,,,');
    expect(l[3]).toBe('2026-11-13,,,25.0,work,Depot,manual,no,,1000,1025');
  });
  // Step 4 · TC-154
  it('builds the totals-by-category file, one row per category with its tax line', () => {
    const doc = totalsCsv(
      [
        { type: 'income', name: 'Delivery income', taxLine: 'SA103: Turnover', totalMinor: 62000 },
        { type: 'expense', name: 'Parking, tolls & congestion', taxLine: 'SA103: Car, van and travel expenses', totalMinor: 350 },
      ],
      'GBP',
      'Tax year 2026/27',
    );
    const lines = doc.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines[0]).toBe('period,type,category,tax_line,total,currency');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('Tax year 2026/27,income,Delivery income,SA103: Turnover,620.00,GBP');
    expect(lines[2]).toBe('Tax year 2026/27,expense,"Parking, tolls & congestion","SA103: Car, van and travel expenses",3.50,GBP');
  });
});
