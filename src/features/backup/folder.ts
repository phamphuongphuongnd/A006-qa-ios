import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { BackupFolder } from '../../../modules/backup-folder';
import { db } from '@/db/client';
import { getSettings, updateSettings, type AppSettings } from '@/db/settingsRepo';
import { withLockSuspended } from '@/features/settings/lockState';

import { createBackupFile } from './backupFile';
import type { BackupTables } from './pack';
import { runNightlyBackup, type BackupFolderPort, type FolderEntry, type MadeFile, type RunResult } from './nightly';

/** Device side of nightly backup: the picked folder (Android SAF / iOS bookmark) and the ZIP in the app cache. */

type Folder = NonNullable<AppSettings['backupFolder']>;

const NIGHTLY_CACHE = 'backup-nightly';

function androidPort(uri: string): BackupFolderPort {
  const dir = () => {
    const d = new Directory(uri);
    if (!d.exists) throw new Error('folder gone');
    return d;
  };
  const child = (name: string) => dir().list().find((f): f is File => f instanceof File && f.name === name) ?? null;
  return {
    async list() {
      return dir()
        .list()
        .filter((f): f is File => f instanceof File)
        .map((f): FolderEntry => ({ name: f.name, size: f.size ?? 0, uri: f.uri }));
    },
    async put(localUri, name) {
      const old = child(name);
      if (old) old.delete();
      const src = new File(localUri);
      if (src.name !== name) throw new Error('local name must match');
      await src.copy(dir());
      if (!child(name)) throw new Error('copy did not land');
    },
    async remove(name) {
      child(name)?.delete();
    },
    async readText(name) {
      const f = child(name);
      return f ? f.text() : null;
    },
    async writeText(name, text) {
      const f = child(name) ?? dir().createFile(name, 'application/json');
      f.write(text);
    },
    async fetch(name) {
      const f = child(name);
      if (!f) throw new Error('missing');
      return f.uri;
    },
  };
}

function iosPort(bookmark: string): BackupFolderPort {
  const native = BackupFolder;
  if (!native) throw new Error('backup-folder module missing');
  const tmp = () => {
    const d = new Directory(Paths.cache, 'backup-folder-io');
    if (!d.exists) d.create({ intermediates: true });
    return d;
  };
  return {
    async list() {
      return (await native.list(bookmark)).map((f) => ({ name: f.name, size: f.size, uri: null }));
    },
    put: (localUri, name) => native.copyInto(bookmark, localUri, name),
    remove: (name) => native.remove(bookmark, name),
    async readText(name) {
      const files = await native.list(bookmark);
      if (!files.some((f) => f.name === name)) return null;
      const out = new File(tmp(), name);
      await native.copyOut(bookmark, name, out.uri);
      return out.text();
    },
    async writeText(name, text) {
      const f = new File(tmp(), name);
      f.write(text);
      await native.copyInto(bookmark, f.uri, name);
    },
    async fetch(name) {
      const out = new File(tmp(), name);
      await native.copyOut(bookmark, name, out.uri);
      return out.uri;
    },
  };
}

/** Port for the saved folder, or null when none is picked. Throws if the folder can't be opened. */
export function folderPort(folder: Folder | null): BackupFolderPort | null {
  if (!folder) return null;
  if (Platform.OS === 'ios') return iosPort(folder.bookmark ?? '');
  return androidPort(folder.uri);
}

/** "Google Drive / Sunday Sort", "This phone / Backups", "iCloud Drive / Sunday Sort". */
export function folderLabel(uri: string, name: string | null): string {
  const n = name ? decodeURIComponent(name) : '';
  let where = '';
  if (uri.includes('com.google.android.apps.docs')) where = 'Google Drive';
  else if (uri.includes('com.android.externalstorage')) where = 'This phone';
  else if (uri.includes('com~apple~CloudDocs') || uri.includes('Mobile%20Documents') || uri.includes('Mobile Documents'))
    where = 'iCloud Drive';
  else if (Platform.OS === 'ios') where = 'On My iPhone';
  return where && n ? `${where} / ${n}` : n || where || 'Backup folder';
}

/** System folder picker. null when cancelled. */
export async function pickBackupFolder(): Promise<Folder | null> {
  let dir: Directory;
  try {
    dir = await withLockSuspended(() => Directory.pickDirectoryAsync());
  } catch {
    return null; // cancelled
  }
  if (!dir) return null;
  const bookmark = Platform.OS === 'ios' && BackupFolder ? BackupFolder.makeBookmark(dir.uri) : null;
  return { uri: dir.uri, label: folderLabel(dir.uri, dir.name), bookmark };
}

async function makeFile(tables: BackupTables, photoNames: string[], name: string): Promise<MadeFile> {
  const res = await createBackupFile(
    { tables, photoNames },
    { onProgress: () => {}, isCancelled: () => false, name, dir: NIGHTLY_CACHE },
  );
  if (!res) throw new Error('cancelled');
  const file = res.file;
  return {
    uri: file.uri,
    counts: res.counts,
    discard: () => {
      try {
        if (file.exists) file.delete();
      } catch {
        // cache is cleaned by the OS anyway
      }
    },
  };
}

let running: Promise<RunResult> | null = null;

/**
 * One nightly backup now (background task, "Tap to finish", right after picking the folder). Runs one at a time.
 * Returns null when nightly backup is off / no folder.
 */
export function runNightlyNow(opts: { force?: boolean; now?: number } = {}): Promise<RunResult> | null {
  const s = getSettings(db);
  if (!s.backupNightly || !s.backupFolder) return null;
  if (running) return running;
  let port: BackupFolderPort;
  try {
    port = folderPort(s.backupFolder)!;
  } catch {
    port = {
      list: () => Promise.reject(new Error('no folder')),
      put: () => Promise.reject(new Error('no folder')),
      remove: async () => {},
      readText: async () => null,
      writeText: async () => {},
      fetch: () => Promise.reject(new Error('no folder')),
    };
  }
  running = runNightlyBackup({ db, port, now: opts.now ?? Date.now(), makeFile, force: opts.force }).finally(() => {
    running = null;
  });
  return running;
}

/** Can the saved folder be opened right now? (S-12 "— not reachable"). */
export async function folderReachable(folder: Folder | null): Promise<boolean> {
  try {
    const port = folderPort(folder);
    if (!port) return false;
    await port.list();
    return true;
  } catch {
    return false;
  }
}

export const saveFolder = (folder: Folder) =>
  updateSettings(db, { backupFolder: folder, backupNightly: true, backupFailCount: 0, backupRun: null, lastAutoBackupAt: null });
