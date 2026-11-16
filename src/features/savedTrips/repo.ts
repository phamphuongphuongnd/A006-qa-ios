import { desc, eq, sql } from 'drizzle-orm';

import { savedTrips, type SavedTripRow, type TripRow } from '@/db/schema';
import type { TripRoute } from '@/db/tripsRepo';
import { newId, type AppDb } from '@/db/types';
import { metersToMiles } from '@/domain/mileage';

/**
 * Regular trips (Q31, F-23): a trip the driver drives often, saved to add again in one tap from Add trip (S-08).
 * Reusing a saved distance is free; working out a new A → B route stays Pro (Q25).
 */

/** Most used first, then most recent. */
export const listSavedTrips = (db: AppDb): SavedTripRow[] =>
  db
    .select()
    .from(savedTrips)
    .orderBy(desc(savedTrips.useCount), desc(sql`COALESCE(${savedTrips.lastUsedAt}, ${savedTrips.createdAt})`))
    .all();

export const getSavedTrip = (db: AppDb, id: string) => db.select().from(savedTrips).where(eq(savedTrips.id, id)).get();

/** One-way distance of a trip (a round-trip A → B trip is stored doubled). */
export const oneWayMeters = (t: Pick<TripRow, 'distanceM' | 'roundTrip'>) => (t.roundTrip ? t.distanceM / 2 : t.distanceM);

export function saveTripAsRegular(
  db: AppDb,
  trip: Pick<TripRow, 'distanceM' | 'roundTrip' | 'scope' | 'purpose' | 'fromLabel' | 'toLabel' | 'fromLat' | 'fromLng' | 'toLat' | 'toLng'>,
  label: string,
  now = Date.now(),
): SavedTripRow {
  const row: SavedTripRow = {
    id: newId(),
    label: label.trim().slice(0, 60),
    distanceM: oneWayMeters(trip),
    roundTrip: trip.roundTrip,
    scope: trip.scope === 'personal' ? 'personal' : 'work',
    purpose: trip.purpose,
    fromLabel: trip.fromLabel,
    toLabel: trip.toLabel,
    fromLat: trip.fromLat,
    fromLng: trip.fromLng,
    toLat: trip.toLat,
    toLng: trip.toLng,
    useCount: 0,
    lastUsedAt: null,
    createdAt: now,
  };
  db.insert(savedTrips).values(row).run();
  return row;
}

export const renameSavedTrip = (db: AppDb, id: string, label: string) =>
  db.update(savedTrips).set({ label: label.trim().slice(0, 60) }).where(eq(savedTrips.id, id)).run();

export function deleteSavedTrip(db: AppDb, id: string): SavedTripRow | undefined {
  const row = getSavedTrip(db, id);
  db.delete(savedTrips).where(eq(savedTrips.id, id)).run();
  return row;
}

export const restoreSavedTrip = (db: AppDb, row: SavedTripRow) => db.insert(savedTrips).values(row).onConflictDoNothing().run();

/** A trip was added from it. */
export const markSavedTripUsed = (db: AppDb, id: string, now = Date.now()) =>
  db
    .update(savedTrips)
    .set({ useCount: sql`${savedTrips.useCount} + 1`, lastUsedAt: now })
    .where(eq(savedTrips.id, id))
    .run();

/** A → B ends of a saved trip (null when it was a typed distance / GPS trip). */
export function savedRoute(s: SavedTripRow, roundTrip: boolean): TripRoute | null {
  if (s.fromLabel === null || s.toLabel === null || s.fromLat === null || s.fromLng === null || s.toLat === null || s.toLng === null) return null;
  return { from: { label: s.fromLabel, lat: s.fromLat, lng: s.fromLng }, to: { label: s.toLabel, lat: s.toLat, lng: s.toLng }, roundTrip };
}

/** Miles to put in Add trip: one way, × 2 for a round trip. */
export const savedMiles = (s: Pick<SavedTripRow, 'distanceM'>, roundTrip: boolean) => metersToMiles(s.distanceM) * (roundTrip ? 2 : 1);

