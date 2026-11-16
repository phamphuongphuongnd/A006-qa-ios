// Pure: a trip's track → GeoJSON lines for the real map (Q25, MapLibre + OpenFreeMap). Same Work / Personal rule as
// the S-07c sketch (`auto/detailSketch.ts`): a piece between two fixes is Personal when its middle falls in a
// Personal segment, or the whole trip is Personal.
import { MAX_ACCURACY_M } from '@/domain/mileage';

import type { SegmentRange } from '../auto/stops';

export type LngLat = [number, number];
/** [west, south, east, north] — MapLibre's LngLatBounds. */
export type Bounds = [number, number, number, number];

export interface MapPoint {
  lat: number;
  lng: number;
  accuracy: number;
  segmentStart?: boolean;
  ts?: number;
}

export interface TripLines {
  work: LngLat[][];
  personal: LngLat[][];
  /** Straight links across a manual Personal stop (recording paused). */
  gaps: LngLat[][];
  start: LngLat | null;
  end: LngLat | null;
  bounds: Bounds | null;
}

const MAX_POINTS = 1500;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const ll = (p: { lat: number; lng: number }): LngLat => [r6(p.lng), r6(p.lat)];

/** Box around all coordinates; a single point gets a small box (~300 m) so the camera has something to fit. */
export function boundsOf(coords: LngLat[]): Bounds | null {
  if (coords.length === 0) return null;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [x, y] of coords) {
    w = Math.min(w, x);
    e = Math.max(e, x);
    s = Math.min(s, y);
    n = Math.max(n, y);
  }
  const minSpan = 0.003;
  if (e - w < minSpan) {
    const c = (e + w) / 2;
    w = c - minSpan / 2;
    e = c + minSpan / 2;
  }
  if (n - s < minSpan) {
    const c = (n + s) / 2;
    s = c - minSpan / 2;
    n = c + minSpan / 2;
  }
  return [w, s, e, n];
}

/** Grows a box by `frac` of its size on every side (static images have no camera padding). */
export function padBounds(b: Bounds, frac: number): Bounds {
  const dx = (b[2] - b[0]) * frac;
  const dy = (b[3] - b[1]) * frac;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
}

export function tripLines(
  points: MapPoint[],
  personal: SegmentRange[] = [],
  allPersonal = false,
  extra: { lat: number; lng: number }[] = [],
): TripLines {
  const good = points.filter((p) => p.accuracy <= MAX_ACCURACY_M);
  if (good.length === 0) return { work: [], personal: [], gaps: [], start: null, end: null, bounds: boundsOf(extra.map(ll)) };
  const step = Math.ceil(good.length / MAX_POINTS);
  const pts = step <= 1 ? good : good.filter((p, i) => i % step === 0 || p.segmentStart || i === good.length - 1);

  const out: TripLines = { work: [], personal: [], gaps: [], start: ll(pts[0]), end: ll(pts[pts.length - 1]), bounds: null };
  let run: LngLat[] = [];
  let kind: 'work' | 'personal' | null = null;
  const flush = () => {
    if (kind && run.length >= 2) out[kind].push(run);
    run = [];
    kind = null;
  };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (b.segmentStart) {
      flush();
      out.gaps.push([ll(a), ll(b)]);
      continue;
    }
    const mid = a.ts !== undefined && b.ts !== undefined ? (a.ts + b.ts) / 2 : null;
    const k = allPersonal || (mid !== null && personal.some((r) => mid >= r.fromTs && mid <= r.toTs)) ? 'personal' : 'work';
    if (k !== kind) {
      flush();
      kind = k;
      run = [ll(a)];
    }
    run.push(ll(b));
  }
  flush();
  out.bounds = boundsOf([...pts.map(ll), ...extra.map(ll)]);
  return out;
}

/** Lines → one FeatureCollection; each feature has `kind` = work | personal | gap for the line layers. */
export function linesFeatureCollection(l: Pick<TripLines, 'work' | 'personal' | 'gaps'>): GeoJSON.FeatureCollection {
  const feat = (kind: string, coordinates: LngLat[][]): GeoJSON.Feature[] =>
    coordinates.length ? [{ type: 'Feature', properties: { kind }, geometry: { type: 'MultiLineString', coordinates } }] : [];
  return { type: 'FeatureCollection', features: [...feat('work', l.work), ...feat('personal', l.personal), ...feat('gap', l.gaps)] };
}

/** Keeps at most `max` points (always the last), for small thumbnails. */
export function thin<T>(pts: T[], max: number): T[] {
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max);
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
}
