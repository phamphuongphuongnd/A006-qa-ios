// Miles list map thumbnails (Q25). One PNG per trip in <documents>/trip-maps/, made once with MapLibre's static
// snapshotter (style + route drawn into it), reused while scrolling. The file name carries a key of what the picture
// shows, so an edited trip gets a new picture; `sweepThumbs` deletes pictures of deleted or edited trips.
import { StaticMapImageManager } from '@maplibre/maplibre-react-native';
import { Directory, File, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { listTrips, tripPointsOf } from '@/db/tripsRepo';
import { countedPath } from '@/domain/mileage';

import { linesFeatureCollection, padBounds, thin, tripLines } from './geo';
import { loadStyleJson, PIN } from './style';

export const THUMB_DP = 56;
const SNAP_TIMEOUT_MS = 20_000;
/** After a failure (offline), don't retry the same trip for this long. */
const RETRY_MS = 5 * 60_000;

const dir = () => new Directory(Paths.document, 'trip-maps');

// QA-100 OLD-6: on some GPUs (seen: Android 11 with a software GL driver) MapLibre's snapshotter aborts natively
// ("Failed to choose ARGB config", SIGABRT) — JS can't catch it and Miles crashed on every open. A flag file is
// written right before each snapshot and removed after; finding it at the next launch means the app died mid-snapshot,
// so thumbnails stay off on this phone (rows keep their icon).
const snappingFlag = () => new File(Paths.document, 'trip-maps-snapping.flag');
const offFlag = () => new File(Paths.document, 'trip-maps-off.flag');
let snapshotsOff: boolean | null = null;

export function thumbsDisabled(): boolean {
  if (snapshotsOff !== null) return snapshotsOff;
  snapshotsOff = false;
  try {
    if (offFlag().exists) snapshotsOff = true;
    else if (snappingFlag().exists) {
      offFlag().create();
      snappingFlag().delete();
      snapshotsOff = true;
    }
  } catch {
    // unreadable storage: keep thumbnails on
  }
  return snapshotsOff;
}

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/** Thumbnail file name for this version of the trip (changes when what it shows changes). */
export const thumbName = (t: Pick<TripRow, 'id' | 'startedAt' | 'endedAt' | 'distanceM' | 'scope'>, dark: boolean) =>
  `${t.id}_${hash(`${t.startedAt}|${t.endedAt}|${Math.round(t.distanceM)}|${t.scope}|${dark ? 'd' : 'l'}|v2`)}.png`;

const known = new Map<string, string | null>(); // name → uri (null = no file)
const failedAt = new Map<string, number>();
const inflight = new Map<string, Promise<string | null>>();
let queue: Promise<unknown> = Promise.resolve();

/** Existing thumbnail URI, or null (cheap: memory first). */
export function thumbUri(t: TripRow, dark: boolean): string | null {
  const name = thumbName(t, dark);
  if (known.has(name)) return known.get(name) ?? null;
  const f = new File(dir(), name);
  const uri = f.exists ? f.uri : null;
  known.set(name, uri);
  return uri;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  // The Android snapshotter never settles its promise on error — never wait forever.
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('snapshot timeout')), ms))]);
}

