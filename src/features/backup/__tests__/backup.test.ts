import { strToU8, zipSync } from 'fflate';

import { listCategories, seedCategories } from '@/db/categoriesRepo';
import { createEntry, listReceipts } from '@/db/entriesRepo';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, appendPoints, endTrip, startTrip } from '@/db/tripsRepo';
import { proState } from '@/db/schema';
import type { AppDb } from '@/db/types';

import { referencedPhotos, replaceAllData, snapshotTables, wipeAllData } from '../dataStore';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  inspectBackup,
  MANIFEST_NAME,
  packBackup,
  unpackBackup,
  type BackupTables,
  type PhotoSource,
} from '../pack';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

function seed(db: AppDb) {
  updateSettings(db, { region: 'UK', onboarded: true, appLock: true, lastBackupAt: at(2026, 10, 1) });
  seedCategories(db, 'UK');
  const fuel = listCategories(db).find((c) => c.name === 'Fuel')!.id;
  createEntry(db, { type: 'expense', amountMinor: 4520, currency: 'GBP', note: 'Shell, M62', categoryId: fuel, occurredAt: at(2026, 11, 3), receiptPaths: ['a1.jpg', 'b2.jpg'] });
  createEntry(db, { type: 'income', amountMinor: 61240, currency: 'GBP', note: 'Flex payout', occurredAt: at(2026, 11, 4), receiptPaths: ['a1.jpg'] });
  createEntry(db, { type: 'expense', amountMinor: 350, currency: 'GBP', scope: 'personal', occurredAt: at(2026, 11, 5) });
  addManualTrip(db, { date: at(2026, 11, 2), scope: 'work', purpose: 'Depot', miles: 42.3 });
  const trip = startTrip(db, 'work', at(2026, 11, 6, 8));
  appendPoints(db, trip.id, [
    { ts: at(2026, 11, 6, 8), lat: 53.48, lng: -2.24, accuracy: 5 },
    { ts: at(2026, 11, 6, 8) + 60_000, lat: 53.49, lng: -2.24, accuracy: 5 },
  ]);
  endTrip(db, trip.id, at(2026, 11, 6, 9));
}

const PHOTOS: Record<string, Uint8Array> = {
  'a1.jpg': new Uint8Array([0xff, 0xd8, 1, 2, 3, 4, 0xff, 0xd9]),
  'b2.jpg': new Uint8Array([0xff, 0xd8, 9, 9, 9, 0xff, 0xd9]),
};

async function pack(tables: BackupTables, photos: PhotoSource[], createdAt = at(2026, 11, 10, 18)) {
  const chunks: Uint8Array[] = [];
  const progress: number[] = [];
  const res = await packBackup(tables, photos, {
    createdAt,
    appVersion: '1.0.0',
    onChunk: (c) => chunks.push(c),
    onProgress: (done) => progress.push(done),
  });
  const size = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return { bytes: out, progress, ...res };
}

const sources = (tables: BackupTables): PhotoSource[] =>
  referencedPhotos(tables).map((name) => ({ name, read: () => PHOTOS[name] ?? null }));

