import { seedCategories } from '@/db/categoriesRepo';
import { createEntry } from '@/db/entriesRepo';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import type { AppDb } from '@/db/types';

import { backupAlertSignals } from '../homeAlerts';
import {
  backupFailures,
  dataFingerprint,
  filesToPrune,
  INDEX_NAME,
  listFolderBackups,
  nightlyDue,
  nightlyFileName,
  NoSpaceError,
  parseBackupName,
  parseIndex,
  runNightlyBackup,
  type BackupFolderPort,
  type MadeFile,
} from '../nightly';
import { snapshotTables } from '../dataStore';

const at = (y: number, m: number, d: number, h = 2, mi = 10) => new Date(y, m - 1, d, h, mi).getTime();

/** In-memory folder. `broken` makes every call throw (folder unreachable). */
function fakeFolder(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const state = { broken: false, failPut: false };
  const guard = () => {
    if (state.broken) throw new Error('unreachable');
  };
  const port: BackupFolderPort = {
    async list() {
      guard();
      return [...files.keys()].map((name) => ({ name, size: files.get(name)!.length, uri: `mem://${name}` }));
    },
    async put(localUri, name) {
      guard();
      if (state.failPut) throw new Error('write failed');
      files.set(name, `zip:${localUri}`);
    },
    async remove(name) {
      guard();
      files.delete(name);
    },
    async readText(name) {
      guard();
      return files.get(name) ?? null;
    },
    async writeText(name, text) {
      guard();
      files.set(name, text);
    },
    async fetch(name) {
      guard();
      return `mem://${name}`;
    },
  };
  return { port, files, state };
}

const makeFile = jest.fn(
  async (t: { entries: unknown[]; trips: unknown[] }, photos: string[], name: string): Promise<MadeFile> => ({
    uri: `cache://${name}`,
    counts: { entries: t.entries.length, trips: t.trips.length, photos: photos.length, categories: 0 },
    discard: () => {},
  }),
);

function seeded(): AppDb {
  const db = makeTestDb();
  updateSettings(db, { region: 'UK', onboarded: true, backupNightly: true, backupFolder: { uri: 'content://x', label: 'Google Drive / A006', bookmark: null } });
  seedCategories(db, 'UK');
  createEntry(db, { type: 'expense', amountMinor: 4520, currency: 'GBP', receiptPaths: ['a.jpg'] });
  return db;
}

beforeEach(() => makeFile.mockClear());

describe('file names', () => {
  it('nightly names carry the time and sort by it', () => {
    expect(nightlyFileName(at(2026, 11, 13, 2, 10))).toBe('SundaySort-backup-2026-11-13-0210.sundaysort');
    expect(parseBackupName('SundaySort-backup-2026-11-13-0210.sundaysort')).toEqual({ at: at(2026, 11, 13, 2, 10), nightly: true });
    expect(parseBackupName('SundaySort-backup-2026-11-10.sundaysort')).toEqual({ at: at(2026, 11, 10, 0, 0), nightly: false });
    expect(parseBackupName('SundaySort-backup-2026-11-10 (1).sundaysort')).toBeNull();
    expect(parseBackupName('holiday.jpg')).toBeNull();
  });

  it('keeps the newest 7 nightly files and never touches hand-saved ones', () => {
    const names = Array.from({ length: 9 }, (_, i) => nightlyFileName(at(2026, 11, 1 + i)));
    names.push('SundaySort-backup-2026-10-01.sundaysort', INDEX_NAME, 'notes.txt');
    expect(filesToPrune(names)).toEqual([nightlyFileName(at(2026, 11, 2)), nightlyFileName(at(2026, 11, 1))]);
    expect(filesToPrune(names.slice(0, 7))).toEqual([]);
  });
});

