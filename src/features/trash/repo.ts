import { and, desc, eq, inArray, isNotNull, isNull, lt } from 'drizzle-orm';

import type { Snapshot } from '@/db/entriesRepo';
import {
  categories,
  entries,
  odometerReadings,
  receipts,
  trash,
  trips,
  type EntryRow,
  type ReceiptRow,
  type TrashRow,
} from '@/db/schema';
import type { AppDb } from '@/db/types';
import { restoreTrip, type TripSnapshot } from '@/features/trips/auto/repo';

/**
 * Recently deleted (Q30, F-23). A delete still has its Undo snackbar; on top of that every deleted entry / trip is kept
 * here for 30 days with everything it owned (receipt rows, GPS points, stops, segments) so it can be put back.
 * Receipt files stay on disk until the item is purged. Not part of backups; a restore / Delete all data empties it.
 */
export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

interface EntryPayload {
  entry: EntryRow;
  receipts: ReceiptRow[];
}

export const entryTrashId = (entryId: string) => `entry:${entryId}`;
export const tripTrashId = (tripId: string) => `trip:${tripId}`;

const signed = (e: EntryRow) => (e.type === 'expense' ? -e.amountMinor : e.amountMinor);

/** One Recently deleted item per entry of a delete snapshot (each can be restored on its own). */
export function trashEntries(db: AppDb, snap: Pick<Snapshot, 'entries' | 'receipts'>, now = Date.now()): void {
  if (snap.entries.length === 0) return;
  const names = new Map(
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(inArray(categories.id, snap.entries.flatMap((e) => (e.categoryId ? [e.categoryId] : []))))
      .all()
      .map((c) => [c.id, c.name]),
  );
  db.transaction((tx) => {
    for (const e of snap.entries) {
      const rs = snap.receipts.filter((r) => r.entryId === e.id);
      const payload: EntryPayload = { entry: e, receipts: rs };
      const row: TrashRow = {
        id: entryTrashId(e.id),
        kind: 'entry',
        deletedAt: now,
        label: e.note || (e.categoryId ? (names.get(e.categoryId) ?? '') : ''),
        amountMinor: signed(e),
        currency: e.currency,
        distanceM: null,
        itemAt: e.occurredAt,
        payload: JSON.stringify(payload),
        files: JSON.stringify([...new Set(rs.map((r) => r.filePath))]),
      };
      tx.insert(trash).values(row).onConflictDoUpdate({ target: trash.id, set: row }).run();
    }
  });
}

interface TripPayload extends TripSnapshot {
  /** Parking & tolls entries kept when the trip was deleted ("Keep the expense"): linked again on restore. */
  keptEntryIds?: string[];
}

export function trashTrip(db: AppDb, snap: TripSnapshot, now = Date.now(), keptEntryIds: string[] = []): void {
  const t = snap.trip;
  const payload: TripPayload = { ...snap, keptEntryIds };
  const row: TrashRow = {
    id: tripTrashId(t.id),
    kind: 'trip',
    deletedAt: now,
    label: t.fromLabel && t.toLabel ? `${t.fromLabel} → ${t.toLabel}` : t.purpose,
    amountMinor: null,
    currency: null,
    distanceM: t.distanceM,
    itemAt: t.startedAt,
    payload: JSON.stringify(payload),
    files: '[]',
  };
  db.insert(trash).values(row).onConflictDoUpdate({ target: trash.id, set: row }).run();
}

/** Undo of a delete: the items came back through the snapshot, so they leave Recently deleted. */
export function untrash(db: AppDb, ids: string[]): void {
  if (ids.length) db.delete(trash).where(inArray(trash.id, ids)).run();
}

export type TrashItem = Omit<TrashRow, 'payload' | 'files'>;

export function listTrash(db: AppDb): TrashItem[] {
  return db
    .select({
      id: trash.id,
      kind: trash.kind,
      deletedAt: trash.deletedAt,
      label: trash.label,
      amountMinor: trash.amountMinor,
      currency: trash.currency,
      distanceM: trash.distanceM,
      itemAt: trash.itemAt,
    })
    .from(trash)
    .orderBy(desc(trash.deletedAt), desc(trash.itemAt))
    .all();
}