describe('backup round trip', () => {
  it('restores every table and photo into an empty phone', async () => {
    const src = makeTestDb();
    seed(src);
    const tables = snapshotTables(src);
    const { bytes, counts, progress } = await pack(tables, sources(tables));
    expect(counts).toEqual({ entries: 3, trips: 2, photos: 2, categories: 12 });
    expect(progress).toEqual([1, 2]);

    const preview = inspectBackup(bytes);
    expect(preview.ok && preview.manifest.counts).toEqual(counts);
    expect(preview.ok && preview.manifest.createdAt).toBe(at(2026, 11, 10, 18));

    const res = unpackBackup(bytes);
    if (!res.ok) throw new Error(res.error);
    expect([...res.photos.keys()].sort()).toEqual(['a1.jpg', 'b2.jpg']);
    expect(res.photos.get('b2.jpg')).toEqual(PHOTOS['b2.jpg']);

    const dst = makeTestDb();
    updateSettings(dst, { region: 'US', onboarded: true });
    seedCategories(dst, 'US');
    createEntry(dst, { type: 'income', amountMinor: 100, currency: 'USD' });
    replaceAllData(dst, res.manifest.tables);

    expect(snapshotTables(dst)).toEqual(tables);
    const s = getSettings(dst);
    expect(s.region).toBe('UK');
    expect(s.appLock).toBe(true);
    const shell = snapshotTables(dst).entries.find((e) => e.note === 'Shell, M62')!;
    expect(listReceipts(dst, shell.id).map((r) => r.filePath).sort()).toEqual(['a1.jpg', 'b2.jpg']);
  });

  it('bản 2: restores a version-1 file (no new tables / columns) with migration defaults', async () => {
    const src = makeTestDb();
    seed(src);
    const t = snapshotTables(src);
    const strip = <T extends object>(rows: T[], keys: string[]) =>
      rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k))));
    const v1Tables = {
      categories: strip(t.categories, ['mtdCategory', 'vehicleRunningCost']),
      entries: strip(t.entries, ['source', 'ruleId', 'recurringId', 'autoReviewedAt', 'ocrAmountMinor', 'ocrMerchant', 'ocrDate']),
      receipts: strip(t.receipts, ['ocrText']),
      trips: strip(t.trips, ['startedBy', 'originalStartedAt', 'originalEndedAt', 'originalDistanceM', 'classifiedBy']),
      tripPoints: t.tripPoints,
      settings: t.settings,
    };
    const manifest = {
      format: BACKUP_FORMAT,
      version: 1,
      createdAt: at(2026, 11, 10, 18),
      appVersion: '1.0.0',
      counts: { entries: 3, trips: 2, photos: 2, categories: 12 },
      tables: v1Tables,
    };
    const bytes = zipSync({ [MANIFEST_NAME]: strToU8(JSON.stringify(manifest)), 'receipts/a1.jpg': PHOTOS['a1.jpg'], 'receipts/b2.jpg': PHOTOS['b2.jpg'] });
    const res = unpackBackup(bytes);
    if (!res.ok) throw new Error(res.error);
    expect(res.manifest.tables.rules).toEqual([]);

    const dst = makeTestDb();
    replaceAllData(dst, res.manifest.tables);
    const back = snapshotTables(dst);
    expect(back.categories).toEqual(t.categories);
    expect(back.entries).toEqual(t.entries);
    expect(back.trips).toEqual(t.trips);
    expect(back.trips.find((x) => x.source === 'gps')?.startedBy).toBe('user');
  });

  it('bản 2: a restore keeps the phone\'s Pro state (no second trial from an old backup)', async () => {
    const src = makeTestDb();
    seed(src);
    const tables = snapshotTables(src);
    const dst = makeTestDb();
    dst.insert(proState).values({ id: 'pro', trialStartedAt: 5, trialEndsAt: 10, entitlement: 'none' }).run();
    replaceAllData(dst, tables);
    expect(snapshotTables(dst).proState).toEqual([expect.objectContaining({ trialStartedAt: 5 })]);
    wipeAllData(dst);
    expect(snapshotTables(dst).proState).toHaveLength(1);
    // A new phone takes the backup's Pro state.
    const fresh = makeTestDb();
    replaceAllData(fresh, { ...tables, proState: [{ id: 'pro', trialStartedAt: 7, trialEndsAt: 8, entitlement: 'none', expiresAt: null, productId: null, autoRenewing: null, lastVerifiedAt: null }] });
    expect(snapshotTables(fresh).proState[0].trialStartedAt).toBe(7);
  });

  it('B-25: a restore sets "Last backup" to the backup file date', async () => {
    const src = makeTestDb();
    seed(src);
    updateSettings(src, { lastBackupAt: null, backupBannerSnoozedUntil: at(2026, 11, 20) });
    const fileDate = at(2026, 11, 13, 9);
    const res = unpackBackup((await pack(snapshotTables(src), [], fileDate)).bytes);
    if (!res.ok) throw new Error(res.error);

    const dst = makeTestDb();
    replaceAllData(dst, res.manifest.tables, res.manifest.createdAt);
    expect(getSettings(dst).lastBackupAt).toBe(fileDate);
    expect(getSettings(dst).backupBannerSnoozedUntil).toBeNull();
    expect(getSettings(dst).region).toBe('UK');

    // A file whose own lastBackupAt is later than its creation date keeps the later one.
    updateSettings(src, { lastBackupAt: at(2026, 11, 14) });
    const res2 = unpackBackup((await pack(snapshotTables(src), [], fileDate)).bytes);
    if (!res2.ok) throw new Error(res2.error);
    replaceAllData(dst, res2.manifest.tables, res2.manifest.createdAt);
    expect(getSettings(dst).lastBackupAt).toBe(at(2026, 11, 14));
  });

  it('leaves out photos missing on disk and still restores', async () => {
    const db = makeTestDb();
    seed(db);
    const tables = snapshotTables(db);
    const { bytes, counts } = await pack(tables, [
      { name: 'a1.jpg', read: () => PHOTOS['a1.jpg'] },
      { name: 'b2.jpg', read: () => null },
    ]);
    expect(counts.photos).toBe(1);
    const res = unpackBackup(bytes);
    expect(res.ok && res.photos.size).toBe(1);
  });

  it('can be cancelled', async () => {
    let n = 0;
    const res = await packBackup(snapshotTables(makeTestDb()), [{ name: 'a1.jpg', read: () => PHOTOS['a1.jpg'] }], {
      createdAt: 0,
      appVersion: '1',
      onChunk: () => n++,
      isCancelled: () => true,
    });
    expect(res.cancelled).toBe(true);
  });

  it('skips unsafe photo names', async () => {
    const db = makeTestDb();
    const { bytes, counts } = await pack(snapshotTables(db), [{ name: '../evil.jpg', read: () => PHOTOS['a1.jpg'] }]);
    expect(counts.photos).toBe(0);
    expect(unpackBackup(bytes).ok).toBe(true);
  });
});

