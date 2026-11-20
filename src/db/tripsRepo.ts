import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { isStationaryFix, metersToMiles, milesToMeters, parkedSince, trackDistance, TRIP_REMINDER_MS } from '@/domain/mileage';
import type { Period, Scope, TripScope, TripStartedBy } from '@/domain/types';

import { tripPoints, trips, type TripRow } from './schema';
import { newId, type AppDb } from './types';

export const getTrip = (db: AppDb, id: string) => db.select().from(trips).where(eq(trips.id, id)).get();

/** The running or paused GPS trip, if any (at most one). */
export const getActiveTrip = (db: AppDb) =>
  db.select().from(trips).where(inArray(trips.status, ['running', 'paused'])).orderBy(desc(trips.startedAt)).get();

export function startTrip(
  db: AppDb,
  scope: Scope = 'work',
  now = Date.now(),
  startedBy: TripStartedBy = 'user',
): TripRow {
  const active = getActiveTrip(db);
  if (active) return active;
  const row: TripRow = {
    id: newId(),
    source: 'gps',
    status: 'running',
    startedAt: now,
    endedAt: null,
    distanceM: 0,
    odoStart: null,
    odoEnd: null,
    scope,
    purpose: '',
    edited: false,
    lastPointAt: now,
    startedBy,
    originalStartedAt: null,
    originalEndedAt: null,
    originalDistanceM: null,
    classifiedBy: null,
    exportedAt: null,
    ...NO_ROUTE,
  };
  db.insert(trips).values(row).run();
  return row;
}

export interface PointInput {
  ts: number;
  lat: number;
  lng: number;
  accuracy: number;
  /** Speed reported by the OS in m/s (null / negative = unknown). Used for filtering only, not stored. */
  speed?: number | null;
}

/**
 * Called from the background location task. Ignored unless the trip is running.
 * Fixes taken while the phone stands still (`isStationaryFix`) are dropped. Distance is recomputed from all points
 * so filtering stays consistent with `trackDistance`.
 */
export function appendPoints(
  db: AppDb,
  tripId: string,
  points: PointInput[],
  opts: { sensorStill?: boolean; onFoot?: boolean; walkSpeed?: boolean } = {},
): void {
  const trip = getTrip(db, tripId);
  if (!trip || trip.status !== 'running' || points.length === 0) return;
  db.transaction((tx) => {
    const lastStored = tx.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(desc(tripPoints.ts)).get();
    // First point after a resume starts a new segment (resume sets lastPointAt but writes no point).
    const resumed = lastStored !== undefined && (trip.lastPointAt ?? 0) > lastStored.ts;
    let ref: { lat: number; lng: number } | null = resumed ? null : (lastStored ?? null);
    const kept: PointInput[] = [];
    for (const p of points) {
      // B-135: the first fix after Continue / Resume can be the OS's cached one from before the tap — it would date the
      // new segment (and the stop) back before the tap: the trip ended a minute early, "ended at" before it continued.
      if (resumed && p.ts < (trip.lastPointAt ?? 0)) continue;
      if (isStationaryFix(ref, p, opts)) continue;
      kept.push(p);
      ref = p;
    }
    // Nothing new: leave lastPointAt alone, or the next fix would be taken for the first one after a resume.
    if (kept.length === 0) return;
    kept.forEach(({ speed: _speed, ...p }, i) => {
      tx.insert(tripPoints)
        .values({ tripId, ...p, segmentStart: i === 0 && resumed })
        .run();
    });
    const all = tx.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(asc(tripPoints.ts)).all();
    tx.update(trips)
      .set({ distanceM: trackDistance(all), lastPointAt: kept[kept.length - 1].ts })
      .where(eq(trips.id, tripId))
      .run();
  });
}

/** Personal stop: points arriving while paused are dropped. */
export function pauseTrip(db: AppDb, tripId: string) {
  db.update(trips).set({ status: 'paused' }).where(and(eq(trips.id, tripId), eq(trips.status, 'running'))).run();
}

export function resumeTrip(db: AppDb, tripId: string, now = Date.now()) {
  db.update(trips).set({ status: 'running', lastPointAt: now }).where(and(eq(trips.id, tripId), eq(trips.status, 'paused'))).run();
}

/**
 * "Continue trip" (Phương 19/11): a Trip that ended on its own records again as the same Trip. `lastPointAt` = now marks
 * the next fix as the start of a new segment, like a Resume (no miles drawn across the gap).
 */
export function reopenTrip(db: AppDb, tripId: string, now = Date.now()) {
  db.update(trips).set({ status: 'running', endedAt: null, lastPointAt: now }).where(and(eq(trips.id, tripId), eq(trips.status, 'done'))).run();
}

/** B-96 v2: a running Trip keeps going from `now` — the next fix starts a new segment and the stop counts from here. */
export function resumeFrom(db: AppDb, tripId: string, now = Date.now()) {
  db.update(trips).set({ lastPointAt: now }).where(and(eq(trips.id, tripId), eq(trips.status, 'running'))).run();
}

