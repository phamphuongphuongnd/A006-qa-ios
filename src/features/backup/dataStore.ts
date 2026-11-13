import { categories, entries, receipts, settings, tripPoints, trips } from '@/db/schema';
import type { AppDb } from '@/db/types';

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
  };
}

/** SQLite allows ~999 bound variables per statement; entries have 14 columns. */
const CHUNK = 50;

function insertChunks<T>(rows: T[], insert: (part: T[]) => void) {
  for (let i = 0; i < rows.length; i += CHUNK) insert(rows.slice(i, i + CHUNK));
}

function clearAll(tx: AppDb) {
  // Children first (foreign keys are on).
  tx.delete(tripPoints).run();
  tx.delete(trips).run();
  tx.delete(receipts).run();
  tx.delete(entries).run();
  tx.delete(categories).run();
  tx.delete(settings).run();
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
    insertChunks(t.categories, (p) => d.insert(categories).values(p).run());
    insertChunks(t.entries, (p) => d.insert(entries).values(p).run());
    insertChunks(t.receipts, (p) => d.insert(receipts).values(p).run());
    insertChunks(t.trips, (p) => d.insert(trips).values(p).run());
    // Point ids are autoincrement; keep them so the order of a track is preserved.
    insertChunks(t.tripPoints, (p) => d.insert(tripPoints).values(p).run());
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
