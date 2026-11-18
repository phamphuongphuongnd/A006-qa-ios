import Constants from 'expo-constants';
import { Directory, File, FileMode, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { receiptsDir } from '@/files/receipts';

import { referencedPhotos, replaceAllData, snapshotTables } from './dataStore';
import { NoSpaceError } from './nightly';
import { backupFileName, packBackup, type BackupCounts, type BackupManifest, type PhotoSource } from './pack';
import { readBackupStream, type ChunkSource, type PhotoSink, type StreamResult } from './streamRestore';

export const appVersion = () => Constants.expoConfig?.version ?? '1.0.0';

export { NoSpaceError } from './nightly';

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
  opts: { onProgress: (done: number, total: number) => void; isCancelled: () => boolean; now?: number; name?: string; dir?: string },
): Promise<{ file: File; counts: BackupCounts } | null> {
  const now = opts.now ?? Date.now();
  const rdir = receiptsDir();
  const photoFiles = plan.photoNames.map((name) => ({ name, file: new File(rdir, name) }));

  // Rough size check before writing anything: photos are stored as-is, the JSON compresses well.
  const photoBytes = photoFiles.reduce((n, p) => n + (p.file.exists ? p.file.size : 0), 0);
  const need = photoBytes + 5 * 1024 * 1024;
  const free = Paths.availableDiskSpace;
  if (free > 0 && free < need) throw new NoSpaceError();

  // The share-sheet file and the nightly file use separate cache folders (both may run at once).
  const dir = new Directory(Paths.cache, opts.dir ?? 'backup');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const file = new File(dir, opts.name ?? backupFileName(now));
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
    replaceAllData(db, manifest.tables, manifest.createdAt);
  } catch (e) {
    if (staging.exists) staging.delete();
    throw e;
  }
  const current = receiptsDir();
  if (current.exists) current.delete();
  staging.rename('receipts');
}

const CHUNK = 1024 * 1024;

/** The backup file 1 MB at a time (B-87: never the whole file in memory). */
function fileSource(uri: string): ChunkSource & { close(): void } {
  const h = new File(uri).open(FileMode.ReadOnly);
  let open = true;
  const close = () => {
    if (open) {
      open = false;
      h.close();
    }
  };
  return {
    close,
    next: async () => {
      if (!open) return null;
      const b = h.readBytesSync(CHUNK);
      if (b.length === 0) {
        close();
        return null;
      }
      return b;
    },
  };
}

/** Restore preview: reads only backup.json (photos are skipped, not held). */
export async function inspectBackupFile(uri: string): Promise<StreamResult> {
  const src = fileSource(uri);
  try {
    return await readBackupStream(src, null);
  } finally {
    src.close();
  }
}

/**
 * B-87: restore straight from the file — photos stream into a staging folder, the DB is swapped in one transaction,
 * then the staging folder replaces receipts/. Anything failing before the swap leaves the phone as it was.
 */
export async function restoreFromBackupFile(uri: string): Promise<StreamResult> {
  const staging = new Directory(Paths.document, 'receipts-restore');
  if (staging.exists) staging.delete();
  staging.create({ intermediates: true });
  const sink: PhotoSink = {
    open: (name) => {
      const f = new File(staging, name);
      f.create({ overwrite: true });
      const h = f.open(FileMode.WriteOnly);
      return { write: (c) => h.writeBytesSync(c), close: () => h.close() };
    },
  };
  const src = fileSource(uri);
  let r: StreamResult;
  try {
    r = await readBackupStream(src, sink);
    if (r.ok) replaceAllData(db, r.manifest.tables, r.manifest.createdAt);
  } catch (e) {
    if (staging.exists) staging.delete();
    throw e;
  } finally {
    src.close();
  }
  if (!r.ok) {
    if (staging.exists) staging.delete();
    return r;
  }
  const current = receiptsDir();
  if (current.exists) current.delete();
  staging.rename('receipts');
  return r;
}

/** Deletes every receipt photo (Delete all data). */
export function deleteAllReceiptFiles(): void {
  const dir = receiptsDir();
  if (dir.exists) dir.delete();
}
