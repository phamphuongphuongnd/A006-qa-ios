import { strFromU8, unzipSync } from 'fflate';

import { DEFAULT_RATES } from '@/domain/mileage';
import { buildReport, MILEAGE_ID, type ReportCategory, type ReportEntry } from '@/domain/report';

import { defaultExportKinds, exportFileName, isProKind, kindsFor } from '../exportDocs';
import {
  FREEAGENT_MAX_ROWS,
  fixEngineSize,
  freeAgentCategory,
  freeAgentExpensesCsv,
  freeAgentMileageCsv,
  MTD_ROWS,
  mtdRecords,
  mtdRecordsCsv,
  mtdSummaryCsv,
  mtdSummaryRows,
  mtdWorkbook,
  vehicleNote,
  type MtdCategoryInfo,
  type MtdEntryInput,
} from '../mtdFiles';
import { mtdQuarters, periodFor, rangeText } from '../period';
import { rangeMileageEstimate } from '../series';
import { xlsxBytes } from '../xlsx';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();
const lines = (doc: string) => doc.replace(/^﻿/, '').trim().split('\r\n');

const CATS: (ReportCategory & MtdCategoryInfo)[] = [
  { id: 'inc', key: 'delivery_income', name: 'Delivery income', taxLine: 'SA103: Turnover', mtdCategory: 'turnover' },
  { id: 'fuel', key: 'fuel', name: 'Fuel', taxLine: 'SA103: Car, van and travel expenses', mtdCategory: 'carVanTravelExpenses', vehicleRunningCost: true },
  { id: 'park', key: 'parking', name: 'Parking, tolls & congestion', taxLine: 'SA103: Car, van and travel expenses', mtdCategory: 'carVanTravelExpenses' },
  { id: 'phone', key: 'phone', name: 'Phone & data', taxLine: 'SA103: Phone, fax, stationery and other office costs', mtdCategory: 'adminCosts' },
  { id: 'fees', key: 'fees', name: 'Accountant & fees', taxLine: 'SA103: Accountancy, legal and other professional fees', mtdCategory: 'professionalFees' },
  // Custom category with no MTD category stored: falls back on its tax line.
  { id: 'cust', key: null, name: 'Hi-vis', taxLine: 'SA103: Other allowable business expenses', mtdCategory: null },
];

const E = (id: string, d: number, type: 'income' | 'expense', minor: number, categoryId: string | null, extra: Partial<MtdEntryInput> = {}): MtdEntryInput & ReportEntry => ({
  id,
  occurredAt: d,
  type,
  amountMinor: minor,
  categoryId,
  scope: 'work',
  note: '',
  merchant: null,
  ...extra,
});

const ENTRIES = [
  E('1', at(2026, 4, 10), 'income', 62000, 'inc', { note: 'DPD weekly payout', merchant: 'DPD' }),
  E('2', at(2026, 5, 2), 'expense', 7240, 'fuel', { note: 'Shell M62', merchant: 'Shell' }),
  E('3', at(2026, 5, 3), 'expense', 350, 'park', { note: 'Leeds parking' }),
  E('4', at(2026, 7, 1), 'expense', 1500, 'phone'),
  E('5', at(2026, 8, 1), 'expense', 999, null, { note: 'mystery' }),
  E('6', at(2026, 8, 2), 'expense', 4000, 'phone', { scope: 'personal' }),
  E('7', at(2026, 9, 9), 'expense', 2500, 'cust', { note: 'Hi-vis vest' }),
];

