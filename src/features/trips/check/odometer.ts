import { KM_PER_MILE } from '@/domain/mileage';
import type { Region } from '@/domain/types';

/**
 * Odometer check (Q27, free): the driver types the odometer now and then; the rise since the previous reading is
 * compared with every mile the app logged in between (Work + Personal + Unsorted, all sources). A difference of
 * max(10 mi, 5 % of the rise) or more either way is worth a look.
 */

export type OdometerCadence = 'off' | 'weekly' | 'monthly';

export const ODO_MIN_DIFF_MILES = 10;
export const ODO_DIFF_SHARE = 0.05;

export interface Reading {
  id: string;
  readAt: number;
  value: number;
  unit: 'mi' | 'km';
}

export const readingMiles = (r: Pick<Reading, 'value' | 'unit'>) => (r.unit === 'km' ? r.value / KM_PER_MILE : r.value);

export type OdometerResult =
  /** First reading (or the odometer went down: new vehicle / new odometer → a new starting point). */
  | { kind: 'start' }
  | { kind: 'match'; odoMiles: number; appMiles: number }
  /** The odometer rose more than the app logged: `diffMiles` not logged. */
  | { kind: 'missing'; odoMiles: number; appMiles: number; diffMiles: number }
  /** The app logged more than the odometer rose. */
  | { kind: 'over'; odoMiles: number; appMiles: number; diffMiles: number };

export const odometerThreshold = (odoMiles: number) => Math.max(ODO_MIN_DIFF_MILES, ODO_DIFF_SHARE * odoMiles);

/** Compare a reading with the previous one; `appMiles` = miles logged from `prev.readAt` up to `cur.readAt`. */
export function compareReadings(prev: Reading | null, cur: Reading, appMiles: number): OdometerResult {
  if (!prev) return { kind: 'start' };
  const odoMiles = readingMiles(cur) - readingMiles(prev);
  if (odoMiles < 0) return { kind: 'start' };
  const diff = odoMiles - appMiles;
  if (Math.abs(diff) < odometerThreshold(odoMiles)) return { kind: 'match', odoMiles, appMiles };
  return diff > 0 ? { kind: 'missing', odoMiles, appMiles, diffMiles: diff } : { kind: 'over', odoMiles, appMiles, diffMiles: -diff };
}

// ---------------- Reminders ----------------

/** Reminder hour on the due day (silent notification). */
export const ODO_REMIND_HOUR = 9;

const atDay = (y: number, m: number, d: number) => new Date(y, m, d, 0, 0, 0, 0).getTime();

/**
 * Start of the current check period: the last Monday (weekly) or the 1st of the month (monthly) at 00:00 local, and
 * for UK drivers also 6 April (start of the tax year) when that is later. null when the check is off.
 */
export function periodStart(cadence: OdometerCadence, region: Region, now: number): number | null {
  if (cadence === 'off') return null;
  const d = new Date(now);
  let start: number;
  if (cadence === 'weekly') {
    const back = (d.getDay() + 6) % 7; // days since Monday
    start = atDay(d.getFullYear(), d.getMonth(), d.getDate() - back);
  } else start = atDay(d.getFullYear(), d.getMonth(), 1);
  if (region === 'UK') {
    const apr6 = atDay(d.getFullYear(), 3, 6);
    if (apr6 <= now && apr6 > start) start = apr6;
  }
  return start;
}

/** Next period start after `now` (when the reminder fires). */
export function nextPeriodStart(cadence: OdometerCadence, region: Region, now: number): number | null {
  if (cadence === 'off') return null;
  const d = new Date(now);
  let next: number;
  if (cadence === 'weekly') {
    const ahead = 7 - ((d.getDay() + 6) % 7);
    next = atDay(d.getFullYear(), d.getMonth(), d.getDate() + ahead);
  } else next = atDay(d.getFullYear(), d.getMonth() + 1, 1);
  if (region === 'UK') {
    for (const y of [d.getFullYear(), d.getFullYear() + 1]) {
      const apr6 = atDay(y, 3, 6);
      if (apr6 > now && apr6 < next) next = apr6;
    }
  }
  return next;
}

/**
 * "Time for an odometer check" is due when a period started and no reading was taken since. Before the first reading
 * it waits for a period that started after the driver's first trip (a new driver is not asked on day one).
 */
export function odometerDue(input: {
  cadence: OdometerCadence;
  region: Region;
  now: number;
  lastReadingAt: number | null;
  firstTripAt: number | null;
}): boolean {
  const start = periodStart(input.cadence, input.region, input.now);
  if (start === null) return false;
  if (input.lastReadingAt !== null) return input.lastReadingAt < start;
  return input.firstTripAt !== null && input.firstTripAt < start;
}

/** When the silent "Odometer check" notification fires next: 09:00 on the next period start (today's if still ahead). */
export function nextOdometerReminder(cadence: OdometerCadence, region: Region, now: number): number | null {
  const cur = periodStart(cadence, region, now);
  if (cur === null) return null;
  const today = cur + ODO_REMIND_HOUR * 60 * 60 * 1000;
  if (today > now) return today;
  const next = nextPeriodStart(cadence, region, now);
  return next === null ? null : next + ODO_REMIND_HOUR * 60 * 60 * 1000;
}