export function endTrip(db: AppDb, tripId: string, now = Date.now()): TripRow | undefined {
  db.update(trips).set({ status: 'done', endedAt: now }).where(eq(trips.id, tripId)).run();
  return getTrip(db, tripId);
}

/** Recording stopped without the user ending the trip (killed by the OS, permission revoked). */
export function markInterrupted(db: AppDb, tripId: string) {
  const t = getTrip(db, tripId);
  if (!t) return;
  db.update(trips).set({ status: 'interrupted', endedAt: t.lastPointAt ?? t.startedAt }).where(eq(trips.id, tripId)).run();
}

export const tripRunningTooLong = (t: TripRow, now = Date.now()) =>
  (t.status === 'running' || t.status === 'paused') && now - t.startedAt >= TRIP_REMINDER_MS;

/** One end of an A → B trip (Q25). */
export interface RoutePlace {
  label: string;
  lat: number;
  lng: number;
}

/** A → B trip ends; the trip's distance is the driving route (already × 2 when `roundTrip`). */
export interface TripRoute {
  from: RoutePlace;
  to: RoutePlace;
  roundTrip: boolean;
}

type RouteCols = Pick<TripRow, 'fromLabel' | 'toLabel' | 'fromLat' | 'fromLng' | 'toLat' | 'toLng' | 'roundTrip'>;

export const NO_ROUTE: RouteCols = {
  fromLabel: null,
  toLabel: null,
  fromLat: null,
  fromLng: null,
  toLat: null,
  toLng: null,
  roundTrip: false,
};

const routeCols = (r: TripRoute | null): RouteCols =>
  r
    ? {
        fromLabel: r.from.label.trim(),
        toLabel: r.to.label.trim(),
        fromLat: r.from.lat,
        fromLng: r.from.lng,
        toLat: r.to.lat,
        toLng: r.to.lng,
        roundTrip: r.roundTrip,
      }
    : NO_ROUTE;

/** The A → B ends stored on a trip, or null for odometer / typed-distance / GPS trips. */
export function tripRoute(t: TripRow): TripRoute | null {
  if (t.fromLabel === null || t.toLabel === null || t.fromLat === null || t.fromLng === null || t.toLat === null || t.toLng === null)
    return null;
  return {
    from: { label: t.fromLabel, lat: t.fromLat, lng: t.fromLng },
    to: { label: t.toLabel, lat: t.toLat, lng: t.toLng },
    roundTrip: t.roundTrip,
  };
}

/** "DLS4 → Tesco Leeds"; null when the trip has no A → B ends. */
export const routeTitle = (t: Pick<TripRow, 'fromLabel' | 'toLabel'>) => (t.fromLabel && t.toLabel ? `${t.fromLabel} → ${t.toLabel}` : null);

export interface ManualTrip {
  date: number;
  /** 'unsorted' for estimated trips (Missing trip / odometer check) until the driver chooses. */
  scope: TripScope;
  purpose: string;
  /** 'gap' = estimated trip (Q26 Missing trip, Q27 odometer check), label "Estimated". Default 'manual'. */
  source?: 'manual' | 'gap';
  /** Estimated trips between two GPS trips keep the gap's end time (default: same as `date`). */
  endedAt?: number;
  miles?: number;
  odoStart?: number;
  odoEnd?: number;
  /** A → B ends. Add: omit = none. Edit: omit = keep what is stored, null = clear. */
  route?: TripRoute | null;
}

export function addManualTrip(db: AppDb, t: ManualTrip): TripRow {
  const miles = t.odoStart !== undefined && t.odoEnd !== undefined ? t.odoEnd - t.odoStart : (t.miles ?? 0);
  if (!(miles > 0)) throw new Error('trip distance must be positive');
  const row: TripRow = {
    id: newId(),
    source: t.source ?? 'manual',
    status: 'done',
    startedAt: t.date,
    endedAt: t.endedAt ?? t.date,
    distanceM: milesToMeters(miles),
    odoStart: t.odoStart ?? null,
    odoEnd: t.odoEnd ?? null,
    scope: t.scope,
    purpose: t.purpose.trim(),
    edited: false,
    lastPointAt: null,
    startedBy: null,
    originalStartedAt: null,
    originalEndedAt: null,
    originalDistanceM: null,
    classifiedBy: null,
    exportedAt: null,
    ...routeCols(t.route ?? null),
  };
  db.insert(trips).values(row).run();
  return row;
}

export function updateTrip(db: AppDb, id: string, patch: { scope?: Scope; purpose?: string; miles?: number; date?: number }) {
  const set: Partial<TripRow> = {};
  if (patch.scope) set.scope = patch.scope;
  if (patch.purpose !== undefined) set.purpose = patch.purpose.trim();
  if (patch.date !== undefined) set.startedAt = patch.date;
  if (patch.miles !== undefined) {
    if (!(patch.miles > 0)) throw new Error('trip distance must be positive');
    set.distanceM = milesToMeters(patch.miles);
    const t = getTrip(db, id);
    if (t?.source === 'gps') set.edited = true;
  }
  db.update(trips).set(set).where(eq(trips.id, id)).run();
}

