import type { Minor, Region } from './types';

export const METERS_PER_MILE = 1609.344;

export const metersToMiles = (m: number) => m / METERS_PER_MILE;
export const milesToMeters = (mi: number) => Math.round(mi * METERS_PER_MILE);

/** B-50: a trip ended from an NFC tag / `sundaysort://trip/toggle` under 0.1 mi is not kept (a double tap, no drive). */
export const MIN_KEPT_TRIP_M = 0.1 * METERS_PER_MILE;
export const tooShortToKeep = (distanceM: number) => !(distanceM >= MIN_KEPT_TRIP_M);

export interface RateTier {
  /** Miles covered by this tier within one tax year; null = no limit. */
  upToMiles: number | null;
  /** Minor units (pence / cents) per mile. */
  minorPerMile: number;
  /**
   * First day this tier applies, local date 'YYYY-MM-DD'. Missing = applies from the beginning.
   * Tiers sharing a `from` form one rate period (see `ratePeriods`).
   */
  from?: string;
}

/**
 * Defaults, editable in Settings (route /mileage-rates). UK: HMRC approved mileage rates for cars and vans —
 * 45p / 25p until 5 Apr 2026, 55p / 25p from 6 Apr 2026 (gov.uk policy paper, 17 Jun 2026; the 10,000-mile
 * threshold counts cumulative miles in the tax year). US: IRS 2026 business rate 72.5¢ (IR-2025-128), 76¢ for miles driven from 1 Jul 2026. Re-check every January.
 */
export const DEFAULT_RATES: Record<Region, RateTier[]> = {
  UK: [
    { upToMiles: 10_000, minorPerMile: 45 },
    { upToMiles: null, minorPerMile: 25 },
    { upToMiles: 10_000, minorPerMile: 55, from: '2026-04-06' },
    { upToMiles: null, minorPerMile: 25, from: '2026-04-06' },
  ],
  US: [
    { upToMiles: null, minorPerMile: 72.5 },
    { upToMiles: null, minorPerMile: 76, from: '2026-07-01' },
  ],
};

/** UK default before the 2026/27 change. Stored settings still holding exactly this are read as `DEFAULT_RATES.UK`. */
export const LEGACY_UK_RATES: RateTier[] = [
  { upToMiles: 10_000, minorPerMile: 45 },
  { upToMiles: null, minorPerMile: 25 },
];

/**
 * Tiered estimate for a tax year's business miles. Estimate only — not tax advice.
 * Ignores `from` dates; use `mileageEstimateByDate` for date-ranged rates.
 */
export function mileageEstimate(businessMiles: number, tiers: RateTier[]): Minor {
  let left = Math.max(0, businessMiles);
  let used = 0;
  let total = 0;
  for (const t of tiers) {
    if (left <= 0) break;
    const room = t.upToMiles === null ? left : Math.max(0, t.upToMiles - used);
    const take = Math.min(left, room);
    total += take * t.minorPerMile;
    left -= take;
    used += take;
  }
  return Math.round(total);
}

export type OdometerCheck = { ok: true; miles: number } | { ok: false; reason: 'end_before_start' | 'invalid' };

export function odometerMiles(start: number, end: number): OdometerCheck {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) return { ok: false, reason: 'invalid' };
  if (end <= start) return { ok: false, reason: 'end_before_start' };
  return { ok: true, miles: end - start };
}

/** Manual trips above this ask "That's a long trip — save anyway?". */
export const LONG_TRIP_MILES = 1000;

export interface GpsPoint {
  ts: number;
  lat: number;
  lng: number;
  /** Horizontal accuracy in metres. */
  accuracy: number;
  /** True for the first point recorded after a resume — no distance is counted from the previous point. */
  segmentStart?: boolean;
}

const EARTH_R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

export const MAX_ACCURACY_M = 50;
/** ≈ 125 mph: faster jumps between fixes are GPS glitches. */
export const MAX_SPEED_MPS = 56;

/** Smallest move counted, even with perfect fixes. */
export const MIN_MOVE_M = 25;
/** Upper bound for the jitter threshold so long, poor-signal stretches still count. */
export const MAX_MOVE_THRESHOLD_M = 80;

