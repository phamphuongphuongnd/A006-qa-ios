import { useEffect } from 'react';

import { db } from '@/db/client';
import { places, type PlaceRow } from '@/db/schema';
import { haversine } from '@/domain/mileage';
import { useNow } from '@/features/entries/useNow';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';

import { drivingRoute, hasRouteService } from '../route/ors';
import { SAME_PLACE_M } from '../route/places';
import { formatClock } from '../format';
import { fetchGapRoutes, gapDistance, gapsToRoute, type TripGap } from './gaps';
import { odometerDue } from './odometer';
import { acceptedReadingId, firstTripAt, gapRoutes, missingTrips, readingChecks, saveGapRoute, type ReadingCheck } from './repo';

const HOUR = 60 * 60 * 1000;

/** Missing trips of the last 30 days, newest first (Miles rows, Home card). */
export function useMissingTrips(): TripGap[] {
  'use no memo';
  const hour = Math.floor(useNow(60_000) / HOUR);
  return useLive(() => missingTrips(db, Date.now()), [hour], ['trips', 'trip_gap_dismissals']);
}

/** Distance shown / prefilled for a gap: the Pro driving route once fetched, else the straight-line estimate. */
export interface GapDistance {
  meters: number;
  routed: boolean;
}

/**
 * Pro + route service + network: asks openrouteservice once per gap for the driving distance (one call at a time,
 * stops at the first offline / quota error); otherwise the estimate stays. Results live in the settings KV.
 */
export function useGapDistances(gaps: TripGap[]): Map<string, GapDistance> {
  'use no memo';
  const { pro } = usePro();
  const cached = useLive(() => gapRoutes(db), [], ['settings']);
  const want = gapsToRoute(gaps, cached, pro, hasRouteService());
  const wantKey = want.map((g) => g.key).join(',');
  useEffect(() => {
    if (!wantKey) return;
    const ctrl = new AbortController();
    void fetchGapRoutes(
      want,
      (a, b) => drivingRoute(a, b, { signal: ctrl.signal }),
      (key, meters) => saveGapRoute(db, key, meters),
      () => ctrl.signal.aborted,
    );
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantKey]);
  return new Map(gaps.map((g) => [g.key, gapDistance(g, cached)]));
}

/** Ends of a gap: a saved place (Q25 Frequent places) within 150 m, else the clock time. */
export function useGapLabels(gaps: TripGap[]): Map<string, { from: string; to: string }> {
  'use no memo';
  const rows = useLive(() => (gaps.length ? db.select().from(places).all() : []), [gaps.length > 0], ['places']);
  const out = new Map<string, { from: string; to: string }>();
  for (const g of gaps) out.set(g.key, { from: placeNear(rows, g.fromAt) ?? formatClock(g.from), to: placeNear(rows, g.toAt) ?? formatClock(g.to) });
  return out;
}

function placeNear(rows: PlaceRow[], at: { lat: number; lng: number }): string | null {
  let best: { label: string; d: number } | null = null;
  for (const p of rows) {
    const d = haversine(p, at);
    if (d < SAME_PLACE_M && (!best || d < best.d)) best = { label: p.label, d };
  }
  return best?.label ?? null;
}

/** Each odometer reading with its comparison, oldest first. */
export function useReadingChecks(): ReadingCheck[] {
  'use no memo';
  return useLive(() => readingChecks(db), [], ['odometer_readings', 'trips']);
}

export type OdometerSignal =
  | { kind: 'missing' | 'over'; check: ReadingCheck }
  | { kind: 'due' }
  | null;

/** Home card for the odometer check: latest comparison off by the threshold (until "That's fine"), else "due". */
export function useOdometerSignal(now: number): OdometerSignal {
  'use no memo';
  const checks = useReadingChecks();
  const accepted = useLive(() => acceptedReadingId(db), [], ['settings']);
  const first = useLive(() => firstTripAt(db), [], ['trips']);
  const { settings: s } = useSettings();
  const latest = checks[checks.length - 1];
  if (latest && (latest.result.kind === 'missing' || latest.result.kind === 'over') && accepted !== latest.reading.id) {
    return { kind: latest.result.kind, check: latest };
  }
  const due = odometerDue({
    cadence: s.odometerCheck,
    region: s.region ?? 'UK',
    now,
    lastReadingAt: latest?.reading.readAt ?? null,
    firstTripAt: first,
  });
  return due ? { kind: 'due' } : null;
}