describe('MTD periods (X3)', () => {
  it('standard quarters follow the tax year', () => {
    const q = mtdQuarters(2026, 'standard');
    expect(q[0]).toEqual({ start: day(2026, 4, 6), end: day(2026, 7, 6) });
    expect(q[3].end).toBe(day(2027, 4, 6));
  });
  it('calendar quarters end on month ends; the first MTD year starts on 6 April, later years on 1 April', () => {
    const y26 = mtdQuarters(2026, 'calendar');
    expect(y26.map((q) => rangeText(q.start, q.end))).toEqual([
      '6 Apr – 30 Jun 2026',
      '1 Jul – 30 Sep 2026',
      '1 Oct – 31 Dec 2026',
      '1 Jan – 31 Mar 2027',
    ]);
    expect(mtdQuarters(2027, 'calendar')[0].start).toBe(day(2027, 4, 1));
  });
  it('Q2 year to date is cumulative from the start of the year', () => {
    const p = periodFor('UK', 2026, 'q2', undefined, { mtd: 'standard', ytd: true });
    expect(p.start).toBe(day(2026, 4, 6));
    expect(p.end).toBe(day(2026, 10, 6));
    expect(p.range).toBe('6 Apr – 5 Oct 2026, cumulative');
    expect(p.fileStem).toBe('2026-27-Q2-ytd');
    expect(p.exportLabel).toBe('Q2 · 6 Apr – 5 Oct 2026 · Standard · Year to date');
    const plain = periodFor('UK', 2026, 'q2');
    expect(plain.start).toBe(day(2026, 7, 6));
    expect(plain.cumulativeStart).toBe(day(2026, 4, 6));
    expect(plain.exportLabel).toBe('Q2 · 6 Jul – 5 Oct 2026 · Standard');
    expect(plain.mtd).toBe('standard');
  });
  it('calendar Q2 and the US ignore MTD options where they do not apply', () => {
    const cal = periodFor('UK', 2027, 'q2', undefined, { mtd: 'calendar', ytd: true });
    expect(cal.start).toBe(day(2027, 4, 1));
    expect(cal.end).toBe(day(2027, 10, 1));
    expect(cal.fileStem).toBe('2027-28-Q2-cal-ytd');
    const us = periodFor('US', 2026, 'q2', undefined, { mtd: 'calendar', ytd: true });
    expect(us.start).toBe(day(2026, 4, 1));
    expect(us.mtd).toBeNull();
    expect(periodFor('UK', 2026, 'year', undefined, { ytd: true }).mtd).toBeNull();
  });
});

describe('Reports by vehicle cost method (X2 / Q24)', () => {
  const year = periodFor('UK', 2026, 'year');
  const vehicle = (method: 'mileage' | 'actual' | 'unsure') => ({ method, mileageMinor: 46260, workMiles: 841.2, region: 'UK' as const });

  it('mileage rate: running costs are covered (not added), the allowance is an expense on Car, van and travel', () => {
    const r = buildReport(ENTRIES, CATS, year, { vehicle: vehicle('mileage') });
    expect(r.coveredMinor).toBe(7240);
    expect(r.coveredByCategory.map((c) => c.name)).toEqual(['Fuel']);
    expect(r.mileageClaimMinor).toBe(46260);
    expect(r.byCategory.find((c) => c.categoryId === MILEAGE_ID)).toMatchObject({ name: 'Mileage', type: 'expense', totalMinor: 46260 });
    // 350 parking + 1500 phone + 999 unsorted + 2500 custom + 46260 mileage
    expect(r.expenseMinor).toBe(51609);
    expect(r.byTaxLine.find((l) => l.taxLine === 'SA103: Car, van and travel expenses')?.totalMinor).toBe(46610);
    expect(r.byMtd.find((m) => m.mtdCategory === 'carVanTravelExpenses')?.totalMinor).toBe(46610);
    expect(r.byMtd.find((m) => m.mtdCategory === 'otherExpenses')?.totalMinor).toBe(2500);
    expect(r.personalExcludedMinor).toBe(4000);
  });
  it('not sure yet counts like the mileage rate', () => {
    expect(buildReport(ENTRIES, CATS, year, { vehicle: vehicle('unsure') }).expenseMinor).toBe(51609);
  });
  it('actual costs: every vehicle entry counts, no allowance', () => {
    const r = buildReport(ENTRIES, CATS, year, { vehicle: vehicle('actual') });
    expect(r.coveredMinor).toBe(0);
    expect(r.mileageClaimMinor).toBe(0);
    expect(r.expenseMinor).toBe(7240 + 350 + 1500 + 999 + 2500);
    expect(r.byCategory.some((c) => c.categoryId === MILEAGE_ID)).toBe(false);
  });
  it('without a vehicle input the report is unchanged from v1', () => {
    expect(buildReport(ENTRIES, CATS, year).expenseMinor).toBe(7240 + 350 + 1500 + 999 + 2500);
  });
  it('vehicle note says what was claimed', () => {
    expect(vehicleNote('mileage', { mileage: { minor: 46260, miles: 841.2, ratesText: '55p / 25p' }, coveredMinor: 7240, businessUse: null }, 'GBP')).toBe(
      'Mileage rate. Mileage allowance: 841.2 business miles at 55p / 25p = £462.60. Fuel, repairs, insurance and road tax are covered by the rate (£72.40 left out); parking, tolls and congestion are added on top.',
    );
    expect(vehicleNote('actual', { mileage: null, coveredMinor: 0, businessUse: { percent: 87, workMiles: 30450, totalMiles: 35000 } }, 'GBP')).toBe(
      'Actual costs. Vehicle costs are in full. Business use 87.00% (30,450.0 of 35,000.0 mi). Your accountant applies the business-use share.',
    );
  });
});