/**
 * Distance in metres along recorded points. Skips poor fixes (accuracy > 50 m), teleport jumps, and gaps
 * across personal stops (points flagged `segmentStart`).
 *
 * Jitter filter: distance is measured from an anchor (the last counted point) and only counted once a fix is
 * farther from it than both fixes' accuracy combined (at least 25 m). A phone lying still — fixes wandering
 * 20–40 m around one spot — then adds nothing, while real driving loses nothing: the move is counted from the
 * anchor as soon as it clears the threshold.
 */
export function trackDistance(points: GpsPoint[]): number {
  return walkTrack(points).distance;
}

/** The fixes that count (start of each segment + every anchor) — what the route sketch should draw. */
export function countedPath<T extends GpsPoint>(points: T[]): T[] {
  return walkTrack(points).path;
}

/** This many fixes in a row that agree with each other but not with the anchor: the anchor was the glitch (QA A37-11). */
export const REANCHOR_AFTER = 3;

const plausible = (a: GpsPoint, b: GpsPoint) => {
  const dt = (b.ts - a.ts) / 1000;
  return dt > 0 && haversine(a, b) / dt <= MAX_SPEED_MPS;
};

function walkTrack<T extends GpsPoint>(points: T[]): { distance: number; path: T[] } {
  let total = 0;
  let anchor: T | null = null;
  const path: T[] = [];
  // Fixes dropped as glitches since the last kept one, while they agree with each other.
  let rejected: T[] = [];
  const step = (p: T) => {
    if (!anchor) return;
    const d = haversine(anchor, p);
    const threshold = Math.min(MAX_MOVE_THRESHOLD_M, Math.max(MIN_MOVE_M, anchor.accuracy + p.accuracy));
    if (d < threshold) return; // still within the noise around the anchor
    total += d;
    anchor = p;
    path.push(p);
  };
  for (const p of points) {
    if (p.accuracy > MAX_ACCURACY_M) continue;
    if (!anchor || p.segmentStart) {
      anchor = p;
      path.push(p);
      rejected = [];
      continue;
    }
    if (!plausible(anchor, p)) {
      // Glitch: drop the point, keep the anchor — unless the anchor itself was the odd one out (A37-11: a stale fix far
      // away as the first point made every real fix after it look impossible, and the trip stayed at 0.0 mi).
      rejected = rejected.length && plausible(rejected[rejected.length - 1], p) ? [...rejected, p] : [p];
      if (rejected.length >= REANCHOR_AFTER) {
        const [first, ...rest] = rejected;
        anchor = first;
        path.push(first);
        rejected = [];
        rest.forEach(step);
      }
      continue;
    }
    rejected = [];
    step(p);
  }
  return { distance: total, path };
}

/** Below this reported speed (≈ 2 mph) the phone is treated as standing still. */
export const STATIONARY_SPEED_MPS = 1;
/** A fix this far from the last stored one is kept whatever the speed says (guards phones that report 0). */
export const STATIONARY_MAX_RADIUS_M = 150;

/**
 * True when a new fix is just noise around a phone that isn't moving: the OS reports a speed below ~2 mph and the
 * fix is still within 150 m of the last stored point. Such fixes are not stored, so a trip left running indoors or
 * at a long red light adds no miles. Unknown speed (null / negative) keeps the fix.
 */
export function isStationaryFix(
  prev: { lat: number; lng: number } | null,
  fix: { lat: number; lng: number; accuracy?: number; speed?: number | null },
  opts: { sensorStill?: boolean; onFoot?: boolean; walkSpeed?: boolean } = {},
): boolean {
  // B-143 (Phương 20/11): the motion sensor says walking / running → the driver walked away from the van (a delivery,
  // home): never the van's miles, not even the first fix.
  if (opts.onFoot) return true;
  if (!prev) return false;
  // Phương 19/11 (A13: a trip started at home kept adding miles, an automatic one never ended): the motion sensor says
  // the phone is still → no fix counts, whatever GPS wanders to.
  if (opts.sensorStill) return true;
  // B-143: after the van stopped, a walking pace is someone walking (features/trips/auto/engine.ts recordingFilter).
  if (opts.walkSpeed && fix.speed != null && fix.speed >= 0 && fix.speed < WALK_AFTER_DRIVE_MAX_MPS) return true;
  if (fix.speed == null || fix.speed < 0) {
    // Indoors / network fixes come without a speed and wander 25–80 m: only a sure fix that moved well away counts.
    return (fix.accuracy ?? Infinity) > NO_SPEED_MAX_ACCURACY_M || haversine(prev, fix) < NO_SPEED_MIN_MOVE_M;
  }
  return fix.speed < STATIONARY_SPEED_MPS && haversine(prev, fix) < STATIONARY_MAX_RADIUS_M;
}

