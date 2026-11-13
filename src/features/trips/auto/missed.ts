// Pure: "No trips on Tue or Wed" (F-12: ≥ 2 days with entries but no trips → Home card only, no push).
import type { WorkHoursCfg } from './classify';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const NO_TRIPS_MIN_DAYS = 2;
/** Look back this many days (yesterday backwards; today may still get a trip). */
export const NO_TRIPS_LOOKBACK_DAYS = 7;

/** Local 'YYYY-MM-DD'. */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local midnight `n` days before the day of `now`. */
export function dayStart(now: number, daysBack = 0): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.getTime();
}

/**
 * Days in the look-back window that had entries but no trip, oldest first, as short names ("Tue").
 * With work hours on only work days count. Days the driver already answered "Not driving" for are skipped.
 * Returns [] below NO_TRIPS_MIN_DAYS.
 */
export function noTripsDays(input: {
  now: number;
  entryTimes: number[];
  tripTimes: number[];
  workHours: WorkHoursCfg;
  dismissed: string[];
}): string[] {
  const entryDays = new Set(input.entryTimes.map(dayKey));
  const tripDays = new Set(input.tripTimes.map(dayKey));
  const dismissed = new Set(input.dismissed);
  const out: { key: string; at: number }[] = [];
  for (let back = NO_TRIPS_LOOKBACK_DAYS; back >= 1; back--) {
    const at = dayStart(input.now, back) + 12 * 3_600_000;
    const key = dayKey(at);
    if (input.workHours.on && !input.workHours.days.includes(new Date(at).getDay())) continue;
    if (entryDays.has(key) && !tripDays.has(key) && !dismissed.has(key)) out.push({ key, at });
  }
  if (out.length < NO_TRIPS_MIN_DAYS) return [];
  return out.map((d) => DAY_NAMES[new Date(d.at).getDay()]);
}

/** Day keys behind the names `noTripsDays` returned (same window), for "Not driving". */
export function noTripsDayKeys(input: Parameters<typeof noTripsDays>[0]): string[] {
  const entryDays = new Set(input.entryTimes.map(dayKey));
  const tripDays = new Set(input.tripTimes.map(dayKey));
  const out: string[] = [];
  for (let back = NO_TRIPS_LOOKBACK_DAYS; back >= 1; back--) {
    const at = dayStart(input.now, back) + 12 * 3_600_000;
    const key = dayKey(at);
    if (input.workHours.on && !input.workHours.days.includes(new Date(at).getDay())) continue;
    if (entryDays.has(key) && !tripDays.has(key)) out.push(key);
  }
  return out;
}