describe('mileage across a tax-year boundary (calendar periods)', () => {
  it('prices days before 6 April with the old tax year tier count', () => {
    const rates = DEFAULT_RATES.UK;
    // 10,000 work miles already in 2026/27 by 31 Mar 2027 → 1–5 Apr 2027 miles are at 25p; from 6 Apr 2027 back to 55p.
    const trips = [
      { at: at(2026, 5, 1), miles: 10_000 },
      { at: at(2027, 4, 2), miles: 100 },
      { at: at(2027, 4, 7), miles: 100 },
    ];
    expect(rangeMileageEstimate(trips, day(2027, 4, 1), day(2027, 7, 1), rates, 'UK')).toBe(100 * 25 + 100 * 55);
  });
});

describe('MTD records (MTDsorted columns)', () => {
  const q = periodFor('UK', 2026, 'year');
  const mileage = { minor: 46260, miles: 841.2, ratesText: '55p / 25p' };

  it('keeps Work entries with a category, leaves out unsorted and covered ones, adds the allowance row', () => {
    const set = mtdRecords(ENTRIES, CATS, q, { method: 'mileage', mileage });
    expect(set.leftOut).toEqual({ count: 1, minor: 999 });
    expect(set.covered).toEqual({ count: 1, minor: 7240 });
    expect(set.records.map((r) => r.amountMinor)).toEqual([62000, 350, 1500, 2500, 46260]);
    const doc = lines(mtdRecordsCsv(set));
    expect(doc[0]).toBe('Date,Description,Merchant / customer name,Amount,Disallowable amount,Income tax category');
    expect(doc[1]).toBe('10/04/2026,DPD weekly payout,DPD,620.00,0.00,Turnover');
    expect(doc[3]).toBe('01/07/2026,Phone & data,,15.00,0.00,Administrative costs');
    expect(doc[5]).toBe('05/04/2027,Mileage allowance: 841.2 business miles at 55p / 25p,,462.60,0.00,"Car, van and travel expenses"');
  });
  it('actual costs keep fuel and add no allowance row', () => {
    const set = mtdRecords(ENTRIES, CATS, q, { method: 'actual', mileage });
    expect(set.covered.count).toBe(0);
    expect(set.records.some((r) => r.description.startsWith('Mileage allowance'))).toBe(false);
    expect(set.records.find((r) => r.amountMinor === 7240)?.merchant).toBe('Shell');
  });
});

