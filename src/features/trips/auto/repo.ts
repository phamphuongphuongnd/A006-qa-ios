// DB access for automatic trips, Stops, Personal segments, hand edits and known routes (S1).
// Lives here (not db/tripsRepo.ts) so S1 owns it; reads the shared tables only through these functions.
import { and, asc, desc, eq, gt, gte, lt, sql } from 'drizzle-orm';

import { entries, settings, tripPoints, trips, tripSegments, tripStops } from '@/db/schema';
import type { TripPointRow, TripRow, TripSegmentRow, TripStopRow } from '@/db/schema';
import { newId, type AppDb } from '@/db/types';
import { milesToMeters, trackDistance } from '@/domain/mileage';
import type { Scope, TripClassifiedBy, TripScope } from '@/domain/types';

import { recordRoute } from './routes';
import { findStops, type SegmentRange } from './stops';

// ---------------- Small key–value store (settings table, keys the typed settings repo ignores) ----------------

const KV_PREFIX = 's1.';

export function getKV<T>(db: AppDb, key: string, fallback: T): T {
  const row = db.select().from(settings).where(eq(settings.key, KV_PREFIX + key)).get();
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setKV(db: AppDb, key: string, value: unknown) {
  const json = JSON.stringify(value);
  db.insert(settings)
    .values({ key: KV_PREFIX + key, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json } })
    .run();
}

// ---------------- Stops & segments ----------------

export const listStops = (db: AppDb, tripId: string): TripStopRow[] =>
  db.select().from(tripStops).where(eq(tripStops.tripId, tripId)).orderBy(asc(tripStops.startedAt)).all();

export const listSegments = (db: AppDb, tripId: string): TripSegmentRow[] =>
  db.select().from(tripSegments).where(eq(tripSegments.tripId, tripId)).orderBy(asc(tripSegments.fromTs)).all();

const pointsOf = (db: AppDb, tripId: string) =>
  db.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(asc(tripPoints.ts)).all();

/** Recompute a finished trip's Stops from its track (trip end, after a split). */
export function rebuildStops(db: AppDb, tripId: string) {
  const stops = findStops(pointsOf(db, tripId));
  db.transaction((tx) => {
    tx.delete(tripStops).where(eq(tripStops.tripId, tripId)).run();
    for (const s of stops) tx.insert(tripStops).values({ id: newId(), tripId, ...s }).run();
  });
}

/**
 * Tap "Mark the drive to / from this stop as personal": adds that Personal segment, or removes it when the same
 * range is already Personal. Returns the segment added (for Undo) or null when one was removed.
 */
export function toggleSegment(db: AppDb, tripId: string, range: SegmentRange): TripSegmentRow | null {
  const existing = listSegments(db, tripId).find((s) => s.fromTs === range.fromTs && s.toTs === range.toTs);
  if (existing) {
    db.delete(tripSegments).where(eq(tripSegments.id, existing.id)).run();
    return null;
  }
  const pts = pointsOf(db, tripId).filter((p) => p.ts >= range.fromTs && p.ts <= range.toTs);
  const row: TripSegmentRow = { id: newId(), tripId, ...range, distanceM: trackDistance(pts), scope: 'personal' };
  db.insert(tripSegments).values(row).run();
  return row;
}

export const deleteSegment = (db: AppDb, id: string) => db.delete(tripSegments).where(eq(tripSegments.id, id)).run();
export const restoreSegment = (db: AppDb, row: TripSegmentRow) => db.insert(tripSegments).values(row).onConflictDoNothing().run();

/**
 * "Split the trip here": points after `at` (the end of a Stop) move to a new trip with the same scope / purpose.
 * Returns the new trip id, or null when one side would be empty.
 */
