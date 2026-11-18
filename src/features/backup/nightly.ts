import { getSettings, updateSettings, type AppSettings } from '@/db/settingsRepo';
import type { AppDb } from '@/db/types';

import { snapshotTables, referencedPhotos } from './dataStore';
import { BACKUP_EXT, type BackupCounts, type BackupTables } from './pack';

/**
 * Nightly backup (Q10, P1-7): once a night, if anything changed since the last nightly backup, write one backup
 * file into the folder the driver picked once, keep the newest 7, count failures (3 → Home card).
 * The folder (SAF / iOS bookmark) and the ZIP writer are passed in, so this file runs in Jest.
 */

export const NIGHTLY_KEEP = 7;
const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Small JSON next to the backups: dates + counts for the "Restore from backup" list without unzipping 7 files. */
export const INDEX_NAME = 'SundaySort-backups.json';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `SundaySort-backup-2026-11-13-0210-k3x9qa.sundaysort` (local time + this phone's tag). The manual share-sheet file has
 * no time part. QA-100 SPE-9: two phones backing up into one folder deleted each other's files (the newest 7 counted
 * across both) and could overwrite each other in the same minute — the tag keeps them apart.
 */
export function nightlyFileName(at: number, tag?: string): string {
  const d = new Date(at);
  return `SundaySort-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${tag ? `-${tag}` : ''}.${BACKUP_EXT}`;
}

const NAME_RE = new RegExp(`^SundaySort-backup-(\\d{4})-(\\d{2})-(\\d{2})(?:-(\\d{2})(\\d{2})(?:-([a-z0-9]{4,8}))?)?\\.${BACKUP_EXT}$`);

/** Time encoded in a backup file name (manual files: local midnight), or null for other files. `tag`: which phone. */
export function parseBackupName(name: string): { at: number; nightly: boolean; tag?: string } | null {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  const [, y, mo, d, h, mi, tag] = m;
  return { at: new Date(+y, +mo - 1, +d, h ? +h : 0, mi ? +mi : 0).getTime(), nightly: h !== undefined, tag: tag ?? undefined };
}

/** This phone's nightly files: its own tag, or untagged ones from before tags existed. */
const ownNightly = (p: ReturnType<typeof parseBackupName>, tag?: string) => !!p?.nightly && (!tag || !p.tag || p.tag === tag);

/** This phone's nightly files beyond the newest `keep` (other phones' files and hand-saved ones are never deleted). */
export function filesToPrune(names: string[], keep = NIGHTLY_KEEP, tag?: string): string[] {
  const nightly = names
    .map((name) => ({ name, p: parseBackupName(name) }))
    .filter((x) => ownNightly(x.p, tag))
    .sort((a, b) => b.p!.at - a.p!.at || (a.name < b.name ? 1 : -1));
  return nightly.slice(keep).map((x) => x.name);
}

// ---------- "Anything changed?" ----------

/** Settings that change because of backups / banners themselves — not the driver's data. */
const VOLATILE_SETTINGS = new Set([
  'lastBackupAt',
  'lastAutoBackupAt',
  'backupFailCount',
  'backupRun',
  'backupBannerSnoozedUntil',
  'alertSnoozedUntil',
]);

/** 53-bit string hash (cyrb53). Not cryptographic — only "same data as last night?". */
export function hash53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Fingerprint of the driver's data. Pro state (store checks touch it) and backup bookkeeping are left out. */
export function dataFingerprint(t: BackupTables): string {
  const { proState: _p, settings, ...rest } = t;
  const s = settings.filter((r) => !VOLATILE_SETTINGS.has(r.key)).sort((a, b) => (a.key < b.key ? -1 : 1));
  // Row order from SQLite is stable for unchanged tables; sizes guard against a hash collision on deletes.
  const sizes = Object.entries(rest).map(([k, v]) => `${k}:${(v as unknown[]).length}`);
  return `${sizes.join(',')}#${hash53(JSON.stringify(rest))}#${hash53(JSON.stringify(s))}`;
}

// ---------- When to run, and failures ----------

export type BackupRunError = 'folder' | 'space' | 'other';
export type BackupRunState = NonNullable<AppSettings['backupRun']>;

type NightlySettings = Pick<AppSettings, 'backupNightly' | 'backupFolder' | 'backupRun'>;

/**
 * The background task wakes every few hours (WorkManager / BGTaskScheduler decide exactly when). A run is due at
 * night (01:00–06:00) once ≥ 12 h passed since the last try, or any time after 26 h without one (phone off at night).
 * A failed night is retried the next night, not every wake-up. `force`: "Tap to finish" / first run after picking.
 */
export function nightlyDue(s: NightlySettings, now: number): boolean {
  if (!s.backupNightly || !s.backupFolder) return false;
  const last = s.backupRun?.lastTryAt ?? null;
  if (last === null || last > now) return true;
  const since = now - last;
  if (since < 12 * HOUR) return false;
  const h = new Date(now).getHours();
  return (h >= 1 && h < 6) || since >= 26 * HOUR;
}

/**
 * Failures for the Home card / S-12 status: failed tries in a row, or whole days since the last good nightly run
 * (the task never ran: no network, battery saver…) — whichever is larger.
 */
export function backupFailures(
  s: Pick<AppSettings, 'backupNightly' | 'backupFailCount' | 'lastAutoBackupAt'>,
  now: number,
): number {
  if (!s.backupNightly) return 0;
  const days = s.lastAutoBackupAt === null ? 0 : Math.max(0, Math.floor((now - s.lastAutoBackupAt) / DAY));
  return Math.max(s.backupFailCount, days);
}

// ---------- The folder ----------

export interface FolderEntry {
  name: string;
  size: number;
  /** Something `readable(uri)` / the restore screen can open (content:// or file://). */
  uri: string | null;
}