describe('MTD summary', () => {
  const r = buildReport(ENTRIES, CATS, periodFor('UK', 2026, 'year'), {
    vehicle: { method: 'mileage', mileageMinor: 46260, workMiles: 841.2, region: 'UK' },
  });
  it('lists all 17 HMRC categories with a Disallowable column, cumulative window on the first line', () => {
    const rows = mtdSummaryRows(r);
    expect(rows).toHaveLength(17);
    expect(rows.filter((x) => x.type === 'expense')).toHaveLength(15);
    const doc = lines(
      mtdSummaryCsv({ windowText: '6 Apr 2026 – 5 Oct 2026', kind: 'standard', rows, leftOut: { count: 1, minor: 999 }, vehicleNote: null }),
    );
    expect(doc[0]).toBe('MTD summary,6 Apr 2026 – 5 Oct 2026');
    expect(doc[1]).toBe('Update periods,Standard (from 6 April)');
    expect(doc[4]).toBe('Income tax category,Type,Amount,Disallowable amount,HMRC field');
    expect(doc[5]).toBe('Turnover,Income,620.00,0.00,turnover');
    expect(doc).toContain('"Car, van and travel expenses",Expense,466.10,0.00,carVanTravelExpenses');
    expect(doc).toContain('Administrative costs,Expense,15.00,0.00,adminCosts');
    expect(doc).toContain('Bad debts,Expense,0.00,0.00,irrecoverableDebts');
    expect(doc).toContain('Total income,,620.00,,');
    expect(doc).toContain('Total expenses,,506.10,0.00,');
    expect(doc).toContain('Left out (no category),1 entry,9.99,,');
  });
});

describe('MTD spreadsheet (.xlsx)', () => {
  it('has Income, Expenses and Summary sheets with MTDsorted headers and SUMIF totals', () => {
    const set = mtdRecords(ENTRIES, CATS, periodFor('UK', 2026, 'year'), { method: 'mileage', mileage: { minor: 46260, miles: 841.2, ratesText: '55p / 25p' } });
    const sheets = mtdWorkbook(set, { windowText: '6 Apr 2026 – 5 Apr 2027', kind: 'standard', leftOut: set.leftOut, vehicleNote: 'Mileage rate.' });
    expect(sheets.map((s) => s.sheet)).toEqual(['Income', 'Expenses', 'Summary']);
    expect(sheets[1].data).toHaveLength(1 + 4);
    const files = unzipSync(xlsxBytes(sheets));
    const wb = strFromU8(files['xl/workbook.xml']);
    expect(wb).toContain('name="Income"');
    expect(wb).toContain('name="Summary"');
    const shared = strFromU8(files['xl/sharedStrings.xml']);
    for (const h of ['Date received', 'Amount received (without VAT)', 'CIS deducted', 'Total amount', 'Disallowable amount', 'Income tax category']) {
      expect(shared).toContain(h);
    }
    const summary = strFromU8(files['xl/worksheets/sheet3.xml']);
    expect(summary).toContain('<f>SUMIF(Expenses!F:F,"Car, van and travel expenses",Expenses!D:D)</f>');
    expect(summary).toContain('<f>SUMIF(Income!E:E,"Turnover",Income!D:D)</f>');
  });
});

