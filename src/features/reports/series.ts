import { formatRate, mileageBreakdown, periodsIn, type RateTier } from '@/domain/mileage';
import { taxYearOf } from '@/domain/taxYear';
import type { EntryType, Minor, Period, Region, Scope } from '@/domain/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MonthPoint {
  start: number;
  end: number;
  /** "Apr" — month of the bucket start. */
  label: string;
  incomeMinor: Minor;
  expenseMinor: Minor;
}

/**
 * Month buckets for the "Income vs expenses by month" chart. Buckets start on the period's start day, so a UK tax
 * year gives 12 tax months (6 Apr – 5 May …) and a US year 12 calendar months. Buckets starting after `now` are left
 * out so the line stops at today.
 */
const MAX_BUCKETS = 121;

/** Buckets are consecutive and sorted: binary search (20,000 entries × 120 months was a visible pause). */
function bucketOf(buckets: MonthPoint[], at: number): MonthPoint | undefined {
  let lo = 0;
  let hi = buckets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = buckets[mid];
    if (at < b.start) hi = mid - 1;
    else if (at >= b.end) lo = mid + 1;
    else return b;
  }
  return undefined;
}

export function monthlySeries(
  entries: { type: EntryType; amountMinor: Minor; occurredAt: number; scope: Scope }[],
  period: Period,
  opts: { includePersonal?: boolean; now?: number } = {},
): MonthPoint[] {
  const now = opts.now ?? Date.now();
  const first = new Date(period.start);
  const buckets: MonthPoint[] = [];
  if (Number.isNaN(first.getTime())) return buckets;
  // SPE-1: a hard stop (10 years of months) and no NaN loop for dates outside JS's range.
  for (let i = 0; i < MAX_BUCKETS; i++) {
    const start = i === 0 ? period.start : new Date(first.getFullYear(), first.getMonth() + i, first.getDate()).getTime();
    if (!Number.isFinite(start) || start >= period.end || (start > now && buckets.length > 0)) break;
    const next = new Date(first.getFullYear(), first.getMonth() + i + 1, first.getDate()).getTime();
    buckets.push({ start, end: Math.min(next, period.end), label: MONTHS[new Date(start).getMonth()], incomeMinor: 0, expenseMinor: 0 });
  }
  for (const e of entries) {
    if (e.scope === 'personal' && !opts.includePersonal) continue;
    const b = bucketOf(buckets, e.occurredAt);
    if (!b) continue;
    if (e.type === 'income') b.incomeMinor += e.amountMinor;
    else b.expenseMinor += e.amountMinor;
  }
  return buckets;
}

/**
 * Mileage estimate for part of a tax year with date-ranged rates. Tiers (UK 55p for the first 10,000) count from the
 * start of the tax year: trips before `start` move the counter but are not priced. B-154: the range's own fixed miles
 * are priced line by line (rate × tier, rounded once each), so the quarter's CSV miles × rate give this figure exactly
 * (the old year-to-end − year-to-start could be a penny off). `yearTrips` = the tax year's work trips. Estimate only.
 */
export function periodMileageEstimate(yearTrips: { at: number; miles: number }[], start: number, end: number, rates: RateTier[]): Minor {
  return mileageBreakdown(yearTrips, rates, { start, end }).minor;
}

/**
 * Mileage estimate for any range, which may cross a tax-year boundary (MTD calendar periods start on 1 April, five
 * days before the UK tax year). Each tax-year piece is priced with that year's tier count. `trips` = work trips
 * covering every tax year the range touches.
 */
export function rangeMileageEstimate(trips: { at: number; miles: number }[], start: number, end: number, rates: RateTier[], region: Region): Minor {
  let total = 0;
  for (let from = start; from < end; ) {
    const y = taxYearOf(from, region);
    const to = Math.min(end, y.end);
    total += periodMileageEstimate(
      trips.filter((t) => t.at >= y.start && t.at < y.end),
      from,
      to,
      rates,
    );
    from = to;
  }
  return total;
}

/** The [start, end) to load trips for so `rangeMileageEstimate` can count tiers from each tax year's start. */
export function mileageWindow(start: number, end: number, region: Region): Period {
  return { start: Math.min(start, taxYearOf(start, region).start), end };
}

/** Rates in force during [start, end): "45p / 25p" (UK) · "$0.725 → $0.76" (US, rate changed mid-period). */
export function ratesLabel(rates: RateTier[], currency: 'GBP' | 'USD', start: number, end: number): string {
  return periodsIn(rates, start, end)
    .map((p) => p.tiers.map((t) => formatRate(t.minorPerMile, currency)).join(' / '))
    .join(' → ');
}

/** Y positions for a line chart (0 = top). Returns SVG polyline points. */
export function linePoints(values: number[], max: number, box: { width: number; top: number; bottom: number; padX: number }): string {
  if (values.length === 0) return '';
  const span = box.bottom - box.top;
  const step = values.length > 1 ? (box.width - box.padX * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? box.padX + i * step : box.width / 2;
      const y = box.bottom - (max > 0 ? (v / max) * span : 0);
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    })
    .join(' ');
}