/** Days before the item is removed for good (0 = today). */
export const daysLeft = (deletedAt: number, now = Date.now()) => Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY - now) / DAY));

/**
 * Puts a deleted item back. An entry whose category was deleted meanwhile comes back unsorted; a Parking & tolls entry
 * whose trip is gone loses the link. Returns false if the item is no longer in Recently deleted.
 */
export function restoreFromTrash(db: AppDb, id: string): boolean {
  const row = db.select().from(trash).where(eq(trash.id, id)).get();
  if (!row) return false;
  if (row.kind === 'entry') {
    const p = JSON.parse(row.payload) as EntryPayload;
    const e = { ...p.entry };
    if (e.categoryId && !db.select({ id: categories.id }).from(categories).where(eq(categories.id, e.categoryId)).get()) {
      e.categoryId = null;
      e.sortedAt = null;
    }
    if (e.tripId && !db.select({ id: trips.id }).from(trips).where(eq(trips.id, e.tripId)).get()) e.tripId = null;
    db.transaction((tx) => {
      tx.insert(entries).values(e).onConflictDoNothing().run();
      if (p.receipts.length) tx.insert(receipts).values(p.receipts).onConflictDoNothing().run();
      tx.delete(trash).where(eq(trash.id, id)).run();
    });
  } else {
    const snap = JSON.parse(row.payload) as TripPayload;
    const { keptEntryIds = [], ...trip } = snap;
    if (!db.select({ id: trips.id }).from(trips).where(eq(trips.id, trip.trip.id)).get()) restoreTrip(db, trip);
    // Parking & tolls kept when the trip was deleted ("Keep the expense") — link it back.
    if (keptEntryIds.length)
      db.update(entries)
        .set({ tripId: trip.trip.id })
        .where(and(inArray(entries.id, keptEntryIds), isNull(entries.tripId)))
        .run();
    db.delete(trash).where(eq(trash.id, id)).run();
  }
  return true;
}

/**
 * Removes items for good: the given ids, or everything deleted before `olderThan`, or all when neither is given.
 * Returns receipt file names no row uses any more (receipts, odometer photos, other Recently deleted items) — the
 * caller deletes them from disk.
 */
export function purgeTrash(db: AppDb, opts: { ids?: string[]; olderThan?: number } = {}): string[] {
  const where = opts.ids ? inArray(trash.id, opts.ids) : opts.olderThan !== undefined ? lt(trash.deletedAt, opts.olderThan) : undefined;
  const gone = db.select({ id: trash.id, files: trash.files }).from(trash).where(where).all();
  if (gone.length === 0) return [];
  const candidates = [...new Set(gone.flatMap((g) => JSON.parse(g.files) as string[]))];
  db.delete(trash).where(inArray(trash.id, gone.map((g) => g.id))).run();
  if (candidates.length === 0) return [];
  const used = new Set<string>([
    ...db.select({ p: receipts.filePath }).from(receipts).where(inArray(receipts.filePath, candidates)).all().map((r) => r.p),
    ...db
      .select({ p: odometerReadings.photoPath })
      .from(odometerReadings)
      .where(and(isNotNull(odometerReadings.photoPath), inArray(odometerReadings.photoPath, candidates)))
      .all()
      .map((r) => r.p as string),
    ...db
      .select({ files: trash.files })
      .from(trash)
      .all()
      .flatMap((r) => JSON.parse(r.files) as string[]),
  ]);
  return candidates.filter((f) => !used.has(f));
}

/** Items deleted more than 30 days ago (nightly task + app start). */
export const purgeExpired = (db: AppDb, now = Date.now()) => purgeTrash(db, { olderThan: now - TRASH_DAYS * DAY });

export const trashCount = (db: AppDb) => db.select({ id: trash.id }).from(trash).all().length;
