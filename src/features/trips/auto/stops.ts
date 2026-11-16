// Pure: Stops inside a trip and Personal segments around them (Q6, S-07c).
import { haversine, trackDistance } from '@/domain/mileage';

export interface TrackPoint {
  ts: number;
  lat: number;
  lng: number;
  accuracy: number;
  segmentStart?: boolean;
}

export interface Stop {
  startedAt: number;
  endedAt: number;
  lat: number;
  lng: number;
}

/** A gap between kept fixes at least this long, with the vehicle in about the same place, is a Stop (a drop). */
export const STOP_MIN_MS = 3 * 60_000;
export const STOP_MAX_MOVE_M = 250;

/**
 * Stops from a recorded track. Fixes taken while standing still are dropped when recording, so a Stop shows as a
 * long time gap between two kept fixes close to each other. Gaps across a Personal stop (segment start) are skipped.
 */
export function findStops(points: TrackPoint[]): Stop[] {
  const out: Stop[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.segmentStart) continue;
    if (b.ts - a.ts >= STOP_MIN_MS && haversine(a, b) <= STOP_MAX_MOVE_M) {
      out.push({ startedAt: a.ts, endedAt: b.ts, lat: a.lat, lng: a.lng });
    }
  }
  return out;
}

/** Distance of the track between two times (inclusive). */
export function distanceBetween(points: TrackPoint[], fromTs: number, toTs: number): number {
  return trackDistance(points.filter((p) => p.ts >= fromTs && p.ts <= toTs));
}

export interface SegmentRange {
  fromTs: number;
  toTs: number;
}

/**
 * The drive to a stop (from the previous stop / trip start) or from it (to the next stop / trip end).
 * `stops` sorted by time; `trip` = recorded start / end.
 */
export function segmentForStop(
  stops: Stop[],
  index: number,
  side: 'to' | 'from',
  trip: { startedAt: number; endedAt: number },
): SegmentRange {
  const s = stops[index];
  if (side === 'to') return { fromTs: index > 0 ? stops[index - 1].endedAt : trip.startedAt, toTs: s.startedAt };
  return { fromTs: s.endedAt, toTs: index < stops.length - 1 ? stops[index + 1].startedAt : trip.endedAt };
}

/** Work / Personal metres of a trip given its Personal segments (each with its own distance). */
export function splitMiles(totalM: number, tripScope: string, segments: { distanceM: number; scope: string }[]) {
  const personalSeg = segments.filter((s) => s.scope === 'personal').reduce((s, x) => s + x.distanceM, 0);
  if (tripScope === 'personal') return { workM: 0, personalM: totalM };
  const personalM = Math.min(totalM, personalSeg);
  return { workM: Math.max(0, totalM - personalM), personalM };
}

/** Same range already covered (toggle off on a second tap). */
export const sameRange = (a: SegmentRange, b: SegmentRange) => a.fromTs === b.fromTs && a.toTs === b.toTs;
