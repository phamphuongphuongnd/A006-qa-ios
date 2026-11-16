// DB access for Missing trips (Q26) and Odometer checks (Q27). S1c owns these two tables.
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { odometerReadings, trips, tripGapDismissals, type OdometerReadingRow } from '@/db/schema';
import { newId, type AppDb } from '@/db/types';
import { metersToMiles } from '@/domain/mileage';

import { getKV, setKV } from '../auto/repo';
import { findGaps, gapKey, GAP_WINDOW_MS, type TripEnds, type TripGap } from './gaps';
import { compareReadings, type OdometerResult } from './odometer';

// ---------------- Missing trips ----------------

/** Finished GPS / Auto / NFC trips started since `since`, with their first and last recorded point. */
export function tripEnds(db: AppDb, since: number): TripEnds[] {
  const p = (dir: 'ASC' | 'DESC', col: 'lat' | 'lng') =>
    sql<number | null>`(SELECT ${sql.raw(col)} FROM trip_points p WHERE p.trip_id = "trips"."id" ORDER BY p.ts ${sql.raw(dir)} LIMIT 1)`;
  const rows = db
    .select({
      id: trips.id,
      startedAt: trips.startedAt,
      endedAt: trips.endedAt,
      firstLat: p('ASC', 'lat'),
      firstLng: p('ASC', 'lng'),
      lastLat: p('DESC', 'lat'),
      lastLng: p('DESC', 'lng'),
    })
    .from(trips)
    .where(and(eq(trips.source, 'gps'), inArray(trips.status, ['done', 'interrupted']), gte(trips.startedAt, since)))
    .all();
  const out: TripEnds[] = [];
  for (const r of rows) {
    if (r.firstLat === null || r.firstLng === null || r.lastLat === null || r.lastLng === null) continue;
    out.push({
      id: r.id,
      startedAt: r.startedAt,
      endedAt: r.endedAt ?? r.startedAt,
      first: { lat: r.firstLat, lng: r.firstLng },
      last: { lat: r.lastLat, lng: r.lastLng },
    });
  }
  return out;
}

export function answeredGaps(db: AppDb): Set<string> {
  return new Set(
    db
      .select()
      .from(tripGapDismissals)
      .all()
      .map((r) => gapKey(r.prevTripId, r.nextTripId)),
  );
}

/** Missing trips of the last 30 days, newest first. */
export function missingTrips(db: AppDb, now = Date.now()): TripGap[] {
  // A trip that started just before the window can still be the earlier half of a gap inside it.
  return findGaps(tripEnds(db, now - GAP_WINDOW_MS - 24 * 60 * 60 * 1000), answeredGaps(db), now).filter(
    (g) => g.to >= now - GAP_WINDOW_MS,
  );
}

/** "Not a trip" / an estimated trip was added: this gap is not offered again. */
export function answerGap(db: AppDb, prevId: string, nextId: string, answer: 'dismissed' | 'added', now = Date.now()) {
  db.insert(tripGapDismissals)
    .values({ prevTripId: prevId, nextTripId: nextId, answer, createdAt: now })
    .onConflictDoUpdate({ target: tripGapDismissals.nextTripId, set: { prevTripId: prevId, answer, createdAt: now } })
    .run();
}

/** Undo of "Not a trip". */
export function unanswerGap(db: AppDb, nextId: string) {
  db.delete(tripGapDismissals).where(eq(tripGapDismissals.nextTripId, nextId)).run();
}

/** Pro driving distances already fetched for gaps (gap key → metres), kept so the service is asked once per gap. */
const ROUTES_KEY = 'gapRoutes';
const ROUTES_KEEP = 60;

export const gapRoutes = (db: AppDb): Record<string, number> => getKV<Record<string, number>>(db, ROUTES_KEY, {});

export function saveGapRoute(db: AppDb, key: string, meters: number) {
  const all = Object.entries(gapRoutes(db)).filter(([k]) => k !== key);
  all.push([key, meters]);
  setKV(db, ROUTES_KEY, Object.fromEntries(all.slice(-ROUTES_KEEP)));
}

// ---------------- Odometer readings ----------------

export const listReadings = (db: AppDb): OdometerReadingRow[] =>
  db.select().from(odometerReadings).orderBy(asc(odometerReadings.readAt)).all();

export const latestReading = (db: AppDb): OdometerReadingRow | undefined =>
  db.select().from(odometerReadings).orderBy(desc(odometerReadings.readAt)).get();

export function addReading(
  db: AppDb,
  r: { value: number; unit: 'mi' | 'km'; readAt?: number; photoPath?: string | null },
): OdometerReadingRow {
  const row: OdometerReadingRow = { id: newId(), readAt: r.readAt ?? Date.now(), value: r.value, unit: r.unit, photoPath: r.photoPath ?? null };
  db.insert(odometerReadings).values(row).run();
  return row;
}

export const deleteReading = (db: AppDb, id: string) => db.delete(odometerReadings).where(eq(odometerReadings.id, id)).run();

/** Every mile the app logged from `from` up to (not including) `to`: all scopes and sources. */
export function loggedMiles(db: AppDb, from: number, to: number): number {
  const r = db
    .select({ m: sql<number>`COALESCE(SUM(${trips.distanceM}), 0)` })
    .from(trips)
    .where(and(gte(trips.startedAt, from), lt(trips.startedAt, to)))
    .get();
  return metersToMiles(Number(r?.m ?? 0));
}

export interface ReadingCheck {
  reading: OdometerReadingRow;
  prev: OdometerReadingRow | null;
  result: OdometerResult;
}

/** Each reading compared with the one before it, oldest first. */
export function readingChecks(db: AppDb): ReadingCheck[] {
  const rows = listReadings(db);
  return rows.map((reading, i) => {
    const prev = i > 0 ? rows[i - 1] : null;
    return { reading, prev, result: compareReadings(prev, reading, prev ? loggedMiles(db, prev.readAt, reading.readAt) : 0) };
  });
}

/** "That's fine" on the latest result: the Home card goes until the next reading. */
const ODO_OK_KEY = 'odoAccepted';
export const acceptedReadingId = (db: AppDb) => getKV<string | null>(db, ODO_OK_KEY, null);
export const acceptReading = (db: AppDb, id: string | null) => setKV(db, ODO_OK_KEY, id);

/** Start of the first trip (for the first "Time for an odometer check"). */
export function firstTripAt(db: AppDb): number | null {
  const r = db.select({ at: sql<number | null>`MIN(${trips.startedAt})` }).from(trips).get();
  return r?.at ?? null;
}

/** Photo file names kept by readings (backup carries them; "Delete all data" removes the folder). */
export const readingPhotos = (rows: Pick<OdometerReadingRow, 'photoPath'>[]) =>
  rows.map((r) => r.photoPath).filter((p): p is string => !!p);
