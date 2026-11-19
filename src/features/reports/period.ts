import { quartersOf, taxYearFor, taxYearOf, type TaxYear } from '@/domain/taxYear';
import type { Period, Region } from '@/domain/types';

export type PeriodMode = 'year' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom';
export const PERIOD_MODES: PeriodMode[] = ['year', 'q1', 'q2', 'q3', 'q4', 'custom'];

/** X3: MTD quarterly update periods — standard (6 Apr …) or calendar (1 Apr …, month ends). UK only. */
export type MtdPeriodKind = 'standard' | 'calendar';

export interface PeriodOptions {
  /** UK quarters: standard (default) or calendar update periods. Ignored for the US and for year / custom. */
  mtd?: MtdPeriodKind;
  /** UK quarters: count from the start of the MTD year to the end of the quarter, like an MTD quarterly update. */
  ytd?: boolean;
}

export interface ReportPeriod extends Period {
  mode: PeriodMode;
  /** Tax year the period belongs to (custom: the year its start falls in). */
  year: TaxYear;
  /** "Tax year 2026/27" · "Q3 2026/27" · "1 Nov – 12 Nov 2026". */
  label: string;
  /** Date range under the chips for quarters/custom: "6 Oct – 5 Jan" · "6 Apr – 5 Oct 2026, cumulative". */
  range: string | null;
  /** Safe file-name part: "2026-27", "2026-27-Q3", "2026-27-Q2-cal-ytd", "2026-11-01_2026-11-12". */
  fileStem: string;
  /** Totals CSV "period" column: "2026/27", "2026/27 Q3", "2026-11-01..2026-11-12". */
  csvLabel: string;
  /** UK quarter periods only: which MTD periods the quarter follows. null for year, custom and the US. */
  mtd: MtdPeriodKind | null;
  /** Quarter counted from the start of the MTD year (`start` is then the MTD year start). */
  ytd: boolean;
  /**
   * Start of the cumulative MTD window that ends at `end` (MTD summary is always "year to date"): the MTD year start
   * for quarters, the tax-year start otherwise.
   */
  cumulativeStart: number;
  /** "Q2 · 6 Jul – 5 Oct 2026 · Standard" (S-10 period field). */
  exportLabel: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayMonth = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const dayMonthYear = (at: number) => `${dayMonth(at)} ${new Date(at).getFullYear()}`;
/** "6 Apr – 5 Oct 2026" / "6 Oct 2026 – 5 Jan 2027" for [start, end). */
export function rangeText(start: number, end: number): string {
  const last = end - 1;
  const sameYear = new Date(start).getFullYear() === new Date(last).getFullYear();
  return `${sameYear ? dayMonth(start) : dayMonthYear(start)} – ${dayMonthYear(last)}`;
}

/** Start of the local day. */
export const startOfDay = (at: number) => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
/** Start of the next local day (exclusive end for "up to and including this day"). */
export const endOfDay = (at: number) => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
};

/**
 * MTD for Income Tax began on 6 April 2026. HMRC (SALF1150): in the first year of a calendar-periods election the
 * first period still starts on 6 April, later years on 1 April. We can't know when a driver elected, so the
 * 2026/27 (and earlier) calendar year starts on 6 April and later years on 1 April.
 */
export const MTD_FIRST_TAX_YEAR = 2026;

// QA-100 SPE-1: a link like sundaysort://reports?from=-99999999999999999&to=0 (or a 1970→2026 custom range) froze the
// app. Report ranges are limited to 1 Jan 2000 … one year from today, at most 10 years long.
export const REPORT_MIN_AT = new Date(2000, 0, 1).getTime();
export const REPORT_MAX_YEARS = 10;
export function saneReportRange(start: number, end: number, now = Date.now()): boolean {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  if (start < REPORT_MIN_AT || end > now + 366 * 86_400_000) return false;
  const limit = new Date(start);
  limit.setFullYear(limit.getFullYear() + REPORT_MAX_YEARS);
  return end <= limit.getTime() + 86_400_000;
}

/** QA-100 D (19/11): a link's tax-year start must be a real one — 2000 … next year — not "Tax year 999999" / "-5". */
export function saneReportYear(year: number, now = Date.now()): boolean {
  return Number.isInteger(year) && year >= new Date(REPORT_MIN_AT).getFullYear() && year <= new Date(now).getFullYear() + 1;
}

const ms = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