describe('FreeAgent (CSV)', () => {
  const set = mtdRecords(ENTRIES, CATS, periodFor('UK', 2026, 'year'), { method: 'actual', mileage: null });

  it('expenses follow the import template: claimant, category, DD/MM/YYYY, Payment', () => {
    const [doc, ...more] = freeAgentExpensesCsv('Dan Walker', set, 'GBP');
    expect(more).toHaveLength(0);
    const l = lines(doc);
    expect(l[0]).toBe('claimant_name,category,DD/MM/YYYY,currency,type,gross_value,description,receipt_reference,sales_tax_rate');
    expect(l[1]).toBe('Dan Walker,Motor Expenses,02/05/2026,GBP,Payment,72.40,Shell M62,,');
    expect(l[2]).toBe('Dan Walker,Travel,03/05/2026,GBP,Payment,3.50,Leeds parking,,');
    expect(l).toContain('Dan Walker,Mobile Phone,01/07/2026,GBP,Payment,15.00,Phone & data,,');
    expect(l).toContain('Dan Walker,Sundries,09/09/2026,GBP,Payment,25.00,Hi-vis vest,,');
    // Income is not an expense.
    expect(l.some((x) => x.includes('620.00'))).toBe(false);
  });
  it('maps custom categories by HMRC category', () => {
    expect(freeAgentCategory({ category: 'professionalFees', categoryInfo: { id: 'x', name: 'Lawyer', taxLine: '', key: null } })).toBe('Legal and Professional fees');
    expect(freeAgentCategory({ category: 'depreciation', categoryInfo: null })).toBe('Sundries');
  });
  it('splits at 1,000 rows', () => {
    const many = { ...set, records: Array.from({ length: FREEAGENT_MAX_ROWS + 5 }, () => set.records[1]) };
    const files = freeAgentExpensesCsv('Dan', many, 'GBP');
    expect(files).toHaveLength(2);
    expect(lines(files[1])).toHaveLength(1 + 5);
  });
  it('mileage: van as Car, engine required, reclaim by vehicle method', () => {
    const trips = [{ at: at(2026, 5, 4), miles: 83.04, purpose: '' }];
    const [mi] = freeAgentMileageCsv('Dan Walker', trips, { engineType: 'Diesel', engineSize: '1601-2000cc' }, 'mileage');
    const l = lines(mi);
    expect(l[0]).toBe('claimant_name,DD/MM/YYYY,description,mileage,vehicle_type,engine_type,engine_size,reclaim_mileage');
    expect(l[1]).toBe('Dan Walker,04/05/2026,Business miles,83.0,Car,Diesel,1601-2000cc,1');
    expect(lines(freeAgentMileageCsv('Dan Walker', trips, { engineType: 'Diesel', engineSize: '1601-2000cc' }, 'actual')[0])[1].endsWith(',0')).toBe(true);
    // An engine size that doesn't fit the type is corrected (electric → "All").
    expect(fixEngineSize({ engineType: 'Electric (Home charger)', engineSize: 'Over 2000cc' }).engineSize).toBe('All');
  });

  it('B-55: electric journeys before 1 Sep 2025 say plain "Electric"', () => {
    const ev = { engineType: 'Electric (Home charger)' as const, engineSize: 'All' };
    const [mi] = freeAgentMileageCsv('Dan Walker', [{ at: at(2025, 8, 31), miles: 10, purpose: 'Evri' }, { at: at(2025, 9, 1), miles: 12, purpose: 'Evri' }], ev, 'mileage');
    const l = lines(mi);
    expect(l[1]).toBe('Dan Walker,31/08/2025,Evri,10.0,Car,Electric,All,1');
    expect(l[2]).toBe('Dan Walker,01/09/2025,Evri,12.0,Car,Electric (Home charger),All,1');
  });
});

describe('export kinds (free vs Pro, F-15)', () => {
  it('raw CSVs are free; everything else is Pro', () => {
    expect(isProKind('entriesCsv')).toBe(false);
    expect(isProKind('mileageCsv')).toBe(false);
    expect(['pdf', 'totalsCsv', 'mtdSummary', 'mtdRecords', 'mtdXlsx', 'freeagent', 'receiptsZip'].every((k) => isProKind(k as never))).toBe(true);
  });
  it('US has no MTD / FreeAgent files', () => {
    expect(kindsFor('US')).toEqual(['entriesCsv', 'mileageCsv', 'pdf', 'totalsCsv', 'receiptsZip']);
    expect(kindsFor('UK')).toHaveLength(9);
  });
  it('defaults', () => {
    expect(defaultExportKinds(true)).toEqual(['entriesCsv', 'mileageCsv']);
    expect(defaultExportKinds(false, { pro: true, region: 'UK' })).toEqual(['entriesCsv', 'pdf', 'mtdSummary']);
    expect(defaultExportKinds(true, { pro: true, region: 'US' })).toEqual(['entriesCsv', 'mileageCsv', 'pdf']);
  });
  it('file names', () => {
    expect(exportFileName('mtdXlsx', '2026-27-Q2')).toBe('SundaySort-MTD-2026-27-Q2.xlsx');
    expect(exportFileName('freeagent', '2026-27', 'mileage')).toBe('SundaySort-FreeAgent-mileage-2026-27.csv');
    expect(MTD_ROWS[0].key).toBe('turnover');
  });
});
