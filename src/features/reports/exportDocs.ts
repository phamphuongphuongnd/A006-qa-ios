import { isoDate } from '@/domain/csv';
import { formatDistanceNumber } from '@/domain/mileage';
import { formatMoney, toDecimalString } from '@/domain/money';
import type { Report } from '@/domain/report';
import type { Currency, EntryType, Minor, Scope, TripScope } from '@/domain/types';

import type { MtdSummaryRow } from './mtdFiles';
import type { MonthPoint } from './series';

export type ExportKind =
  | 'entriesCsv'
  | 'mileageCsv'
  | 'pdf'
  | 'totalsCsv'
  | 'mtdSummary'
  | 'mtdRecords'
  | 'mtdXlsx'
  | 'freeagent'
  | 'receiptsZip';
/** S-10 order (mockup "Pro, every file type"). */
export const EXPORT_KINDS: ExportKind[] = ['entriesCsv', 'mileageCsv', 'pdf', 'totalsCsv', 'mtdSummary', 'mtdRecords', 'mtdXlsx', 'freeagent', 'receiptsZip'];
/** Raw data — always free, also after Pro ends (product.md §6). */
export const FREE_KINDS: ExportKind[] = ['entriesCsv', 'mileageCsv'];
/** UK only: MTD files follow HMRC categories; FreeAgent is a UK product. */
export const MTD_KINDS: ExportKind[] = ['mtdSummary', 'mtdRecords', 'mtdXlsx', 'freeagent'];

export const isProKind = (k: ExportKind) => !FREE_KINDS.includes(k);
/** Files offered for a region (US: no MTD / FreeAgent). */
export const kindsFor = (region: 'UK' | 'US'): ExportKind[] => EXPORT_KINDS.filter((k) => region === 'UK' || !MTD_KINDS.includes(k));

/**
 * Default ticks: the raw entries file, the mileage log when the period has trips (B-35); with Pro also the PDF and,
 * in the UK, the MTD summary.
 */
export function defaultExportKinds(hasTrips: boolean, opts: { pro?: boolean; region?: 'UK' | 'US' } = {}): ExportKind[] {
  const out: ExportKind[] = ['entriesCsv'];
  if (hasTrips) out.push('mileageCsv');
  if (opts.pro) {
    out.push('pdf');
    if ((opts.region ?? 'UK') === 'UK') out.push('mtdSummary');
  }
  return EXPORT_KINDS.filter((k) => out.includes(k));
}

const FILE_PART: Record<ExportKind, string> = {
  entriesCsv: 'entries',
  mileageCsv: 'mileage',
  pdf: 'report',
  totalsCsv: 'totals',
  mtdSummary: 'MTD-summary',
  mtdRecords: 'MTD-records',
  mtdXlsx: 'MTD',
  freeagent: 'FreeAgent',
  receiptsZip: 'receipts',
};
const EXT: Partial<Record<ExportKind, string>> = { pdf: 'pdf', receiptsZip: 'zip', mtdXlsx: 'xlsx' };

/** "SundaySort-entries-2026-27.csv"; `part` names one of several files of a kind ("expenses", "mileage-2"). */
export function exportFileName(kind: ExportKind, fileStem: string, part?: string): string {
  return `SundaySort-${FILE_PART[kind]}${part ? `-${part}` : ''}-${fileStem}.${EXT[kind] ?? 'csv'}`;
}

/** Several files are shared as one ZIP (the share sheet takes one file). */
export const bundleFileName = (fileStem: string) => `SundaySort-export-${fileStem}.zip`;

const slug = (s: string) =>
  s
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'Unsorted';

/**
 * Names inside the receipts ZIP: "2026-11-03_45.20_Fuel.jpg", numbered when the same entry has several photos or
 * two entries collide.
 */
export function receiptZipNames(
  items: { filePath: string; occurredAt: number; amountMinor: Minor; categoryName: string | null }[],
): { filePath: string; zipName: string }[] {
  const used = new Set<string>();
  return items.map((it) => {
    const ext = (it.filePath.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] ?? 'jpg').toLowerCase();
    const stem = `${isoDate(it.occurredAt)}_${toDecimalString(it.amountMinor)}_${slug(it.categoryName ?? 'Unsorted')}`;
    let name = `${stem}.${ext}`;
    for (let n = 2; used.has(name); n++) name = `${stem}_${n}.${ext}`;
    used.add(name);
    return { filePath: it.filePath, zipName: name };
  });
}

