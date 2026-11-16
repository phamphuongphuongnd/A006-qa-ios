// Pure: the longer route drawing on Trip detail (S-07c) — Work / Personal runs, numbered Stops.
import { MAX_ACCURACY_M } from '@/domain/mileage';

import { fitBox, type SketchPoint, type XY } from '../sketch';
import type { SegmentRange } from './stops';

export interface DetailPoint extends SketchPoint {
  ts: number;
}

export interface DetailSketch {
  /** Paths of the drive counted as the trip's own scope (solid). */
  work: string[];
  /** Paths inside a Personal segment, or the whole trip when it is Personal (dotted, purple-grey). */
  personal: string[];
  /** Straight dashed links across a manual Personal stop (recording paused). */
  gaps: string[];
  start: XY | null;
  end: XY | null;
  /** Screen position of each Stop, same order as given. */
  stops: XY[];
}

const MAX_POINTS = 800;

const toPath = (s: XY[]) => s.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

/**
 * Draws a finished GPS trip into a w×h box. A piece of track between two fixes is Personal when its middle falls
 * inside a Personal segment (or the whole trip is Personal); consecutive pieces of one kind become one path.
 */
export function sketchTripDetail(
  points: DetailPoint[],
  stops: { lat: number; lng: number }[],
  personal: SegmentRange[],
  allPersonal: boolean,
  w: number,
  h: number,
  pad = 28,
): DetailSketch {
  const good = points.filter((p) => p.accuracy <= MAX_ACCURACY_M);
  if (good.length === 0) return { work: [], personal: [], gaps: [], start: null, end: null, stops: [] };

  const step = Math.ceil(good.length / MAX_POINTS);
  const pts = step <= 1 ? good : good.filter((p, i) => i % step === 0 || p.segmentStart || i === good.length - 1);

  const fit = fitBox([...pts, ...stops], w, h, pad);
  const xy = pts.map(fit);

  const out: DetailSketch = { work: [], personal: [], gaps: [], start: xy[0], end: xy[xy.length - 1], stops: stops.map(fit) };
  let run: XY[] = [];
  let kind: 'work' | 'personal' | null = null;
  const flush = () => {
    if (kind && run.length >= 2) out[kind].push(toPath(run));
    run = [];
    kind = null;
  };

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (b.segmentStart) {
      flush();
      out.gaps.push(toPath([xy[i - 1], xy[i]]));
      continue;
    }
    const mid = (a.ts + b.ts) / 2;
    const k = allPersonal || personal.some((r) => mid >= r.fromTs && mid <= r.toTs) ? 'personal' : 'work';
    if (k !== kind) {
      flush();
      kind = k;
      run = [xy[i - 1]];
    }
    run.push(xy[i]);
  }
  flush();
  return out;
}
