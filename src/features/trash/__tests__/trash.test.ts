import { createCategory, deleteCategory, seedCategories } from '@/db/categoriesRepo';
import { createEntry, deleteEntries, getEntry, listReceipts, restoreSnapshot } from '@/db/entriesRepo';
import { odometerReadings } from '@/db/schema';
import { makeTestDb } from '@/db/testing/testDb';
import { appendPoints, deleteTrip, endTrip, getTrip, startTrip, tripPointsOf } from '@/db/tripsRepo';
import { snapshotTrip } from '@/features/trips/auto/repo';
import { replaceAllData, snapshotTables } from '@/features/backup/dataStore';

import {
  daysLeft,
  entryTrashId,
  listTrash,
  purgeExpired,
  purgeTrash,
  restoreFromTrash,
  trashEntries,
  trashTrip,
  tripTrashId,
  untrash,
} from '../repo';

const DAY = 86_400_000;
const T0 = new Date(2026, 10, 10, 9, 0).getTime();

function setup() {
  const db = makeTestDb();
  seedCategories(db, 'UK');
  return db;
}

describe('Recently deleted (Q30)', () => {
  it('keeps a deleted entry with its receipts and restores it exactly (TC-350, TC-351)', () => {
    const db = setup();
    const e = createEntry(db, { type: 'expense', amountMinor: 7240, currency: 'GBP', note: 'Shell', receiptPaths: ['a.jpg', 'b.jpg'] }, T0);
    const before = getEntry(db, e.id)!;
    const { snapshot } = deleteEntries(db, [e.id]);
    trashEntries(db, snapshot, T0 + DAY);
    expect(getEntry(db, e.id)).toBeUndefined();
    const [item] = listTrash(db);
    expect(item).toMatchObject({ id: entryTrashId(e.id), kind: 'entry', label: 'Shell', amountMinor: -7240, itemAt: T0 });
    expect(daysLeft(item.deletedAt, T0 + 4 * DAY)).toBe(27);

    expect(restoreFromTrash(db, item.id)).toBe(true);
    expect(getEntry(db, e.id)).toEqual(before);
    expect(listReceipts(db, e.id).map((r) => r.filePath).sort()).toEqual(['a.jpg', 'b.jpg']);
    expect(listTrash(db)).toEqual([]);
    expect(restoreFromTrash(db, item.id)).toBe(false);
  });

  it('Undo takes the item back out of Recently deleted', () => {
    const db = setup();
    const e = createEntry(db, { type: 'income', amountMinor: 62000, currency: 'GBP', note: 'DPD' }, T0);
    const { snapshot } = deleteEntries(db, [e.id]);
    trashEntries(db, snapshot);
    restoreSnapshot(db, snapshot);
    untrash(db, [entryTrashId(e.id)]);
    expect(listTrash(db)).toEqual([]);
    expect(getEntry(db, e.id)).toBeDefined();
  });

  it('restores as unsorted when the category was deleted meanwhile', () => {
    const db = setup();
    const cat = createCategory(db, { type: 'expense', name: 'Tolls only', icon: 'tag', color: '#000', taxLine: 'SA103: Other' });
    if (!cat.ok) throw new Error('category');
    const e = createEntry(db, { type: 'expense', amountMinor: 375, currency: 'GBP', categoryId: cat.id }, T0);
    trashEntries(db, deleteEntries(db, [e.id]).snapshot);
    expect(deleteCategory(db, cat.id)).toEqual({ ok: true });
    restoreFromTrash(db, entryTrashId(e.id));
    expect(getEntry(db, e.id)).toMatchObject({ categoryId: null, sortedAt: null });
  });

  it('keeps a deleted GPS trip with its points (TC-352)', () => {
    const db = setup();
    const trip = startTrip(db, 'work', T0);
    appendPoints(db, trip.id, [
      { ts: T0, lat: 53.79, lng: -1.54, accuracy: 5, speed: 12 },
      { ts: T0 + 60_000, lat: 53.8, lng: -1.53, accuracy: 5, speed: 12 },
      { ts: T0 + 120_000, lat: 53.81, lng: -1.52, accuracy: 5, speed: 12 },
    ]);
    endTrip(db, trip.id, T0 + 120_000);
    const snap = snapshotTrip(db, trip.id)!;
    deleteTrip(db, trip.id);
    trashTrip(db, snap, T0 + DAY);
    expect(tripPointsOf(db, trip.id)).toEqual([]);
    expect(listTrash(db)[0]).toMatchObject({ kind: 'trip', distanceM: snap.trip.distanceM });
    restoreFromTrash(db, tripTrashId(trip.id));
    expect(getTrip(db, trip.id)).toEqual(snap.trip);
    expect(tripPointsOf(db, trip.id)).toHaveLength(3);
  });

  it('purges after 30 days and only returns files nothing else uses (TC-353, TC-354)', () => {
    const db = setup();
    const a = createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP', receiptPaths: ['shared.jpg', 'a.jpg'] }, T0);
    const b = createEntry(db, { type: 'expense', amountMinor: 200, currency: 'GBP', receiptPaths: ['shared.jpg'] }, T0);
    const c = createEntry(db, { type: 'expense', amountMinor: 300, currency: 'GBP', receiptPaths: ['odo.jpg'] }, T0);
    db.insert(odometerReadings).values({ id: 'o1', readAt: T0, value: 1000, unit: 'mi', photoPath: 'odo.jpg' }).run();
    trashEntries(db, deleteEntries(db, [a.id]).snapshot, T0);
    trashEntries(db, deleteEntries(db, [c.id]).snapshot, T0 + 20 * DAY);
    expect(purgeExpired(db, T0 + 29 * DAY)).toEqual([]);
    // a is 31 days old: a.jpg goes, shared.jpg is still used by b.
    expect(purgeExpired(db, T0 + 31 * DAY)).toEqual(['a.jpg']);
    expect(listTrash(db).map((i) => i.id)).toEqual([entryTrashId(c.id)]);
    // c's photo is also the odometer photo: kept.
    expect(purgeTrash(db)).toEqual([]);
    expect(listTrash(db)).toEqual([]);
    expect(getEntry(db, b.id)).toBeDefined();
  });

  it('is never backed up and a restore empties it (TC-355)', () => {
    const db = setup();
    const e = createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP' }, T0);
    const tables = snapshotTables(db);
    trashEntries(db, deleteEntries(db, [e.id]).snapshot);
    expect(Object.keys(snapshotTables(db))).not.toContain('trash');
    replaceAllData(db, tables);
    expect(listTrash(db)).toEqual([]);
    expect(getEntry(db, e.id)).toBeDefined();
  });
});