describe('backup errors', () => {
  const manifest = (over: Record<string, unknown> = {}) => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: 1,
    appVersion: '1.0.0',
    counts: { entries: 0, trips: 0, photos: 0, categories: 0 },
    tables: { categories: [], entries: [], receipts: [], trips: [], tripPoints: [], settings: [] },
    ...over,
  });
  const zipOf = (files: Record<string, Uint8Array>) => zipSync(files);
  const json = (o: unknown) => strToU8(JSON.stringify(o));

  it('rejects a file that is not a zip', () => {
    expect(inspectBackup(strToU8('date,amount\n2026-11-01,4.50'))).toEqual({ ok: false, error: 'not_backup' });
  });

  it('rejects a zip without our manifest', () => {
    expect(inspectBackup(zipOf({ 'photo.jpg': PHOTOS['a1.jpg'] }))).toEqual({ ok: false, error: 'not_backup' });
  });

  it('rejects a manifest of another format', () => {
    expect(inspectBackup(zipOf({ [MANIFEST_NAME]: json({ format: 'other' }) }))).toEqual({ ok: false, error: 'not_backup' });
  });

  it('reports a newer version', () => {
    expect(inspectBackup(zipOf({ [MANIFEST_NAME]: json(manifest({ version: BACKUP_VERSION + 1 })) }))).toEqual({
      ok: false,
      error: 'newer',
    });
  });

  it('reports damage: truncated zip, bad JSON, bad rows, count mismatch, missing photo', async () => {
    const db = makeTestDb();
    seed(db);
    const tables = snapshotTables(db);
    const { bytes } = await pack(tables, sources(tables));
    expect(unpackBackup(bytes.slice(0, Math.floor(bytes.length * 0.6)))).toEqual({ ok: false, error: 'damaged' });
    expect(inspectBackup(zipOf({ [MANIFEST_NAME]: strToU8('{"format":"sundays') }))).toEqual({ ok: false, error: 'damaged' });

    const badRow = manifest({
      counts: { entries: 1, trips: 0, photos: 0, categories: 0 },
      tables: { ...manifest().tables, entries: [{ id: 'x', type: 'expense', amountMinor: 1.5 }] },
    });
    expect(inspectBackup(zipOf({ [MANIFEST_NAME]: json(badRow) }))).toEqual({ ok: false, error: 'damaged' });

    const wrongCount = manifest({ counts: { entries: 5, trips: 0, photos: 0, categories: 0 } });
    expect(inspectBackup(zipOf({ [MANIFEST_NAME]: json(wrongCount) }))).toEqual({ ok: false, error: 'damaged' });

    const missingPhoto = manifest({ counts: { entries: 0, trips: 0, photos: 2, categories: 0 } });
    expect(unpackBackup(zipOf({ [MANIFEST_NAME]: json(missingPhoto) }))).toEqual({ ok: false, error: 'damaged' });
  });
});