/** B-143: a fix slower than this (9 km/h) after the van stopped is someone walking. */
export const WALK_AFTER_DRIVE_MAX_MPS = 2.5;

/** A fix without an OS speed counts only when it is at least this sure… */
export const NO_SPEED_MAX_ACCURACY_M = 30;
/** …and at least this far from the last kept fix. */
export const NO_SPEED_MIN_MOVE_M = 100;

/** Around where the vehicle parked, GPS wander is part of the Stop, never driving (CONTEXT: Stop). */
export const STOP_RADIUS_M = 100;

/**
 * When the vehicle last really moved: the start of the final cluster of fixes that all lie within STOP_RADIUS_M of the
 * newest good fix (poor fixes are ignored). A Trip ends on its own once this is older than the merge threshold
 * (CONTEXT: Trip end). With no fix yet, `fallback`.
 */
export function parkedSince(points: { lat: number; lng: number; ts: number; accuracy: number }[], fallback: number): number {
  const good = points.filter((p) => p.accuracy <= MAX_ACCURACY_M);
  if (!good.length) return fallback;
  const last = good[good.length - 1];
  let since = last.ts;
  for (let i = good.length - 2; i >= 0; i--) {
    if (haversine(good[i], last) > STOP_RADIUS_M) break;
    since = good[i].ts;
  }
  return Math.max(since, fallback);
}

/** A trip running longer than this triggers "Still driving?". */
export const TRIP_REMINDER_MS = 12 * 60 * 60 * 1000;

// ---------------- Date-ranged rates (F-13) ----------------

export interface RatePeriod {
  /** 'YYYY-MM-DD' (local) or null = from the beginning. */
  from: string | null;
  tiers: RateTier[];
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → local midnight in ms; null when not a real date. */
export function parseLocalDate(s: string): number | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt.getTime();
}