describe('when to run', () => {
  const s = { backupNightly: true, backupFolder: { uri: 'x', label: 'x', bookmark: null }, backupRun: null };
  it('needs nightly on and a folder', () => {
    expect(nightlyDue({ ...s, backupNightly: false }, at(2026, 11, 13))).toBe(false);
    expect(nightlyDue({ ...s, backupFolder: null }, at(2026, 11, 13))).toBe(false);
    expect(nightlyDue(s, at(2026, 11, 13, 15))).toBe(true); // never tried
  });
  it('runs at night once ≥ 12 h passed, or any time after 26 h', () => {
    const run = (lastTryAt: number) => ({ ...s, backupRun: { fingerprint: 'f', lastTryAt, lastError: null } });
    expect(nightlyDue(run(at(2026, 11, 12, 2)), at(2026, 11, 13, 2))).toBe(true);
    expect(nightlyDue(run(at(2026, 11, 13, 1)), at(2026, 11, 13, 4))).toBe(false); // same night
    expect(nightlyDue(run(at(2026, 11, 13, 1)), at(2026, 11, 13, 20))).toBe(false); // evening, 19 h
    expect(nightlyDue(run(at(2026, 11, 12, 2)), at(2026, 11, 13, 14))).toBe(true); // missed the night: 36 h
  });
});

describe('failures', () => {
  const base = { backupNightly: true, backupFailCount: 0, lastAutoBackupAt: at(2026, 11, 10) };
  it('counts failed tries and whole days without a good run', () => {
    expect(backupFailures(base, at(2026, 11, 11, 1))).toBe(0);
    expect(backupFailures(base, at(2026, 11, 12, 3))).toBe(2);
    expect(backupFailures({ ...base, backupFailCount: 3 }, at(2026, 11, 10, 5))).toBe(3);
    expect(backupFailures({ ...base, backupNightly: false, backupFailCount: 5 }, at(2026, 11, 20))).toBe(0);
  });
  it('raises the Home card after 3 days without a nightly run', () => {
    const s = { ...getSettings(makeTestDb()), ...base };
    expect(backupAlertSignals(s, 10, at(2026, 11, 12, 3)).failing).toBe(false);
    expect(backupAlertSignals(s, 10, at(2026, 11, 13, 3)).failing).toBe(true);
  });
});

describe('fingerprint', () => {
  it('ignores backup bookkeeping and Pro checks, sees data changes', () => {
    const db = seeded();
    const a = dataFingerprint(snapshotTables(db));
    updateSettings(db, { lastBackupAt: 1, backupFailCount: 2, lastAutoBackupAt: 3, alertSnoozedUntil: { x: 1 } });
    expect(dataFingerprint(snapshotTables(db))).toBe(a);
    createEntry(db, { type: 'income', amountMinor: 100, currency: 'GBP' });
    expect(dataFingerprint(snapshotTables(db))).not.toBe(a);
  });
});

