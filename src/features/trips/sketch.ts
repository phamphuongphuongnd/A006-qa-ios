import { MAX_ACCURACY_M } from '@/domain/mileage';

export interface SketchPoint {
  lat: number;
  lng: number;
  accuracy: number;
  segmentStart?: boolean;
}

export interface XY {
  x: number;
  y: number;
}

export interface Sketch {
  /** One SVG path per recorded segment (split at personal stops). */
  segments: string[];
  /** Straight dashed links across personal stops, from the end of one segment to the start of the next. */
  gaps: string[];
  start: XY | null;
  end: XY | null;
}

const MAX_POINTS = 600;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Fits a recorded route into a w×h box (keeping its shape) for the line drawing on the active trip screen.
 * No map: an equirectangular projection is plenty for one trip. Poor fixes are dropped like in `trackDistance`.
 */
export function sketchRoute(points: SketchPoint[], w: number, h: number, pad = 28): Sketch {
  const good = points.filter((p) => p.accuracy <= MAX_ACCURACY_M);
  if (good.length === 0) return { segments: [], gaps: [], start: null, end: null };

  // Thin very long trips, always keeping segment starts and the last point.
  const step = Math.ceil(good.length / MAX_POINTS);
  const pts = step <= 1 ? good : good.filter((p, i) => i % step === 0 || p.segmentStart || i === good.length - 1);

  const meanLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const k = Math.cos((meanLat * Math.PI) / 180);
  const raw = pts.map((p) => ({ x: p.lng * k, y: -p.lat }));
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const innerW = Math.max(1, w - pad * 2);
  const innerH = Math.max(1, h - pad * 2);
  const scale = spanX === 0 && spanY === 0 ? 0 : Math.min(spanX ? innerW / spanX : Infinity, spanY ? innerH / spanY : Infinity);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  const xy = raw.map((p) => ({ x: r1(offX + (p.x - minX) * scale), y: r1(offY + (p.y - minY) * scale) }));

  const segs: XY[][] = [];
  pts.forEach((p, i) => {
    if (i === 0 || p.segmentStart) segs.push([]);
    segs[segs.length - 1].push(xy[i]);
  });

  const toPath = (s: XY[]) => s.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const gaps: string[] = [];
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1][segs[i - 1].length - 1];
    const b = segs[i][0];
    gaps.push(`M${a.x} ${a.y} L${b.x} ${b.y}`);
  }
  return { segments: segs.map(toPath), gaps, start: xy[0], end: xy[xy.length - 1] };
}

export type GpsQuality = 'good' | 'weak' | 'searching';

/** "GPS good" needs a recent (≤ 60 s) fix with ≤ 25 m accuracy. */
export function gpsQuality(last: { ts: number; accuracy: number } | undefined, now: number): GpsQuality {
  if (!last) return 'searching';
  if (now - last.ts > 60_000) return 'weak';
  return last.accuracy <= 25 ? 'good' : 'weak';
}
