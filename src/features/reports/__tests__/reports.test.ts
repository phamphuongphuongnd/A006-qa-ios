import { DEFAULT_RATES } from '@/domain/mileage';
import { buildReport } from '@/domain/report';

import { exportFileName, receiptZipNames, reportHtml } from '../exportDocs';
import { availableTaxYears, endOfDay, periodFor, startOfDay } from '../period';
import { linePoints, monthlySeries, periodMileageEstimate, ratesLabel } from '../series';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('periods', () => {
  it('UK year and quarters', () => {
    const y = periodFor('UK', 2026, 'year');
    expect(y.label).toBe('Tax year 2026/27');
    expect(y.fileStem).toBe('2026-27');
    expect(y.start).toBe(at(2026, 4, 6, 0));
    const q3 = periodFor('UK', 2026, 'q3');
    expect(q3.label).toBe('Q3 2026/27');
    expect(q3.range).toBe('6 Oct – 5 Jan');
    expect(q3.fileStem).toBe('2026-27-Q3');
    expect(q3.csvLabel).toBe('2026/27 Q3');
    expect(q3.end).toBe(at(2027, 1, 6, 0));
  });

  it('US quarters are calendar quarters', () => {
    const q1 = periodFor('US', 2026, 'q1');
    expect(q1.label).toBe('Q1 2026');
    expect(q1.range).toBe('1 Jan – 31 Mar');
  });

  it('custom range label and stem', () => {
    const c = periodFor('UK', 2026, 'custom', { start: startOfDay(at(2026, 11, 1)), end: endOfDay(at(2026, 11, 12)) });
    expect(c.label).toBe('1 Nov – 12 Nov 2026');
    expect(c.fileStem).toBe('2026-11-01_2026-11-12');
    const across = periodFor('UK', 2026, 'custom', { start: startOfDay(at(2026, 12, 20)), end: endOfDay(at(2027, 1, 5)) });
    expect(across.label).toBe('20 Dec 2026 – 5 Jan 2027');
    expect(across.year.label).toBe('2026/27');
  });

  it('lists tax years from the first record to now', () => {
    expect(availableTaxYears('UK', at(2025, 3, 1), at(2026, 11, 12)).map((y) => y.label)).toEqual(['2026/27', '2025/26', '2024/25']);
    expect(availableTaxYears('US', null, at(2026, 11, 12)).map((y) => y.label)).toEqual(['2026']);
  });
});

describe('monthly series', () => {
  const p = periodFor('UK', 2026, 'year');
  const entries = [
    { type: 'income' as const, amountMinor: 1000, occurredAt: at(2026, 4, 6, 0), scope: 'work' as const },
    { type: 'expense' as const, amountMinor: 300, occurredAt: at(2026, 5, 5, 23), scope: 'work' as const },
    { type: 'expense' as const, amountMinor: 999, occurredAt: at(2026, 5, 6), scope: 'personal' as const },
    { type: 'income' as const, amountMinor: 500, occurredAt: at(2026, 11, 7), scope: 'work' as const },
  ];

  it('uses tax months and stops at today', () => {
    const s = monthlySeries(entries, p, { now: at(2026, 11, 12) });
    expect(s.map((x) => x.label)).toEqual(['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
    expect(s[0]).toMatchObject({ incomeMinor: 1000, expenseMinor: 300 });
    expect(s[1].expenseMinor).toBe(0);
    expect(s[7].incomeMinor).toBe(500);
  });

  it('includes personal when asked; full year in the past has 12 buckets', () => {
    const s = monthlySeries(entries, p, { now: at(2030, 1, 1), includePersonal: true });
    expect(s).toHaveLength(12);
    expect(s[1].expenseMinor).toBe(999);
  });

  it('line points scale to the box', () => {
    expect(linePoints([0, 50, 100], 100, { width: 320, top: 10, bottom: 130, padX: 20 })).toBe('20,130 160,70 300,10');
    expect(linePoints([], 0, { width: 320, top: 0, bottom: 1, padX: 0 })).toBe('');
  });
});

describe('mileage', () => {
  it('prices a quarter after the first 10,000 miles at 25p', () => {
    expect(periodMileageEstimate(0, 8412, DEFAULT_RATES.UK)).toBe(378540);
    expect(periodMileageEstimate(9_000, 2_000, DEFAULT_RATES.UK)).toBe(1000 * 45 + 1000 * 25);
    expect(periodMileageEstimate(12_000, 100, DEFAULT_RATES.UK)).toBe(2500);
  });
  it('labels rates', () => {
    expect(ratesLabel(DEFAULT_RATES.UK, 'GBP')).toBe('45p / 25p');
    expect(ratesLabel(DEFAULT_RATES.US, 'USD')).toBe('72.5¢');
  });
});

describe('export documents', () => {
  it('file names', () => {
    expect(exportFileName('entriesCsv', '2026-27-Q3')).toBe('SundaySort-entries-2026-27-Q3.csv');
    expect(exportFileName('pdf', '2026-27')).toBe('SundaySort-report-2026-27.pdf');
    expect(exportFileName('receiptsZip', '2026-27')).toBe('SundaySort-receipts-2026-27.zip');
  });

  it('receipt names: date, amount, category, de-duplicated', () => {
    const names = receiptZipNames([
      { filePath: 'x1.jpg', occurredAt: at(2026, 11, 3), amountMinor: 4520, categoryName: 'Parking, tolls & congestion' },
      { filePath: 'x2.JPG', occurredAt: at(2026, 11, 3), amountMinor: 4520, categoryName: 'Parking, tolls & congestion' },
      { filePath: 'x3.png', occurredAt: at(2026, 11, 4), amountMinor: 999, categoryName: null },
    ]);
    expect(names.map((n) => n.zipName)).toEqual([
      '2026-11-03_45.20_Parking-tolls-congestion.jpg',
      '2026-11-03_45.20_Parking-tolls-congestion_2.jpg',
      '2026-11-04_9.99_Unsorted.png',
    ]);
  });

  it('PDF html has totals, footer and escapes user text', () => {
    const p = periodFor('UK', 2026, 'year');
    const entries = [
      { type: 'income' as const, amountMinor: 61240, occurredAt: at(2026, 11, 4), categoryId: 'c1', scope: 'work' as const, note: 'Flex' },
      { type: 'expense' as const, amountMinor: 4520, occurredAt: at(2026, 11, 3), categoryId: null, scope: 'work' as const, note: '<b>Shell</b>' },
    ];
    const report = buildReport(entries, [{ id: 'c1', name: 'Delivery income', taxLine: 'SA103: Turnover' }], p);
    const html = reportHtml({
      periodLabel: p.label,
      currency: 'GBP',
      report,
      months: monthlySeries(entries, p, { now: at(2026, 11, 12) }),
      includePersonal: false,
      mileage: { workMiles: 42.3, estimateMinor: 1904, ratesNote: 'at HMRC rates (45p / 25p)' },
      trips: [],
      entries: entries.map((e) => ({ ...e, categoryName: e.categoryId ? 'Delivery income' : null })),
      generatedAt: at(2026, 11, 12),
    });
    expect(html).toContain('Generated by Sunday Sort · Not tax advice');
    expect(html).toContain('£567.20');
    expect(html).toContain('&lt;b&gt;Shell&lt;/b&gt;');
    expect(html).not.toContain('<b>Shell</b>');
    expect(html).toContain('6 Oct – 5 Nov 2026');
    expect(html).toContain("1 entry in this period isn't sorted yet");
  });
});
