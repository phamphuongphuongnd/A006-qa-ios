import type { Period, Region } from './types';

export interface TaxYear extends Period {
  /** Calendar year the tax year starts in (UK 2026/27 -> 2026). */
  startYear: number;
  /** "2026/27" (UK) or "2026" (US). */
  label: string;
}

const ms = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

/** UK tax year runs 6 April → 5 April; US uses the calendar year. Local time. */
export function taxYearFor(startYear: number, region: Region): TaxYear {
  if (region === 'UK') {
    return {
      startYear,
      label: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
      start: ms(startYear, 3, 6),
      end: ms(startYear + 1, 3, 6),
    };
  }
  return { startYear, label: String(startYear), start: ms(startYear, 0, 1), end: ms(startYear + 1, 0, 1) };
}

export function taxYearOf(at: number | Date, region: Region): TaxYear {
  const d = new Date(at);
  const y = d.getFullYear();
  if (region === 'US') return taxYearFor(y, region);
  // 5 April belongs to the previous tax year; 6 April starts a new one.
  const beforeApr6 = d.getMonth() < 3 || (d.getMonth() === 3 && d.getDate() < 6);
  return taxYearFor(beforeApr6 ? y - 1 : y, region);
}

export interface Quarter extends Period {
  index: 1 | 2 | 3 | 4;
  label: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * UK quarters (MTD standard periods): 6 Apr–5 Jul, 6 Jul–5 Oct, 6 Oct–5 Jan, 6 Jan–5 Apr.
 * US: calendar quarters.
 */
export function quartersOf(year: TaxYear, region: Region): Quarter[] {
  const y = year.startYear;
  const bounds =
    region === 'UK'
      ? [ms(y, 3, 6), ms(y, 6, 6), ms(y, 9, 6), ms(y + 1, 0, 6), ms(y + 1, 3, 6)]
      : [ms(y, 0, 1), ms(y, 3, 1), ms(y, 6, 1), ms(y, 9, 1), ms(y + 1, 0, 1)];
  return [0, 1, 2, 3].map((i) => {
    const start = bounds[i];
    const end = bounds[i + 1];
    const last = new Date(end - 1);
    const first = new Date(start);
    return {
      index: (i + 1) as Quarter['index'],
      start,
      end,
      label: `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`,
    };
  });
}

export const inPeriod = (at: number, p: Period) => at >= p.start && at < p.end;
