import { haversine, metersToMiles, milesToMeters } from '@/domain/mileage';

/**
 * Missing trip (Q26, free): between two consecutive trips that have coordinates (GPS / Auto / NFC — typed-in trips are
 * skipped), the end of the earlier one and the start of the later one are ≥ 1 mi apart in a straight line → the driver
 * probably drove that bit with nothing recording. Gaps are worked out when shown, never stored; only the driver's
 * answer ("Not a trip" / "Add") is kept (trip_gap_dismissals).
 */

/** Straight-line distance that counts as a gap. */
export const GAP_MIN_MILES = 1;
/** Only trips from the last 30 days are compared. */
export const GAP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * A gap that would need more than this straight-line speed between the two trips was not driven (GPS jump, mock
 * location, a flight): not offered.
 */
export const GAP_MAX_SPEED_MPH = 100;
/** Nor is a straight line this long (another vehicle, a flight, mixed-up locations). */
export const GAP_MAX_MILES = 500;
/** Roads are longer than a straight line: estimate = straight line × 1.25. */
export const GAP_ROAD_FACTOR = 1.25;

export interface LatLng {
  lat: number;
  lng: number;
}

/** A finished trip with its first and last recorded point. */
export interface TripEnds {
  id: string;
  startedAt: number;
  endedAt: number;
  first: LatLng;
  last: LatLng;
}

export interface TripGap {
  /** `${prevId}>${nextId}` — stable while both trips exist. */
  key: string;
  prevId: string;
  nextId: string;
  /** When the earlier trip stopped / the later one started (the estimated trip's times). */
  from: number;
  to: number;
  fromAt: LatLng;
  toAt: LatLng;
  straightM: number;
  /** Straight line × 1.25, in metres. */
  estimateM: number;
}

export const gapKey = (prevId: string, nextId: string) => `${prevId}>${nextId}`;

/** Straight line × 1.25, rounded to 0.1 mi (what the "≈ 6.2 mi" line and the Add form show). */
export function estimateGapMiles(straightM: number): number {
  return Math.round(metersToMiles(straightM) * GAP_ROAD_FACTOR * 10) / 10;
}

/**
 * Gaps between consecutive trips (by start time), newest first. `trips` may come in any order; trips older than the
 * window (by start) are ignored, and `answered` holds gap keys the driver already answered.
 */
export function findGaps(trips: TripEnds[], answered: ReadonlySet<string>, now: number): TripGap[] {
  const since = now - GAP_WINDOW_MS;
  const sorted = trips.filter((t) => t.startedAt >= since).sort((a, b) => a.startedAt - b.startedAt);
  const out: TripGap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    // Overlapping trips (should not happen) are not a gap.
    if (next.startedAt < prev.endedAt) continue;
    const key = gapKey(prev.id, next.id);
    if (answered.has(key)) continue;
    const straightM = haversine(prev.last, next.first);
    const miles = metersToMiles(straightM);
    if (miles < GAP_MIN_MILES || miles > GAP_MAX_MILES) continue;
    const hours = Math.max(next.startedAt - prev.endedAt, 60_000) / 3_600_000;
    if (miles / hours > GAP_MAX_SPEED_MPH) continue;
    out.push({
      key,
      prevId: prev.id,
      nextId: next.id,
      from: prev.endedAt,
      to: next.startedAt,
      fromAt: prev.last,
      toAt: next.first,
      straightM,
      estimateM: milesToMeters(estimateGapMiles(straightM)),
    });
  }
  return out.reverse();
}

/** Gaps whose later trip started in the last `days` days (Home card "this week"). */
export const recentGaps = (gaps: TripGap[], now: number, days = 7) => gaps.filter((g) => g.to >= now - days * 24 * 60 * 60 * 1000);

// ---------------- Pro: driving distance through openrouteservice ----------------

/** Gaps still waiting for a driving distance; nothing for free users or builds without the route service. */
export function gapsToRoute(gaps: TripGap[], cached: Record<string, number>, pro: boolean, hasService: boolean): TripGap[] {
  return pro && hasService ? gaps.filter((g) => cached[g.key] === undefined) : [];
}

/** Driving distance once fetched (> 0), else the straight-line estimate. */
export function gapDistance(g: TripGap, cached: Record<string, number>): { meters: number; routed: boolean } {
  const m = cached[g.key];
  return m !== undefined && m > 0 ? { meters: m, routed: true } : { meters: g.estimateM, routed: false };
}

/**
 * Asks for each gap's driving distance one at a time. A gap with no road between its ends is saved as -1 (asked, keep
 * the estimate); offline / out of quota / any other error stops the run (try again next time the screen opens).
 */
export async function fetchGapRoutes(
  gaps: TripGap[],
  route: (a: LatLng, b: LatLng) => Promise<{ meters: number }>,
  save: (key: string, meters: number) => void,
  aborted: () => boolean = () => false,
): Promise<void> {
  for (const g of gaps) {
    if (aborted()) return;
    try {
      const r = await route(g.fromAt, g.toAt);
      if (aborted()) return;
      save(g.key, r.meters);
    } catch (e) {
      if ((e as { kind?: string } | null)?.kind === 'no_route') save(g.key, -1);
      else return;
    }
  }
}