/** The picked folder. Android: SAF tree; iOS: modules/backup-folder bookmark. Every method may throw (unreachable). */
export interface BackupFolderPort {
  list(): Promise<FolderEntry[]>;
  /** Copies a local file into the folder under `name`, replacing a file of that name. */
  put(localUri: string, name: string): Promise<void>;
  remove(name: string): Promise<void>;
  readText(name: string): Promise<string | null>;
  writeText(name: string, text: string): Promise<void>;
  /** Local file URI holding a copy of `name` (restore). */
  fetch(name: string): Promise<string>;
}

export interface IndexItem {
  name: string;
  createdAt: number;
  entries: number;
  trips: number;
  photos: number;
}

export function parseIndex(text: string | null): IndexItem[] {
  if (!text) return [];
  try {
    const j = JSON.parse(text) as { files?: unknown };
    if (!Array.isArray(j.files)) return [];
    return j.files.filter(
      (f): f is IndexItem => !!f && typeof f.name === 'string' && typeof f.createdAt === 'number' && typeof f.entries === 'number',
    );
  } catch {
    return [];
  }
}

export const serializeIndex = (files: IndexItem[]) => JSON.stringify({ format: 'sundaysort-backup-index', version: 1, files }, null, 1);

export interface BackupListItem {
  name: string;
  createdAt: number;
  nightly: boolean;
  counts: Pick<BackupCounts, 'entries' | 'photos' | 'trips'> | null;
  size: number;
  uri: string | null;
  /** Phone tag from the file name (SPE-9), when it has one. */
  tag?: string;
}

/** "Restore from backup" list: every backup file in the folder, newest first, with counts from the index. */
export async function listFolderBackups(port: BackupFolderPort): Promise<BackupListItem[]> {
  const files = await port.list();
  const index = parseIndex(await port.readText(INDEX_NAME).catch(() => null));
  const byName = new Map(index.map((i) => [i.name, i]));
  const out: BackupListItem[] = [];
  for (const f of files) {
    const p = parseBackupName(f.name);
    if (!p) continue;
    const i = byName.get(f.name);
    out.push({
      name: f.name,
      createdAt: i?.createdAt ?? p.at,
      nightly: p.nightly,
      counts: i ? { entries: i.entries, trips: i.trips, photos: i.photos } : null,
      size: f.size,
      uri: f.uri,
      tag: p.tag,
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

// ---------- One run ----------

export interface MadeFile {
  /** Local file (app cache) holding the ZIP; deleted after copying. */
  uri: string;
  counts: BackupCounts;
  discard: () => void;
}

export class NoSpaceError extends Error {}

export interface RunDeps {
  db: AppDb;
  port: BackupFolderPort;
  now: number;
  /** Packs the backup into a local file named `name`. Throws NoSpaceError when the phone is full. */
  makeFile: (tables: BackupTables, photoNames: string[], name: string) => Promise<MadeFile>;
  /** Write even when nothing changed ("Tap to finish", first run, the driver asked). */
  force?: boolean;
  /** This phone's tag in nightly file names (SPE-9). */
  tag?: string;
}

export type RunResult =
  | { status: 'written'; name: string; pruned: string[] }
  | { status: 'unchanged' }
  | { status: 'failed'; error: BackupRunError; failCount: number };

/** One nightly backup. Records the outcome in settings; never throws. */
export async function runNightlyBackup(d: RunDeps): Promise<RunResult> {
  const { db, port, now } = d;
  const before = getSettings(db);
  const tables = snapshotTables(db);
  const fingerprint = dataFingerprint(tables);

  const fail = (error: BackupRunError): RunResult => {
    const failCount = before.backupFailCount + 1;
    updateSettings(db, {
      backupFailCount: failCount,
      backupRun: { fingerprint: before.backupRun?.fingerprint ?? null, lastTryAt: now, lastError: error },
    });
    return { status: 'failed', error, failCount };
  };
  const ok = (wrote: boolean) =>
    updateSettings(db, {
      backupFailCount: 0,
      lastAutoBackupAt: now,
      ...(wrote ? { lastBackupAt: now, backupBannerSnoozedUntil: null } : {}),
      backupRun: { fingerprint, lastTryAt: now, lastError: null },
    });

  let files: FolderEntry[];
  try {
    files = await port.list();
  } catch {
    return fail('folder');
  }
  const names = files.map((f) => f.name);
  const hasNightly = names.some((n) => ownNightly(parseBackupName(n), d.tag));
  if (!d.force && hasNightly && before.backupRun?.fingerprint === fingerprint) {
    ok(false);
    return { status: 'unchanged' };
  }

  const name = nightlyFileName(now, d.tag);
  let made: MadeFile;
  try {
    made = await d.makeFile(tables, referencedPhotos(tables), name);
  } catch (e) {
    return fail(e instanceof NoSpaceError ? 'space' : 'other');
  }
  try {
    await port.put(made.uri, name);
  } catch {
    made.discard();
    return fail('folder');
  }
  made.discard();

  const pruned = filesToPrune([...names.filter((n) => n !== name), name], NIGHTLY_KEEP, d.tag);
  for (const p of pruned) await port.remove(p).catch(() => {});

  // Index: best effort (the list still works without counts).
  try {
    const keep = new Set([...names, name].filter((n) => !pruned.includes(n)));
    const index = parseIndex(await port.readText(INDEX_NAME).catch(() => null)).filter((i) => keep.has(i.name) && i.name !== name);
    index.push({ name, createdAt: now, entries: made.counts.entries, trips: made.counts.trips, photos: made.counts.photos });
    await port.writeText(INDEX_NAME, serializeIndex(index));
  } catch {
    // ignore
  }

  ok(true);
  return { status: 'written', name, pruned };
}