async function make(t: TripRow, dark: boolean, colors: { work: string; personal: string }): Promise<string | null> {
  const name = thumbName(t, dark);
  const pts = thin(countedPath(tripPointsOf(db, t.id)), 300);
  const lines = tripLines(pts, [], t.scope === 'personal');
  if (!lines.bounds || !lines.start || !lines.end) return null;
  const style = await loadStyleJson(dark);
  // No place names / road labels: unreadable at 56dp and they crowd the route.
  const layers = ((style.layers as { type?: string }[]) ?? []).filter((l) => l.type !== 'symbol');
  const sources = (style.sources as Record<string, unknown>) ?? {};
  const pinsFc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: lines.start } },
      { type: 'Feature', properties: { kind: 'end' }, geometry: { type: 'Point', coordinates: lines.end } },
    ],
  };
  const withRoute = {
    ...style,
    sources: {
      ...sources,
      'ss-trip': { type: 'geojson', data: linesFeatureCollection(lines) },
      'ss-pins': { type: 'geojson', data: pinsFc },
    },
    layers: [
      ...layers,
      {
        id: 'ss-casing',
        type: 'line',
        source: 'ss-trip',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': dark ? '#12161C' : '#FFFFFF', 'line-width': 6 },
      },
      {
        id: 'ss-route',
        type: 'line',
        source: 'ss-trip',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['match', ['get', 'kind'], 'personal', colors.personal, colors.work], 'line-width': 3.5 },
      },
      {
        id: 'ss-pins',
        type: 'circle',
        source: 'ss-pins',
        paint: {
          'circle-radius': 4.5,
          'circle-color': ['match', ['get', 'kind'], 'start', PIN.start, PIN.end],
          'circle-stroke-color': PIN.ring,
          'circle-stroke-width': 2,
        },
      },
    ],
  };
  try {
    snappingFlag().create({ overwrite: true });
  } catch {
    // no flag → no crash guard this time, the picture is still worth trying
  }
  let tmp: string;
  try {
    tmp = await withTimeout(
      StaticMapImageManager.createImage({
        mapStyle: withRoute,
        bounds: padBounds(lines.bounds, 0.18),
        width: THUMB_DP,
        height: THUMB_DP,
        output: 'file',
        logo: false,
      }),
      SNAP_TIMEOUT_MS,
    );
  } finally {
    try {
      snappingFlag().delete();
    } catch {}
  }
  const d = dir();
  if (!d.exists) d.create({ intermediates: true });
  const src = new File(tmp.startsWith('file:') ? tmp : `file://${tmp}`);
  const out = new File(d, name);
  if (out.exists) out.delete();
  src.move(out);
  return out.uri;
}

/**
 * Makes the thumbnail if missing — one at a time, so scrolling past many rows never starts many snapshots.
 * Resolves to the URI, or null (no route / offline; retried after a while).
 */
export function ensureThumb(t: TripRow, dark: boolean, colors: { work: string; personal: string }): Promise<string | null> {
  const name = thumbName(t, dark);
  const have = thumbUri(t, dark);
  if (have) return Promise.resolve(have);
  if (thumbsDisabled()) return Promise.resolve(null);
  const failed = failedAt.get(name);
  if (failed && Date.now() - failed < RETRY_MS) return Promise.resolve(null);
  const running = inflight.get(name);
  if (running) return running;
  const p = (queue = queue.then(
    () => make(t, dark, colors),
    () => make(t, dark, colors),
  )) as Promise<string | null>;
  const done = p.then(
    (uri) => {
      known.set(name, uri);
      if (!uri) failedAt.set(name, Date.now());
      return uri;
    },
    () => {
      failedAt.set(name, Date.now());
      return null;
    },
  );
  inflight.set(name, done);
  done.finally(() => inflight.delete(name));
  return done;
}

/** Deletes pictures whose trip is gone or has changed since (any theme of the current version is kept). */
export function sweepThumbs(): number {
  const d = dir();
  if (!d.exists) return 0;
  const keep = new Set<string>();
  for (const t of listTrips(db)) {
    keep.add(thumbName(t, false));
    keep.add(thumbName(t, true));
  }
  let removed = 0;
  for (const f of d.list()) {
    if (f instanceof File && !keep.has(f.name)) {
      try {
        f.delete();
        known.delete(f.name);
        removed++;
      } catch {
        // in use / already gone — next sweep
      }
    }
  }
  return removed;
}

/** Thumbnail of one trip goes now (trip deleted / edited on Trip detail). */
export function dropThumbs(tripId: string): void {
  const d = dir();
  if (!d.exists) return;
  for (const f of d.list()) {
    if (f instanceof File && f.name.startsWith(`${tripId}_`)) {
      try {
        f.delete();
      } catch {}
      known.delete(f.name);
    }
  }
}