/** ms → local 'YYYY-MM-DD'. */
export function toLocalDate(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const periodStart = (p: RatePeriod) => (p.from === null ? -Infinity : (parseLocalDate(p.from) ?? Infinity));

/** Group a flat rate list into periods, oldest first. Tier order inside a period is kept. */
export function ratePeriods(rates: RateTier[]): RatePeriod[] {
  const map = new Map<string | null, RateTier[]>();
  for (const r of rates) {
    const key = r.from ?? null;
    map.set(key, [...(map.get(key) ?? []), { upToMiles: r.upToMiles, minorPerMile: r.minorPerMile }]);
  }
  return [...map.entries()]
    .map(([from, tiers]) => ({ from, tiers }))
    .sort((a, b) => periodStart(a) - periodStart(b) || (a.from ?? '').localeCompare(b.from ?? ''));
}

/** Inverse of `ratePeriods` — the flat shape stored in settings. */
export function flattenPeriods(periods: RatePeriod[]): RateTier[] {
  return periods.flatMap((p) =>
    p.tiers.map((t) => (p.from ? { upToMiles: t.upToMiles, minorPerMile: t.minorPerMile, from: p.from } : { upToMiles: t.upToMiles, minorPerMile: t.minorPerMile })),
  );
}

/** Tiers in force on a day: the latest period starting on or before it (the first period if none has started). */
export function ratesOn(rates: RateTier[], at: number): RateTier[] {
  const periods = ratePeriods(rates);
  if (periods.length === 0) return [];
  let pick = periods[0];
  for (const p of periods) if (periodStart(p) <= at) pick = p;
  return pick.tiers;
}

/** Cost of the miles from cumulative position `used` to `used + miles` at the given tiers (fractional minor units). */
function tieredCost(used: number, miles: number, tiers: RateTier[]): number {
  let total = 0;
  let pos = used;
  let left = miles;
  for (const t of tiers) {
    if (left <= 0) break;
    const ceil = t.upToMiles === null ? Infinity : t.upToMiles;
    if (pos >= ceil) continue;
    const take = Math.min(left, ceil - pos);
    total += take * t.minorPerMile;
    left -= take;
    pos += take;
  }
  return total;
}

/**
 * Estimate for one tax year's business trips with date-ranged rates. Tier thresholds (UK 10,000 mi) count
 * cumulative miles in date order; each trip is priced at the rates in force on its day.
 * Estimate only — not tax advice.
 */
export function mileageEstimateByDate(trips: { at: number; miles: number }[], rates: RateTier[]): Minor {
  const sorted = trips.filter((t) => t.miles > 0).sort((a, b) => a.at - b.at);
  let used = 0;
  let total = 0;
  for (const t of sorted) {
    total += tieredCost(used, t.miles, ratesOn(rates, t.at));
    used += t.miles;
  }
  return Math.round(total);
}

/**
 * The day this tax year's business miles passed the first tier's limit (UK 10,000 mi), counting cumulative miles in
 * date order like `mileageEstimateByDate` — for the Miles line "10,000 mi at 55p reached on 14 Aug · now 25p" (B-49).
 * Null while under the limit or when the rates have a single tier (US).
 */
export function tierThresholdReached(
  trips: { at: number; miles: number }[],
  rates: RateTier[],
): { at: number; limitMiles: number; fromMinor: number; toMinor: number } | null {
  const sorted = trips.filter((t) => t.miles > 0).sort((a, b) => a.at - b.at);
  let used = 0;
  for (const t of sorted) {
    const tiers = ratesOn(rates, t.at);
    const first = tiers[0];
    if (first && first.upToMiles !== null && tiers[1] && used < first.upToMiles && used + t.miles >= first.upToMiles) {
      return { at: t.at, limitMiles: first.upToMiles, fromMinor: first.minorPerMile, toMinor: tiers[1].minorPerMile };
    }
    used += t.miles;
  }
  return null;
}

/** Rate periods overlapping [start, end) — what the estimate line should name. */
export function periodsIn(rates: RateTier[], start: number, end: number): RatePeriod[] {
  const periods = ratePeriods(rates);
  return periods.filter((p, i) => {
    const next = periods[i + 1];
    const pEnd = next ? periodStart(next) : Infinity;
    // The first period also covers anything before its start date.
    const pStart = i === 0 ? -Infinity : periodStart(p);
    return pStart < end && pEnd > start;
  });
}

/** 45 → "45p" (GBP); 72.5 → "$0.725", 76 → "$0.76" (USD). */
export function formatRate(minorPerMile: number, currency: 'GBP' | 'USD'): string {
  if (currency === 'GBP') {
    return minorPerMile >= 100 ? `£${(minorPerMile / 100).toFixed(2)}` : `${Math.round(minorPerMile * 1000) / 1000}p`;
  }
  const [w, f = ''] = (minorPerMile / 100).toFixed(4).replace(/0+$/, '').split('.');
  return `$${w}.${f.padEnd(2, '0')}`;
}

export type RatesProblem = 'rate_invalid' | 'date_invalid' | 'date_duplicate';

/** Checks edited rate periods before saving. */
export function validatePeriods(periods: RatePeriod[]): RatesProblem | null {
  if (periods.length === 0 || periods.some((p) => p.tiers.length === 0)) return 'rate_invalid';
  for (const p of periods) {
    for (const t of p.tiers) if (!Number.isFinite(t.minorPerMile) || t.minorPerMile <= 0 || t.minorPerMile > 10_000) return 'rate_invalid';
  }
  for (const p of periods) if (p.from !== null && parseLocalDate(p.from) === null) return 'date_invalid';
  const keys = periods.map((p) => p.from);
  if (new Set(keys).size !== keys.length) return 'date_duplicate';
  return null;
}

export const KM_PER_MILE = 1.609344;

/** 128.4 → "128.4"; 8412 → "8,412" (whole numbers from 1,000 unless `decimals` is given). */
export function formatDistanceNumber(value: number, decimals?: 0 | 1): string {
  const d = decimals ?? (Math.abs(value) >= 1000 ? 0 : 1);
  const [w, f] = Math.max(0, value).toFixed(d).split('.');
  return `${w.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${f ? `.${f}` : ''}`;
}