describe('wipe and names', () => {
  it('wipes every table and returns the photo files', () => {
    const db = makeTestDb();
    seed(db);
    expect(wipeAllData(db).sort()).toEqual(['a1.jpg', 'b2.jpg']);
    const t = snapshotTables(db);
    expect(Object.values(t).every((rows) => rows.length === 0)).toBe(true);
    expect(getSettings(db).onboarded).toBe(false);
  });

  it('names the file by local date', () => {
    expect(backupFileName(at(2026, 11, 10, 18))).toBe('SundaySort-backup-2026-11-10.sundaysort');
  });
});

describe('QA-100 SPE-2: Pro state from a hand-edited backup', () => {
  const NOW = new Date(2026, 10, 17, 12).getTime();
  const DAY = 86_400_000;
  const restoreWith = (pro: Record<string, unknown>) => {
    const db = makeTestDb();
    const src = makeTestDb();
    seedCategories(src, 'UK');
    const t = snapshotTables(src);
    t.proState = [{ id: 'pro', trialStartedAt: null, trialEndsAt: null, entitlement: 'none', expiresAt: null, productId: null, autoRenewing: null, lastVerifiedAt: null, ...pro }] as typeof t.proState;
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    replaceAllData(db, t, NOW);
    (Date.now as jest.Mock).mockRestore();
    return db.select().from(proState).get()!;
  };

  it('caps a trial at 7 days from its start', () => {
    const r = restoreWith({ trialStartedAt: NOW - 3600_000, trialEndsAt: 4102444800000 });
    expect(r.trialEndsAt).toBe(NOW - 3600_000 + 7 * DAY);
  });

  it('a trial start in the future becomes now', () => {
    const r = restoreWith({ trialStartedAt: NOW + 400 * DAY, trialEndsAt: NOW + 407 * DAY });
    expect(r.trialStartedAt).toBe(NOW);
    expect(r.trialEndsAt).toBe(NOW + 7 * DAY);
  });

  it('never trusts an "active" subscription from a file', () => {
    const r = restoreWith({ entitlement: 'active', expiresAt: 4102444800000, autoRenewing: true });
    expect(r.entitlement).toBe('expired');
    expect(r.autoRenewing).toBe(false);
    expect(r.lastVerifiedAt).toBeNull();
  });

  it("keeps the phone's own Pro state", () => {
    const db = makeTestDb();
    db.insert(proState).values({ id: 'pro', trialStartedAt: 1, trialEndsAt: 2, entitlement: 'none', expiresAt: null, productId: null, autoRenewing: null, lastVerifiedAt: null }).run();
    const t = snapshotTables(makeTestDb());
    t.proState = [{ id: 'pro', trialStartedAt: NOW, trialEndsAt: NOW + DAY, entitlement: 'active', expiresAt: null, productId: null, autoRenewing: true, lastVerifiedAt: NOW }];
    replaceAllData(db, t, NOW);
    expect(db.select().from(proState).get()!.trialStartedAt).toBe(1);
  });
});
