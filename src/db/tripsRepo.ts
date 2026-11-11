import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { metersToMiles, milesToMeters, trackDistance, TRIP_REMINDER_MS } from '@/domain/mileage';
import type { Period, Scope } from '@/domain/types';

import { tripPoints, trips, type TripRow } from './schema';
import { newId, type AppDb } from './types';

export const getTrip = (db: AppDb, id: string) => db.select().from(trips).where(eq(trips.id, id)).get();

/** The running or paused GPS trip, if any (at most one). */
export const getActiveTrip = (db: AppDb) =>
  db.select().from(trips).where(inArray(trips.status, ['running', 'paused'])).orderBy(desc(trips.startedAt)).get();

export function startTrip(db: AppDb, scope: Scope = 'work', now = Date.now()): TripRow {
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
  };
  db.insert(trips).values(row).run();
  return row;
}

export interface PointInput {
  ts: number;
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Called from the background location task. Ignored unless the trip is running.
 * Distance is recomputed from all points so filtering stays consistent with `trackDistance`.
 */
export function appendPoints(db: AppDb, tripId: string, points: PointInput[]): void {
  const trip = getTrip(db, tripId);
  if (!trip || trip.status !== 'running' || points.length === 0) return;
  db.transaction((tx) => {
    const lastStored = tx.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(desc(tripPoints.ts)).get();
    // First point after a resume starts a new segment (resume sets lastPointAt but writes no point).
    const resumed = lastStored !== undefined && (trip.lastPointAt ?? 0) > lastStored.ts;
    points.forEach((p, i) => {
      tx.insert(tripPoints)
        .values({ tripId, ...p, segmentStart: i === 0 && resumed })
        .run();
    });
    const all = tx.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(asc(tripPoints.ts)).all();
    tx.update(trips)
      .set({ distanceM: trackDistance(all), lastPointAt: points[points.length - 1].ts })
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

export interface ManualTrip {
  date: number;
  scope: Scope;
  purpose: string;
  miles?: number;
  odoStart?: number;
  odoEnd?: number;
}

export function addManualTrip(db: AppDb, t: ManualTrip): TripRow {
  const miles = t.odoStart !== undefined && t.odoEnd !== undefined ? t.odoEnd - t.odoStart : (t.miles ?? 0);
  if (!(miles > 0)) throw new Error('trip distance must be positive');
  const row: TripRow = {
    id: newId(),
    source: 'manual',
    status: 'done',
    startedAt: t.date,
    endedAt: t.date,
    distanceM: milesToMeters(miles),
    odoStart: t.odoStart ?? null,
    odoEnd: t.odoEnd ?? null,
    scope: t.scope,
    purpose: t.purpose.trim(),
    edited: false,
    lastPointAt: null,
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
