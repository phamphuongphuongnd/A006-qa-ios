import { formatRate, mileageEstimateByDate, periodsIn, type RateTier } from '@/domain/mileage';
import type { EntryType, Minor, Period, Scope } from '@/domain/types';

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
export function monthlySeries(
  entries: { type: EntryType; amountMinor: Minor; occurredAt: number; scope: Scope }[],
  period: Period,
  opts: { includePersonal?: boolean; now?: number } = {},
): MonthPoint[] {
  const now = opts.now ?? Date.now();
  const first = new Date(period.start);
  const buckets: MonthPoint[] = [];
  for (let i = 0; ; i++) {
    const start = i === 0 ? period.start : new Date(first.getFullYear(), first.getMonth() + i, first.getDate()).getTime();
    if (start >= period.end || (start > now && buckets.length > 0)) break;
    const next = new Date(first.getFullYear(), first.getMonth() + i + 1, first.getDate()).getTime();
    buckets.push({ start, end: Math.min(next, period.end), label: MONTHS[new Date(start).getMonth()], incomeMinor: 0, expenseMinor: 0 });
  }
  for (const e of entries) {
    if (e.scope === 'personal' && !opts.includePersonal) continue;
    const b = buckets.find((x) => e.occurredAt >= x.start && e.occurredAt < x.end);
    if (!b) continue;
    if (e.type === 'income') b.incomeMinor += e.amountMinor;
    else b.expenseMinor += e.amountMinor;
  }
  return buckets;
}

/**
 * Mileage estimate for part of a tax year with date-ranged rates. Tiers (UK 45p for the first 10,000) count from the
 * start of the tax year, so a quarter is priced as (year-to-end) − (year-to-start). `yearTrips` = the tax year's work
 * trips. Estimate only — not tax advice.
 */
export function periodMileageEstimate(yearTrips: { at: number; miles: number }[], start: number, end: number, rates: RateTier[]): Minor {
  const upTo = (t: number) => mileageEstimateByDate(yearTrips.filter((x) => x.at < t), rates);
  return upTo(end) - upTo(start);
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
