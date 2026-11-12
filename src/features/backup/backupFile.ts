import Constants from 'expo-constants';
import { Directory, File, FileMode, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { receiptsDir } from '@/files/receipts';

import { referencedPhotos, replaceAllData, snapshotTables } from './dataStore';
import { backupFileName, packBackup, type BackupCounts, type BackupManifest, type PhotoSource } from './pack';

export const appVersion = () => Constants.expoConfig?.version ?? '1.0.0';

export class NoSpaceError extends Error {}

/** What a backup of this phone would contain right now (for "Packing 1,204 entries and 318 photos…"). */
export function backupPlan() {
  const tables = snapshotTables(db);
  return { tables, photoNames: referencedPhotos(tables) };
}

/**
 * Streams the backup ZIP into <cache>/backup/SundaySort-backup-YYYY-MM-DD.sundaysort.
 * Returns null when cancelled.
 */
export async function createBackupFile(
  plan: ReturnType<typeof backupPlan>,
  opts: { onProgress: (done: number, total: number) => void; isCancelled: () => boolean; now?: number },
): Promise<{ file: File; counts: BackupCounts } | null> {
  const now = opts.now ?? Date.now();
  const rdir = receiptsDir();
  const photoFiles = plan.photoNames.map((name) => ({ name, file: new File(rdir, name) }));

  // Rough size check before writing anything: photos are stored as-is, the JSON compresses well.
  const photoBytes = photoFiles.reduce((n, p) => n + (p.file.exists ? p.file.size : 0), 0);
  const need = photoBytes + 5 * 1024 * 1024;
  const free = Paths.availableDiskSpace;
  if (free > 0 && free < need) throw new NoSpaceError();

  const dir = new Directory(Paths.cache, 'backup');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const file = new File(dir, backupFileName(now));
  file.create({ overwrite: true });
  const handle = file.open(FileMode.WriteOnly);
  try {
    const sources: PhotoSource[] = photoFiles.map((p) => ({ name: p.name, read: () => (p.file.exists ? p.file.bytesSync() : null) }));
    const res = await packBackup(plan.tables, sources, {
      createdAt: now,
      appVersion: appVersion(),
      onChunk: (c) => handle.writeBytesSync(c),
      onProgress: opts.onProgress,
      pause: () => new Promise((r) => setTimeout(r, 0)),
      isCancelled: opts.isCancelled,
    });
    handle.close();
    if (res.cancelled) {
      file.delete();
      return null;
    }
    return { file, counts: res.counts };
  } catch (e) {
    try {
      handle.close();
      if (file.exists) file.delete();
    } catch {
      // already gone
    }
    throw e;
  }
}

/**
 * Replaces the phone's data. Photos are written to a staging folder first and the DB is swapped in one
 * transaction; only then is the old receipts folder replaced. Any failure before the swap leaves everything as it was.
 */
export function restoreFromBackup(manifest: BackupManifest, photos: Map<string, Uint8Array>): void {
  const staging = new Directory(Paths.document, 'receipts-restore');
  if (staging.exists) staging.delete();
  staging.create({ intermediates: true });
  try {
    for (const [name, bytes] of photos) {
      const f = new File(staging, name);
      f.create({ overwrite: true });
      f.writeSync(bytes);
    }
    replaceAllData(db, manifest.tables);
  } catch (e) {
    if (staging.exists) staging.delete();
    throw e;
  }
  const current = receiptsDir();
  if (current.exists) current.delete();
  staging.rename('receipts');
}

/** Deletes every receipt photo (Delete all data). */
export function deleteAllReceiptFiles(): void {
  const dir = receiptsDir();
  if (dir.exists) dir.delete();
}
