import { and, eq, inArray, sql } from 'drizzle-orm';

import { createEntry, deleteEntries, updateEntry } from '@/db/entriesRepo';
import { categories, entries, type EntryRow, type TripRow } from '@/db/schema';
import type { AppDb } from '@/db/types';
import type { Currency, Minor, Scope } from '@/domain/types';
import { entryTrashId, restoreFromTrash, trashEntries, untrash } from '@/features/trash/repo';
import { t } from '@/i18n';

import { formatDay } from './format';

/**
 * Parking & tolls typed on a trip (Q28, F-23): one Expense linked to the trip (`entries.trip_id`), category
 * "Parking, tolls & congestion" (US "Parking & tolls"), scope of the trip, dated at the trip's end. Reports count it
 * like any other parking expense (added on top of the mileage rate — X2).
 */

/** The built-in parking category (hidden or renamed still counts); null if the driver deleted it. */
export const parkingCategoryId = (db: AppDb): string | null =>
  db.select({ id: categories.id }).from(categories).where(eq(categories.key, 'parking')).get()?.id ?? null;

/** Expenses linked to a trip (normally one). */
export const tripParkingEntries = (db: AppDb, tripId: string): EntryRow[] =>
  db.select().from(entries).where(and(eq(entries.tripId, tripId), eq(entries.type, 'expense'))).all();

export const tripParkingMinor = (db: AppDb, tripId: string): Minor =>
  tripParkingEntries(db, tripId).reduce((n, e) => n + e.amountMinor, 0);

/** Parking & tolls per trip for a list of trips (Miles rows). */
export function parkingByTrip(db: AppDb, tripIds: string[]): Map<string, Minor> {
  if (tripIds.length === 0) return new Map();
  const rows = db
    .select({ tripId: entries.tripId, m: sql<number>`SUM(${entries.amountMinor})` })
    .from(entries)
    .where(and(inArray(entries.tripId, tripIds), eq(entries.type, 'expense')))
    .groupBy(entries.tripId)
    .all();
  return new Map(rows.map((r) => [r.tripId as string, Number(r.m)]));
}

/** Scope the parking entry takes from its trip (an Unsorted trip's parking waits in the queue with it). */
const scopeOf = (t: Pick<TripRow, 'scope'>): Scope => (t.scope === 'personal' ? 'personal' : 'work');

/**
 * Sets the trip's Parking & tolls to `minor` (0 / null = none). Creates, updates or deletes the linked expense; a
 * removed one goes to Recently deleted. Returns the entry id, or null when there is none now.
 */
export function setTripParking(
  db: AppDb,
  trip: Pick<TripRow, 'id' | 'scope' | 'startedAt' | 'endedAt'>,
  minor: Minor | null,
  currency: Currency,
  note: string,
  now = Date.now(),
): string | null {
  const [current, ...extra] = tripParkingEntries(db, trip.id);
  if (!minor || minor <= 0) {
    const ids = [current, ...extra].filter(Boolean).map((e) => e.id);
    if (ids.length) trashEntries(db, deleteEntries(db, ids).snapshot, now);
    return null;
  }
  if (current) {
    if (current.amountMinor !== minor) updateEntry(db, current.id, { amountMinor: minor }, now);
    return current.id;
  }
  const categoryId = parkingCategoryId(db);
  // Unsorted trip → unsorted expense (no category): it waits in the Sort queue with the trip.
  const sorted = trip.scope !== 'unsorted' && categoryId !== null;
  const row = createEntry(
    db,
    {
      type: 'expense',
      amountMinor: minor,
      currency,
      occurredAt: trip.endedAt ?? trip.startedAt,
      note,
      scope: scopeOf(trip),
      categoryId: sorted ? categoryId : null,
      tripId: trip.id,
    },
    now,
  );
  return row.id;
}

// Trip scope changes (swipe, sort, auto) carry over to its parking through the `trips_parking_scope` trigger (0004).

/**
 * Deleting a trip: `deleteBoth` sends its parking to Recently deleted too (returns the ids for Undo); otherwise the
 * expense stays and loses the link (returns the kept ids so a restored trip links them again).
 */
export function detachParking(db: AppDb, tripId: string, deleteBoth: boolean, now = Date.now()): { deleted: string[]; kept: string[] } {
  const ids = tripParkingEntries(db, tripId).map((e) => e.id);
  if (ids.length === 0) return { deleted: [], kept: [] };
  if (deleteBoth) {
    trashEntries(db, deleteEntries(db, ids).snapshot, now);
    return { deleted: ids, kept: [] };
  }
  db.update(entries).set({ tripId: null }).where(inArray(entries.id, ids)).run();
  return { deleted: [], kept: ids };
}

/** Undo of a trip delete: parking entries deleted with it come back (and leave Recently deleted). */
export function undoDetach(db: AppDb, tripId: string, r: { deleted: string[]; kept: string[] }) {
  for (const id of r.deleted) restoreFromTrash(db, entryTrashId(id));
  if (r.kept.length) db.update(entries).set({ tripId }).where(inArray(entries.id, r.kept)).run();
  untrash(db, r.deleted.map(entryTrashId));
}

/** "Parking · DLS4 → Tesco Leeds" / "Parking · Leeds drops" / "Parking · Tue 10 Nov trip". */
export function parkingNoteFor(trip: Pick<TripRow, 'fromLabel' | 'toLabel' | 'purpose' | 'startedAt'>): string {
  const what = trip.fromLabel && trip.toLabel ? `${trip.fromLabel} → ${trip.toLabel}` : trip.purpose.trim() || formatDay(trip.startedAt);
  return t('s6.parkingNote', { trip: what }).slice(0, 120);
}