export const deleteTrip = (db: AppDb, id: string) => db.delete(trips).where(eq(trips.id, id)).run();

/**
 * When the vehicle last really moved (CONTEXT: Stop / Trip end): GPS wander around the parking spot doesn't count. A
 * Resume / Continue trip marks `lastPointAt` past the last stored fix — the stop is counted from there, not from before.
 */
export function lastMoveAt(db: AppDb, trip: { id: string; startedAt: number; lastPointAt: number | null }): number {
  const points = tripPointsOf(db, trip.id);
  const lastStored = points.length ? points[points.length - 1].ts : 0;
  const resumedAt = trip.lastPointAt !== null && trip.lastPointAt > lastStored ? trip.lastPointAt : 0;
  // A13-14: once a fix after Resume / Continue trip is stored (first fix of the new segment), only that segment counts —
  // a fix at the same parking spot must not bring back the stop from before (it ended the trip again 3 s later).
  let from = 0;
  for (let i = points.length - 1; i > 0; i--) {
    if (points[i].segmentStart) {
      from = i;
      break;
    }
  }
  const segment = from > 0 ? points.slice(from) : points;
  const segmentFrom = from > 0 ? points[from].ts : trip.startedAt;
  return Math.max(parkedSince(segment, segmentFrom), resumedAt);
}

export const tripPointsOf = (db: AppDb, id: string) =>
  db.select().from(tripPoints).where(eq(tripPoints.tripId, id)).orderBy(asc(tripPoints.ts)).all();

export function listTrips(db: AppDb, period?: Period): TripRow[] {
  return db
    .select()
    .from(trips)
    .where(period ? and(gte(trips.startedAt, period.start), lt(trips.startedAt, period.end)) : undefined)
    .orderBy(desc(trips.startedAt))
    .all();
}

/** Miles by scope for a period. Running trips count with their distance so far. */
export function mileageTotals(db: AppDb, period: Period): { work: number; personal: number } {
  const rows = db
    .select({ scope: trips.scope, m: sql<number>`COALESCE(SUM(${trips.distanceM}), 0)` })
    .from(trips)
    .where(and(gte(trips.startedAt, period.start), lt(trips.startedAt, period.end)))
    .groupBy(trips.scope)
    .all();
  const get = (s: Scope) => metersToMiles(Number(rows.find((r) => r.scope === s)?.m ?? 0));
  return { work: get('work'), personal: get('personal') };
}

export function deleteAllTrips(db: AppDb) {
  db.delete(trips).run();
}

// ---------------- Added for F-11 / F-12 / F-13 ----------------

/** Most recent trip that stopped recording on its own and hasn't been acknowledged yet. */
export const latestInterrupted = (db: AppDb) =>
  db.select().from(trips).where(eq(trips.status, 'interrupted')).orderBy(desc(trips.startedAt)).get();

/** User saw the "trip stopped recording" card: keep the miles saved so far as a normal finished trip. */
export function acknowledgeInterrupted(db: AppDb, tripId: string) {
  db.update(trips).set({ status: 'done' }).where(and(eq(trips.id, tripId), eq(trips.status, 'interrupted'))).run();
}

/** Distinct non-empty purposes, most recent first (chips in the End trip sheet). */
export function recentPurposes(db: AppDb, limit = 3): string[] {
  const rows = db
    .select({ purpose: trips.purpose, last: sql<number>`MAX(${trips.startedAt})` })
    .from(trips)
    .where(sql`${trips.purpose} <> ''`)
    .groupBy(trips.purpose)
    .orderBy(desc(sql`MAX(${trips.startedAt})`))
    .limit(limit)
    .all();
  return rows.map((r) => r.purpose);
}

/** Replace a manual trip's distance / odometer / date / scope / purpose. */
export function updateManualTrip(db: AppDb, id: string, t: ManualTrip) {
  const miles = t.odoStart !== undefined && t.odoEnd !== undefined ? t.odoEnd - t.odoStart : (t.miles ?? 0);
  if (!(miles > 0)) throw new Error('trip distance must be positive');
  db.update(trips)
    .set({
      startedAt: t.date,
      endedAt: t.endedAt ?? t.date,
      distanceM: milesToMeters(miles),
      odoStart: t.odoStart ?? null,
      odoEnd: t.odoEnd ?? null,
      scope: t.scope,
      purpose: t.purpose.trim(),
      ...(t.route !== undefined ? routeCols(t.route) : {}),
    })
    .where(and(eq(trips.id, id), inArray(trips.source, ['manual', 'gap'])))
    .run();
}

/** Work trips in a period as {at, miles} for `mileageEstimateByDate`. */
export function businessTripMiles(db: AppDb, period: Period): { at: number; miles: number }[] {
  return listTrips(db, period)
    .filter((t) => t.scope === 'work')
    .map((t) => ({ at: t.startedAt, miles: metersToMiles(t.distanceM) }));
}

/** Last stored point of a trip (GPS status on the active trip screen). */
export const lastPoint = (db: AppDb, tripId: string) =>
  db.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(desc(tripPoints.ts)).get();