export function splitTripAt(db: AppDb, tripId: string, at: number): string | null {
  const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip || trip.source !== 'gps' || trip.status !== 'done') return null;
  const pts = pointsOf(db, tripId);
  const before = pts.filter((p) => p.ts < at);
  const after = pts.filter((p) => p.ts >= at);
  if (before.length < 2 || after.length < 2) return null;
  const id = newId();
  db.transaction((tx) => {
    tx.insert(trips)
      .values({
        ...trip,
        id,
        startedAt: after[0].ts,
        endedAt: trip.endedAt,
        distanceM: trackDistance(after),
        lastPointAt: after[after.length - 1].ts,
        originalStartedAt: null,
        originalEndedAt: null,
        originalDistanceM: null,
      })
      .run();
    tx.update(tripPoints).set({ tripId: id }).where(and(eq(tripPoints.tripId, tripId), gte(tripPoints.ts, at))).run();
    tx.update(trips)
      .set({ endedAt: before[before.length - 1].ts, distanceM: trackDistance(before), lastPointAt: before[before.length - 1].ts })
      .where(eq(trips.id, tripId))
      .run();
    tx.update(tripSegments).set({ tripId: id }).where(and(eq(tripSegments.tripId, tripId), gte(tripSegments.fromTs, at))).run();
  });
  rebuildStops(db, tripId);
  rebuildStops(db, id);
  return id;
}

/**
 * Undo of `splitTripAt`: the second trip's points and segments go back to the first, which gets its row back
 * (`before` = the first trip as it was before the split); the second trip is deleted.
 */
export function unsplitTrip(db: AppDb, before: TripRow, secondId: string) {
  db.transaction((tx) => {
    tx.update(tripPoints).set({ tripId: before.id }).where(eq(tripPoints.tripId, secondId)).run();
    tx.update(tripSegments).set({ tripId: before.id }).where(eq(tripSegments.tripId, secondId)).run();
    tx.delete(trips).where(eq(trips.id, secondId)).run();
    tx.update(trips).set(before).where(eq(trips.id, before.id)).run();
  });
  rebuildStops(db, before.id);
}

// ---------------- Undo snapshots (Trip detail) ----------------

export interface TripSnapshot {
  trip: TripRow;
  points: TripPointRow[];
  stops: TripStopRow[];
  segments: TripSegmentRow[];
}

/** Everything a trip owns, to put it back after "Delete trip" → Undo. */
export function snapshotTrip(db: AppDb, tripId: string): TripSnapshot | null {
  const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) return null;
  return { trip, points: pointsOf(db, tripId), stops: listStops(db, tripId), segments: listSegments(db, tripId) };
}

const CHUNK = 200;

/** Puts a deleted trip back exactly as it was (ids included). */
export function restoreTrip(db: AppDb, snap: TripSnapshot) {
  db.transaction((tx) => {
    tx.insert(trips).values(snap.trip).onConflictDoNothing().run();
    for (let i = 0; i < snap.points.length; i += CHUNK) tx.insert(tripPoints).values(snap.points.slice(i, i + CHUNK)).run();
    if (snap.stops.length) tx.insert(tripStops).values(snap.stops).run();
    if (snap.segments.length) tx.insert(tripSegments).values(snap.segments).run();
  });
}

/** Undo of a hand edit / purpose change: the trip row goes back to `row` (points are never touched by edits). */
export const revertTripRow = (db: AppDb, row: TripRow) => db.update(trips).set(row).where(eq(trips.id, row.id)).run();

// ---------------- Hand edits (Q19) ----------------

export interface TripEdit {
  startedAt?: number;
  endedAt?: number;
  /** Miles typed by the driver; when only the times change, distance follows the track inside the new times. */
  miles?: number;
}