/** The four MTD quarters of a UK tax year: [start, end) each, standard or calendar. */
export function mtdQuarters(startYear: number, kind: MtdPeriodKind): Period[] {
  if (kind === 'standard') return quartersOf(taxYearFor(startYear, 'UK'), 'UK').map((q) => ({ start: q.start, end: q.end }));
  const first = startYear <= MTD_FIRST_TAX_YEAR ? ms(startYear, 3, 6) : ms(startYear, 3, 1);
  const b = [first, ms(startYear, 6, 1), ms(startYear, 9, 1), ms(startYear + 1, 0, 1), ms(startYear + 1, 3, 1)];
  return [0, 1, 2, 3].map((i) => ({ start: b[i], end: b[i + 1] }));
}

export function periodFor(region: Region, startYear: number, mode: PeriodMode, custom?: Period, opts: PeriodOptions = {}): ReportPeriod {
  const year = taxYearFor(startYear, region);
  const yearStem = year.label.replace('/', '-');
  const base = { mtd: null, ytd: false } as const;
  if (mode === 'year') {
    const label = `Tax year ${year.label}`;
    return {
      ...base,
      mode,
      year,
      start: year.start,
      end: year.end,
      label,
      range: null,
      fileStem: yearStem,
      csvLabel: year.label,
      cumulativeStart: year.start,
      exportLabel: label,
    };
  }
  if (mode === 'custom') {
    const c = custom ?? { start: year.start, end: year.end };
    const last = c.end - 1;
    const label = rangeText(c.start, c.end);
    const y = taxYearOf(c.start, region);
    return {
      ...base,
      mode,
      year: y,
      start: c.start,
      end: c.end,
      label,
      range: null,
      fileStem: `${iso(c.start)}_${iso(last)}`,
      csvLabel: `${iso(c.start)}..${iso(last)}`,
      cumulativeStart: y.start,
      exportLabel: label,
    };
  }
  const index = Number(mode[1]);
  if (region === 'US') {
    const q = quartersOf(year, region)[index - 1];
    const label = `Q${index} ${year.label}`;
    return {
      ...base,
      mode,
      year,
      start: q.start,
      end: q.end,
      label,
      range: q.label,
      fileStem: `${yearStem}-Q${index}`,
      csvLabel: `${year.label} Q${index}`,
      cumulativeStart: year.start,
      exportLabel: `Q${index} · ${rangeText(q.start, q.end)}`,
    };
  }
  const kind = opts.mtd ?? 'standard';
  const qs = mtdQuarters(startYear, kind);
  const q = qs[index - 1];
  const ytd = !!opts.ytd;
  const start = ytd ? qs[0].start : q.start;
  const kindWord = kind === 'calendar' ? 'Calendar' : 'Standard';
  const suffix = `${kind === 'calendar' ? '-cal' : ''}${ytd ? '-ytd' : ''}`;
  return {
    mode,
    year,
    start,
    end: q.end,
    label: `Q${index} ${year.label}`,
    range: ytd ? `${rangeText(start, q.end)}, cumulative` : `${dayMonth(q.start)} – ${dayMonth(q.end - 1)}`,
    fileStem: `${yearStem}-Q${index}${suffix}`,
    csvLabel: `${year.label} Q${index}${kind === 'calendar' ? ' calendar' : ''}${ytd ? ' year to date' : ''}`,
    mtd: kind,
    ytd,
    cumulativeStart: qs[0].start,
    exportLabel: `Q${index} · ${rangeText(start, q.end)} · ${kindWord}${ytd ? ' · Year to date' : ''}`,
  };
}

/** Tax years from the oldest record to the current one, newest first. */
export function availableTaxYears(region: Region, firstAt: number | null, now = Date.now()): TaxYear[] {
  const cur = taxYearOf(now, region).startYear;
  const first = firstAt === null ? cur : Math.min(cur, taxYearOf(firstAt, region).startYear);
  const out: TaxYear[] = [];
  for (let y = cur; y >= first; y--) out.push(taxYearFor(y, region));
  return out;
}

/** The quarter of the current tax year that contains `now` (Reports opens on "Year", this is for convenience). */
export function currentPeriod(region: Region, now = Date.now()): ReportPeriod {
  return periodFor(region, taxYearOf(now, region).startYear, 'year');
}

/** Same period with other MTD options (Reports' Standard | Calendar and Year-to-date switches). */
export const withPeriodOptions = (p: ReportPeriod, region: Region, opts: PeriodOptions, custom?: Period): ReportPeriod =>
  periodFor(region, p.year.startYear, p.mode, p.mode === 'custom' ? (custom ?? { start: p.start, end: p.end }) : undefined, opts);