// ---------------- PDF report ----------------

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Nov 2026" for calendar months; "6 Oct – 5 Nov 2026" for UK tax months. */
function monthLabel(x: MonthPoint): string {
  const s = new Date(x.start);
  const l = new Date(x.end - 1);
  if (s.getDate() === 1 && l.getMonth() === s.getMonth()) return `${MON[s.getMonth()]} ${s.getFullYear()}`;
  return `${s.getDate()} ${MON[s.getMonth()]} – ${l.getDate()} ${MON[l.getMonth()]} ${l.getFullYear()}`;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * QA-100 SPE-6: the PDF is built in one WebView page — ~8,000 rows took > 12 min and ~3 GB before printing. The PDF
 * is the readable summary; past this many rows a table stops and points to the CSV (which always has every row).
 */
export const PDF_MAX_ROWS = 2000;
const capNote = (shown: number, total: number, what: string) =>
  total > shown
    ? `<p class="note">Showing the first ${shown.toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')} ${what}. The full list is in the CSV export.</p>`
    : '';

export interface PdfInput {
  periodLabel: string;
  currency: Currency;
  report: Report;
  months: MonthPoint[];
  includePersonal: boolean;
  /** Mileage-rate method: miles + allowance. null under actual costs or with no work miles. */
  mileage: { workMiles: number; estimateMinor: Minor; ratesNote: string } | null;
  /** Actual-costs method: "Business use 87% · 30,450 of 35,000 mi". */
  businessUse?: { percent: number; workMiles: number; totalMiles: number } | null;
  /** One line on the vehicle cost method (§5.3). */
  vehicleNote?: string | null;
  /** UK: totals by HMRC category for this period. */
  mtdRows?: MtdSummaryRow[] | null;
  trips: { startedAt: number; miles: number; scope: TripScope; purpose: string; source: string; edited?: boolean }[];
  entries: { occurredAt: number; type: EntryType; amountMinor: Minor; categoryName: string | null; scope: Scope; note: string }[];
  generatedAt: number;
}

/**
 * HTML for expo-print. Ends with "Generated by Sunday Sort · Not tax advice" — a normal line, not a fixed footer:
 * Android's WebView printing draws `position: fixed` once, over the page-2 table.
 */
export function reportHtml(p: PdfInput): string {
  const m = (v: Minor) => escapeHtml(formatMoney(v, p.currency));
  const e = escapeHtml;
  const r = p.report;
  const row = (cells: string[], cls = '') => `<tr${cls ? ` class="${cls}"` : ''}>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  // <thead>: Android's print WebView repeats it at the top of every page a long table runs onto (B-26).
  const head = (cells: string[]) => `<thead><tr>${cells.map((c) => `<th>${e(c)}</th>`).join('')}</tr></thead>`;
  const scopeLabel = (s: TripScope) => (s === 'work' ? 'Work' : s === 'personal' ? 'Personal' : 'Unsorted');
  const typeLabel = (t: EntryType) => (t === 'income' ? 'Income' : 'Expense');

  const byCat = (type: EntryType) =>
    r.byCategory
      .filter((c) => c.type === type)
      .map((c) => row([e(c.name), m(c.totalMinor)]))
      .join('');

  const sections = [
    `<h1>Sunday Sort report</h1><p class="sub">${e(p.periodLabel)} · ${p.includePersonal ? 'Work and personal entries' : 'Work entries only'}</p>`,
    `<h2>Summary</h2><table>${row(['Income', m(r.incomeMinor)])}${row(['Expenses', m(r.expenseMinor)])}${row(['Profit', m(r.profitMinor)], 'total')}</table>`,
    !p.includePersonal && r.personalExcludedMinor > 0
      ? `<p class="note">Personal entries are excluded (${m(r.personalExcludedMinor)})</p>`
      : '',
    r.unsortedCount > 0
      ? `<p class="note">${r.unsortedCount === 1 ? "1 entry in this period isn't" : `${r.unsortedCount} entries in this period aren't`} sorted yet — shown as "Unsorted".</p>`
      : '',
    `<h2>Income by category</h2><table>${head(['Category', 'Total'])}${byCat('income') || row(['—', m(0)])}</table>`,
    `<h2>Expenses by category</h2><table>${head(['Category', 'Total'])}${byCat('expense') || row(['—', m(0)])}</table>`,
    r.coveredByCategory.length
      ? `<h2>Covered by mileage rate</h2><table>${head(['Category', 'Not added'])}${r.coveredByCategory
          .map((c) => row([e(c.name), m(c.totalMinor)]))
          .join('')}${row(['Total', m(r.coveredMinor)], 'total')}</table><p class="note">Your mileage claim already includes fuel, repairs, insurance and road tax. Parking, tolls and congestion charges are added on top.</p>`
      : '',
    `<h2>By tax form line</h2><table>${head(['Line', 'Type', 'Total'])}${r.byTaxLine
      .map((l) => row([e(l.taxLine), typeLabel(l.type), m(l.totalMinor)]))
      .join('')}</table>`,
    p.mtdRows
      ? `<h2>MTD categories</h2><table>${head(['HMRC category', 'Type', 'Total'])}${p.mtdRows
          .filter((x) => x.totalMinor !== 0)
          .map((x) => row([e(x.label), typeLabel(x.type), m(x.totalMinor)]))
          .join('') || row(['—', '', m(0)])}</table>`
      : '',
    p.vehicleNote ? `<h2>Vehicle costs</h2><p>${e(p.vehicleNote)}</p>` : '',
    p.months.length
      ? `<h2>By month</h2><table>${head(['Month', 'Income', 'Expenses', 'Net'])}${p.months
          .map((x) => row([e(monthLabel(x)), m(x.incomeMinor), m(x.expenseMinor), m(x.incomeMinor - x.expenseMinor)]))
          .join('')}</table>`
      : '',
    p.mileage
      ? `<h2>Mileage</h2><p>${formatDistanceNumber(p.mileage.workMiles)} business miles · ≈ ${m(p.mileage.estimateMinor)} ${e(p.mileage.ratesNote)}</p><p class="note">Estimate only — not tax advice.</p>`
      : p.businessUse
        ? `<h2>Mileage</h2><p>Business use ${p.businessUse.percent}% · ${formatDistanceNumber(p.businessUse.workMiles)} of ${formatDistanceNumber(p.businessUse.totalMiles)} mi</p><p class="note">Your accountant applies the business-use share.</p>`
        : '',
    p.trips.length
      ? `<h2>Mileage log</h2><table class="trips">${head(['Date', 'Miles', 'Work/Personal', 'Purpose', 'Source'])}${[...p.trips]
          // Oldest first, like the entries table below.
          .sort((a, b) => a.startedAt - b.startedAt)
          .slice(0, PDF_MAX_ROWS)
          .map((t) =>
            row([isoDate(t.startedAt), formatDistanceNumber(t.miles, 1), scopeLabel(t.scope), e(t.purpose), `${e(t.source)}${t.edited ? ' · Edited' : ''}`]),
          )
          .join('')}</table>${capNote(Math.min(PDF_MAX_ROWS, p.trips.length), p.trips.length, 'trips')}`
      : '',
    `<h2>Entries</h2><table class="entries">${head(['Date', 'Type', 'Amount', 'Category', 'Work/Personal', 'Note'])}${p.entries
      .slice(0, PDF_MAX_ROWS)
      .map((x) => row([isoDate(x.occurredAt), typeLabel(x.type), m(x.amountMinor), e(x.categoryName ?? 'Unsorted'), scopeLabel(x.scope), e(x.note)]))
      .join('')}</table>${capNote(Math.min(PDF_MAX_ROWS, p.entries.length), p.entries.length, 'entries')}`,
  ];

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page { margin: 18mm 14mm 20mm; }
body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #161D2B; font-size: 11pt; }
h1 { font-size: 20pt; margin: 0 0 4px; } h2 { font-size: 13pt; margin: 18px 0 6px; break-after: avoid; page-break-after: avoid; }
.sub, .note { color: #465062; margin: 4px 0; }
table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #E6E0D5; }
th { font-size: 9pt; text-transform: uppercase; color: #465062; } td:last-child, th:last-child { text-align: right; }
tr.total td { font-weight: 700; border-top: 2px solid #161D2B; }
tr { page-break-inside: avoid; } thead { display: table-header-group; }
table.trips td:last-child, table.trips th:last-child, table.entries td:last-child, table.entries th:last-child { text-align: left; }
table.trips td:nth-child(2), table.trips th:nth-child(2), table.entries td:nth-child(3), table.entries th:nth-child(3) { text-align: right; }
.foot { margin-top: 24px; text-align: center; font-size: 8pt; color: #5F6877; }
</style></head><body>
${sections.join('\n')}
<p class="foot">Generated by Sunday Sort · Not tax advice · ${e(isoDate(p.generatedAt))}</p>
</body></html>`;
}