/** Edit a GPS trip's start / end / miles. Keeps the recorded values once ("Recorded: …") and marks it Edited. */
export function editGpsTrip(db: AppDb, tripId: string, e: TripEdit) {
  const t = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!t || t.source !== 'gps') return;
  const startedAt = e.startedAt ?? t.startedAt;
  const endedAt = e.endedAt ?? t.endedAt ?? t.startedAt;
  if (endedAt < startedAt) throw new Error('trip end before start');
  let distanceM = t.distanceM;
  if (e.miles !== undefined) {
    if (!(e.miles > 0)) throw new Error('trip distance must be positive');
    distanceM = milesToMeters(e.miles);
  } else if (e.startedAt !== undefined || e.endedAt !== undefined) {
    const pts = pointsOf(db, tripId).filter((p) => p.ts >= startedAt && p.ts <= endedAt);
    if (pts.length >= 2) distanceM = trackDistance(pts);
  }
  // Edited back to exactly what was recorded → it is the recorded trip again (no "Edited", no "Recorded" line).
  const oStart = t.originalStartedAt ?? t.startedAt;
  const oEnd = t.originalEndedAt ?? t.endedAt;
  const oDist = t.originalDistanceM ?? t.distanceM;
  if (startedAt === oStart && endedAt === oEnd && (e.miles === undefined || Math.abs(distanceM - oDist) < 1)) {
    db.update(trips)
      .set({ startedAt, endedAt, distanceM: oDist, edited: false, originalStartedAt: null, originalEndedAt: null, originalDistanceM: null })
      .where(eq(trips.id, tripId))
      .run();
    return;
  }
  db.update(trips)
    .set({
      startedAt,
      endedAt,
      distanceM,
      edited: true,
      originalStartedAt: t.originalStartedAt ?? t.startedAt,
      originalEndedAt: t.originalEndedAt ?? t.endedAt,
      originalDistanceM: t.originalDistanceM ?? t.distanceM,
    })
    .where(eq(trips.id, tripId))
    .run();
}

// ---------------- Scope & known routes ----------------

function endsOf(db: AppDb, tripId: string) {
  const first = db.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(asc(tripPoints.ts)).get();
  const last = db.select().from(tripPoints).where(eq(tripPoints.tripId, tripId)).orderBy(desc(tripPoints.ts)).get();
  return first && last ? { start: { lat: first.lat, lng: first.lng }, end: { lat: last.lat, lng: last.lng } } : null;
}

/**
 * Set a trip's Work / Personal by hand (Miles swipe, Trip detail, Sort). Returns the previous scope + reason for Undo.
 * Finished GPS trips teach the known routes (S2, via ./routes).
 */
export function setTripScope(db: AppDb, tripId: string, scope: Scope): { scope: TripScope; classifiedBy: TripClassifiedBy | null } | null {
  const t = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!t) return null;
  db.update(trips).set({ scope, classifiedBy: t.source === 'gps' ? 'user' : t.classifiedBy }).where(eq(trips.id, tripId)).run();
  if (t.source === 'gps' && t.status === 'done' && t.scope !== scope) recordRoute(db, tripId, scope);
  return { scope: t.scope, classifiedBy: t.classifiedBy };
}

/** Undo of `setTripScope` (a recorded route stays: harmless, the next sort corrects it). */
export function restoreTripScope(db: AppDb, tripId: string, prev: { scope: TripScope; classifiedBy: TripClassifiedBy | null }) {
  db.update(trips).set(prev).where(eq(trips.id, tripId)).run();
}

/** Finished automatic trip → scope, reason, Stops. */
export function finishAutoTrip(db: AppDb, tripId: string, scope: TripScope, by: TripClassifiedBy | null) {
  db.update(trips).set({ scope, classifiedBy: by }).where(eq(trips.id, tripId)).run();
  rebuildStops(db, tripId);
}

export const tripEnds = endsOf;

// ---------------- Missed-trip inputs ----------------

/** Entry and trip times from `from` (missed-trip days). */
export function activityTimes(db: AppDb, from: number, to: number) {
  const entryTimes = db
    .select({ at: entries.occurredAt })
    .from(entries)
    .where(and(gte(entries.occurredAt, from), lt(entries.occurredAt, to)))
    .all()
    .map((r) => r.at);
  const tripTimes = db
    .select({ at: trips.startedAt })
    .from(trips)
    .where(and(gte(trips.startedAt, from), lt(trips.startedAt, to)))
    .all()
    .map((r) => r.at);
  return { entryTimes, tripTimes };
}

/** Automatic trips saved since `at` (S-07d status line "last trip …"). */
export const lastAutoTrip = (db: AppDb): TripRow | undefined =>
  db.select().from(trips).where(and(eq(trips.startedBy, 'auto'), gt(trips.distanceM, 0))).orderBy(desc(trips.startedAt)).get();

/** Unsorted automatic trips (count for Miles / Sort). */
export const unsortedTripCount = (db: AppDb): number =>
  Number(db.select({ n: sql<number>`COUNT(*)` }).from(trips).where(eq(trips.scope, 'unsorted')).get()?.n ?? 0);