describe('runNightlyBackup', () => {
  it('writes a file + index, records success', async () => {
    const db = seeded();
    const f = fakeFolder();
    const now = at(2026, 11, 13, 2, 10);
    const r = await runNightlyBackup({ db, port: f.port, now, makeFile });
    expect(r).toEqual({ status: 'written', name: 'SundaySort-backup-2026-11-13-0210.sundaysort', pruned: [] });
    expect(f.files.has('SundaySort-backup-2026-11-13-0210.sundaysort')).toBe(true);
    expect(parseIndex(f.files.get(INDEX_NAME)!)).toEqual([
      { name: 'SundaySort-backup-2026-11-13-0210.sundaysort', createdAt: now, entries: 1, trips: 0, photos: 1 },
    ]);
    const s = getSettings(db);
    expect(s).toMatchObject({ lastBackupAt: now, lastAutoBackupAt: now, backupFailCount: 0 });
    expect(s.backupRun).toMatchObject({ lastTryAt: now, lastError: null });
  });

  it('skips the file when nothing changed, but counts the night as good', async () => {
    const db = seeded();
    const f = fakeFolder();
    await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 13), makeFile });
    const r = await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 14), makeFile });
    expect(r.status).toBe('unchanged');
    expect(makeFile).toHaveBeenCalledTimes(1);
    expect(getSettings(db)).toMatchObject({ lastAutoBackupAt: at(2026, 11, 14), lastBackupAt: at(2026, 11, 13) });
    // forced ("Tap to finish") writes anyway
    expect((await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 14, 9), makeFile, force: true })).status).toBe('written');
  });

  it('writes again if the nightly files were deleted from the folder', async () => {
    const db = seeded();
    const f = fakeFolder();
    await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 13), makeFile });
    f.files.clear();
    expect((await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 14), makeFile })).status).toBe('written');
  });

  it('keeps 7 across nights and the index follows', async () => {
    const db = seeded();
    const f = fakeFolder({ 'SundaySort-backup-2026-10-01.sundaysort': 'manual' });
    for (let d = 1; d <= 9; d++) {
      createEntry(db, { type: 'expense', amountMinor: 100 + d, currency: 'GBP' });
      await runNightlyBackup({ db, port: f.port, now: at(2026, 11, d), makeFile });
    }
    const list = await listFolderBackups(f.port);
    expect(list.filter((x) => x.nightly)).toHaveLength(7);
    expect(list[0]).toMatchObject({ name: nightlyFileName(at(2026, 11, 9)), counts: { entries: 10, trips: 0, photos: 1 } });
    expect(list.at(-1)).toMatchObject({ name: 'SundaySort-backup-2026-10-01.sundaysort', nightly: false, counts: null });
    expect(parseIndex(f.files.get(INDEX_NAME)!)).toHaveLength(7);
  });

  it('counts failures; unreachable folder vs full phone', async () => {
    const db = seeded();
    const f = fakeFolder();
    f.state.broken = true;
    expect(await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 13), makeFile })).toEqual({ status: 'failed', error: 'folder', failCount: 1 });
    f.state.broken = false;
    f.state.failPut = true;
    expect(await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 14), makeFile })).toMatchObject({ error: 'folder', failCount: 2 });
    f.state.failPut = false;
    const full = jest.fn(async () => {
      throw new NoSpaceError();
    });
    expect(await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 15), makeFile: full })).toMatchObject({ error: 'space', failCount: 3 });
    expect(getSettings(db).backupRun).toMatchObject({ lastTryAt: at(2026, 11, 15), lastError: 'space' });
    await runNightlyBackup({ db, port: f.port, now: at(2026, 11, 16), makeFile });
    expect(getSettings(db)).toMatchObject({ backupFailCount: 0, backupRun: { lastError: null } });
  });
});


describe('QA-100 SPE-9: two phones, one backup folder', () => {
  it('names carry the phone tag and each phone prunes only its own (plus untagged older files)', () => {
    expect(nightlyFileName(at(2026, 11, 13, 2, 10), 'aaaa11')).toBe('SundaySort-backup-2026-11-13-0210-aaaa11.sundaysort');
    expect(parseBackupName('SundaySort-backup-2026-11-13-0210-bbbb22.sundaysort')).toEqual({ at: at(2026, 11, 13, 2, 10), nightly: true, tag: 'bbbb22' });
    const mine = Array.from({ length: 9 }, (_, i) => nightlyFileName(at(2026, 11, 1 + i), 'aaaa11'));
    const theirs = Array.from({ length: 7 }, (_, i) => nightlyFileName(at(2026, 11, 10 + i), 'bbbb22'));
    const legacy = nightlyFileName(at(2026, 10, 1));
    const manual = 'SundaySort-backup-2026-10-02.sundaysort';
    const pruned = filesToPrune([...mine, ...theirs, legacy, manual], 7, 'aaaa11');
    expect(pruned.sort()).toEqual([legacy, mine[0], mine[1]].sort());
    expect(pruned.some((n) => n.includes('bbbb22'))).toBe(false);
  });
});
