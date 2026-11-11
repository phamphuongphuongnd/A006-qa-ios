import type { Minor, Region } from './types';

export const METERS_PER_MILE = 1609.344;

export const metersToMiles = (m: number) => m / METERS_PER_MILE;
export const milesToMeters = (mi: number) => Math.round(mi * METERS_PER_MILE);

export interface RateTier {
  /** Miles covered by this tier within one tax year; null = no limit. */
  upToMiles: number | null;
  /** Minor units (pence / cents) per mile. */
  minorPerMile: number;
}

/**
 * Defaults, editable in Settings. UK: HMRC approved mileage rates for cars and vans.
 * US: IRS standard business mileage rate — re-check every January.
 */
export const DEFAULT_RATES: Record<Region, RateTier[]> = {
  UK: [
    { upToMiles: 10_000, minorPerMile: 45 },
    { upToMiles: null, minorPerMile: 25 },
  ],
  US: [{ upToMiles: null, minorPerMile: 70 }],
};

/** Tiered estimate for a tax year's business miles. Estimate only — not tax advice. */
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

/**
 * Distance in metres along recorded points. Skips poor fixes (accuracy > 50 m), teleport jumps, and gaps
 * across personal stops (points flagged `segmentStart`).
 */
export function trackDistance(points: GpsPoint[]): number {
  let total = 0;
  let prev: GpsPoint | null = null;
  for (const p of points) {
    if (p.accuracy > MAX_ACCURACY_M) continue;
    if (prev && !p.segmentStart) {
      const d = haversine(prev, p);
      const dt = (p.ts - prev.ts) / 1000;
      if (dt > 0 && d / dt <= MAX_SPEED_MPS) total += d;
      else if (dt > 0) continue; // drop the glitch point, keep prev
    }
    prev = p;
  }
  return total;
}

/** A trip running longer than this triggers "Still driving?". */
export const TRIP_REMINDER_MS = 12 * 60 * 60 * 1000;
