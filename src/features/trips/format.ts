import { formatDistanceNumber, KM_PER_MILE, metersToMiles, sumTenths } from '@/domain/mileage';

export type DistanceUnit = 'mi' | 'km';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Distance in the display unit (miles or km) from metres. */
export const distanceValue = (meters: number, unit: DistanceUnit) => (unit === 'km' ? meters / 1000 : metersToMiles(meters));

/** B-154: trips' distances in the display unit, each fixed to 0.1 and added up (= the rows shown, added up). */
export const sumTripDistance = (meters: number[], unit: DistanceUnit) => sumTenths(meters.map((m) => distanceValue(m, unit)));

/** 206640 m → "128.4 mi" / "206.6 km"; `decimals` 0 for whole numbers ("612 mi"). */
export function formatDistance(meters: number, unit: DistanceUnit, decimals?: 0 | 1): string {
  return `${formatDistanceNumber(distanceValue(meters, unit), decimals)} ${unit}`;
}

/** Number typed in the display unit → miles (storage works in metres / miles). */
export const inputToMiles = (value: number, unit: DistanceUnit) => (unit === 'km' ? value / KM_PER_MILE : value);

/** 2h 14m · 14m · 0m. */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "14:05" (24-hour, as in the mockups). */
export function formatClock(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Tue 10 Nov". */
export function formatDay(at: number): string {
  const d = new Date(at);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "10 Nov 2026" (rate start dates). */
export function formatLongDate(at: number): string {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "November 2026". */
export function formatMonth(at: number): string {
  const d = new Date(at);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export const sameDay = (a: number, b: number) => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

/** Groups items (already sorted newest first) by calendar month. */
export function groupByMonth<T>(items: T[], at: (t: T) => number): { key: string; label: string; items: T[] }[] {
  const out: { key: string; label: string; items: T[] }[] = [];
  for (const it of items) {
    const d = new Date(at(it));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = out[out.length - 1];
    if (last && last.key === key) last.items.push(it);
    else out.push({ key, label: formatMonth(at(it)), items: [it] });
  }
  return out;
}

/**
 * Parse a typed number: accepts "48,210", "12.5", " 7 ". Returns null for empty / invalid / negative input.
 */
export function parseNumberInput(text: string): number | null {
  const s = text.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
