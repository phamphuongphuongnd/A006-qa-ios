import {
  categories,
  entries,
  knownRoutes,
  places,
  proState,
  receipts,
  recurring,
  ruleOffers,
  rules,
  settings,
  tripPoints,
  trips,
  tripSegments,
  tripStops,
  type CategoryRow,
  type TripRow,
} from '@/db/schema';
import type { AppDb } from '@/db/types';
import { defaultMtdCategory, isVehicleRunningCostKey } from '@/domain/mtd';

import type { BackupTables } from './pack';

/** Every row of every table — the content of a backup. */
export function snapshotTables(db: AppDb): BackupTables {
  return {
    categories: db.select().from(categories).all(),
    entries: db.select().from(entries).all(),
    receipts: db.select().from(receipts).all(),
    trips: db.select().from(trips).all(),
    tripPoints: db.select().from(tripPoints).all(),
    settings: db.select().from(settings).all(),
    tripStops: db.select().from(tripStops).all(),
    tripSegments: db.select().from(tripSegments).all(),
    rules: db.select().from(rules).all(),
    ruleOffers: db.select().from(ruleOffers).all(),
    recurring: db.select().from(recurring).all(),
    knownRoutes: db.select().from(knownRoutes).all(),
    places: db.select().from(places).all(),
    proState: db.select().from(proState).all(),
  };
}

/** SQLite allows ~999 bound variables per statement; entries have 21 columns. */
const CHUNK = 40;

function insertChunks<T>(rows: T[], insert: (part: T[]) => void) {
  for (let i = 0; i < rows.length; i += CHUNK) insert(rows.slice(i, i + CHUNK));
}

function clearAll(tx: AppDb) {
  // Children first (foreign keys are on).
  tx.delete(tripSegments).run();
  tx.delete(tripStops).run();
  tx.delete(tripPoints).run();
  tx.delete(trips).run();
  tx.delete(knownRoutes).run();
  tx.delete(places).run();
  tx.delete(receipts).run();
  tx.delete(entries).run();
  tx.delete(rules).run();
  tx.delete(ruleOffers).run();
  tx.delete(recurring).run();
  tx.delete(categories).run();
  tx.delete(settings).run();
  // pro_state is not the driver's records: "Delete all data" keeps it and a restore never overwrites it (a backup made
  // before the trial must not hand out a second trial). A new phone with no Pro state takes the backup's.
}

/**
 * Version-1 backups have no bản-2 columns. Give them what the 0001 migration gives existing rows: MTD category from
 * the SA103 line, built-in vehicle running costs, GPS trips started by the user. Rows that carry the columns are
 * left as they are (the driver's own choices).
 */
function upgradeCategory(c: CategoryRow): CategoryRow {
  const r = c as Partial<CategoryRow> & CategoryRow;
  return {
    ...c,
    mtdCategory: r.mtdCategory === undefined ? defaultMtdCategory(c.taxLine, c.type) : r.mtdCategory,
    vehicleRunningCost: r.vehicleRunningCost === undefined ? isVehicleRunningCostKey(c.key) : r.vehicleRunningCost,
  };
}

function upgradeTrip(t: TripRow): TripRow {
  const r = t as Partial<TripRow> & TripRow;
  return r.startedBy === undefined ? { ...t, startedBy: t.source === 'gps' ? 'user' : null } : t;
}

/**
 * Restore: one transaction, so a failure leaves the phone's data untouched.
 * `backupCreatedAt` (B-25): the restored data is exactly what that backup file holds, so "Last backup" becomes the
 * file's date (or the file's own lastBackupAt if later) instead of whatever the settings said when it was packed —
 * otherwise a phone restored a minute ago greets the user with "You haven't backed up yet".
 */
export function replaceAllData(db: AppDb, t: BackupTables, backupCreatedAt?: number): void {
  db.transaction((tx) => {
    const d = tx as unknown as AppDb;
    clearAll(d);
    insertChunks(t.categories.map(upgradeCategory), (p) => d.insert(categories).values(p).run());
    insertChunks(t.entries, (p) => d.insert(entries).values(p).run());
    insertChunks(t.receipts, (p) => d.insert(receipts).values(p).run());
    insertChunks(t.trips.map(upgradeTrip), (p) => d.insert(trips).values(p).run());
    // Point ids are autoincrement; keep them so the order of a track is preserved.
    insertChunks(t.tripPoints, (p) => d.insert(tripPoints).values(p).run());
    insertChunks(t.tripStops ?? [], (p) => d.insert(tripStops).values(p).run());
    insertChunks(t.tripSegments ?? [], (p) => d.insert(tripSegments).values(p).run());
    insertChunks(t.rules ?? [], (p) => d.insert(rules).values(p).run());
    insertChunks(t.ruleOffers ?? [], (p) => d.insert(ruleOffers).values(p).run());
    insertChunks(t.recurring ?? [], (p) => d.insert(recurring).values(p).run());
    insertChunks(t.knownRoutes ?? [], (p) => d.insert(knownRoutes).values(p).run());
    insertChunks(t.places ?? [], (p) => d.insert(places).values(p).run());
    if (!d.select().from(proState).get()) insertChunks(t.proState ?? [], (p) => d.insert(proState).values(p).run());
    insertChunks(t.settings, (p) => d.insert(settings).values(p).run());
    if (backupCreatedAt !== undefined) {
      const raw = t.settings.find((r) => r.key === 'lastBackupAt')?.value;
      const packed = raw ? (JSON.parse(raw) as number | null) : null;
      const last = Math.max(packed ?? 0, backupCreatedAt);
      for (const [key, value] of [
        ['lastBackupAt', last],
        ['backupBannerSnoozedUntil', null],
      ] as const) {
        const json = JSON.stringify(value);
        d.insert(settings).values({ key, value: json }).onConflictDoUpdate({ target: settings.key, set: { value: json } }).run();
      }
    }
  });
}

/** "Delete all data": every table emptied. Returns receipt file names to delete from disk. */
export function wipeAllData(db: AppDb): string[] {
  const paths = db.select({ p: receipts.filePath }).from(receipts).all().map((r) => r.p);
  db.transaction((tx) => clearAll(tx as unknown as AppDb));
  return [...new Set(paths)];
}

/** File names referenced by receipt rows (what a backup must carry). */
export const referencedPhotos = (t: Pick<BackupTables, 'receipts'>) => [...new Set(t.receipts.map((r) => r.filePath))];
