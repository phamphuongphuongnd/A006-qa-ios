import { quartersOf, taxYearFor, taxYearOf, type TaxYear } from '@/domain/taxYear';
import type { Period, Region } from '@/domain/types';

export type PeriodMode = 'year' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom';
export const PERIOD_MODES: PeriodMode[] = ['year', 'q1', 'q2', 'q3', 'q4', 'custom'];

export interface ReportPeriod extends Period {
  mode: PeriodMode;
  /** Tax year the period belongs to (custom: the year its start falls in). */
  year: TaxYear;
  /** "Tax year 2026/27" · "Q3 2026/27" · "1 Nov – 12 Nov 2026". */
  label: string;
  /** Date range under the chips for quarters/custom: "6 Oct – 5 Jan". */
  range: string | null;
  /** Safe file-name part: "2026-27", "2026-27-Q3", "2026-11-01_2026-11-12". */
  fileStem: string;
  /** Totals CSV "period" column: "2026/27", "2026/27 Q3", "2026-11-01..2026-11-12". */
  csvLabel: string;
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

export function periodFor(region: Region, startYear: number, mode: PeriodMode, custom?: Period): ReportPeriod {
  const year = taxYearFor(startYear, region);
  const yearStem = year.label.replace('/', '-');
  if (mode === 'year') {
    return { mode, year, start: year.start, end: year.end, label: `Tax year ${year.label}`, range: null, fileStem: yearStem, csvLabel: year.label };
  }
  if (mode === 'custom') {
    const c = custom ?? { start: year.start, end: year.end };
    const last = c.end - 1;
    const sameYear = new Date(c.start).getFullYear() === new Date(last).getFullYear();
    const label = `${dayMonth(c.start)}${sameYear ? '' : ` ${new Date(c.start).getFullYear()}`} – ${dayMonth(last)} ${new Date(last).getFullYear()}`;
    return {
      mode,
      year: taxYearOf(c.start, region),
      start: c.start,
      end: c.end,
      label,
      range: null,
      fileStem: `${iso(c.start)}_${iso(last)}`,
      csvLabel: `${iso(c.start)}..${iso(last)}`,
    };
  }
  const q = quartersOf(year, region)[Number(mode[1]) - 1];
  return {
    mode,
    year,
    start: q.start,
    end: q.end,
    label: `Q${q.index} ${year.label}`,
    range: q.label,
    fileStem: `${yearStem}-Q${q.index}`,
    csvLabel: `${year.label} Q${q.index}`,
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
