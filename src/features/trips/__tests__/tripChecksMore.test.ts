import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, getTrip, updateManualTrip } from '@/db/tripsRepo';
import { mileageCsv, tripSourceLabel } from '@/domain/csv';
import { referencedPhotos, replaceAllData, snapshotTables, wipeAllData } from '@/features/backup/dataStore';
import { packBackup, unpackBackup, type BackupTables } from '@/features/backup/pack';
import { pickHomeAlert } from '@/features/home/alerts';

import { interleaveMonth } from '../check/listRows';
import { nextOdometerReminder } from '../check/odometer';
import { addReading, answerGap } from '../check/repo';

const MIN = 60_000;
const HOUR = 60 * MIN;
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('odometer reminder', () => {
  it('09:00 on the period start, today if still ahead', () => {
    expect(new Date(nextOdometerReminder('monthly', 'US', at(2026, 12, 1, 8))!)).toEqual(new Date(2026, 11, 1, 9));
    expect(new Date(nextOdometerReminder('monthly', 'US', at(2026, 12, 1, 10))!)).toEqual(new Date(2027, 0, 1, 9));
    expect(new Date(nextOdometerReminder('weekly', 'UK', at(2026, 11, 18))!)).toEqual(new Date(2026, 10, 23, 9));
    // UK: 6 April comes before 1 May.
    expect(new Date(nextOdometerReminder('monthly', 'UK', at(2027, 4, 2))!)).toEqual(new Date(2027, 3, 6, 9));
    expect(nextOdometerReminder('off', 'UK', at(2027, 4, 2))).toBeNull();
  });
});

describe('Miles month list', () => {
  const trip = (id: string, startedAt: number) => ({ id, startedAt });
  const odo = (id: string, readAt: number) => ({ reading: { id, readAt } });
  const month = '2026-10'; // November 2026 (0-based month in the key)

  it('puts a Missing trip under the later trip and readings by time', () => {
    const rows = [trip('c', at(2026, 11, 14)), trip('b', at(2026, 11, 10)), trip('a', at(2026, 11, 5))];
    const items = interleaveMonth(month, rows, true, [{ key: 'a>b', nextId: 'b' }], [odo('r1', at(2026, 11, 12)), odo('r0', at(2026, 11, 1)), odo('rOct', at(2026, 10, 30))]);
    expect(items.map((i) => i.key)).toEqual(['c', 'odo-r1', 'b', 'gap-a>b', 'a', 'odo-r0']);
  });

  it('keeps readings older than the last shown trip for the next step of the list', () => {
    const rows = [trip('c', at(2026, 11, 14))];
    const items = interleaveMonth(month, rows, false, [], [odo('r0', at(2026, 11, 1))]);
    expect(items.map((i) => i.key)).toEqual(['c']);
  });
});

describe('estimated (gap) trips', () => {
  it('keep their span, stay Unsorted, export as source gap', () => {
    const db = makeTestDb();
    const from = at(2026, 11, 10, 11);
    const row = addManualTrip(db, { date: from, endedAt: from + HOUR, scope: 'unsorted', purpose: '', miles: 6.2, source: 'gap' });
    expect(row).toMatchObject({ source: 'gap', scope: 'unsorted', endedAt: from + HOUR });
    updateManualTrip(db, row.id, { date: from + 24 * HOUR, endedAt: from + 25 * HOUR, scope: 'work', purpose: 'Depot', miles: 7 });
    expect(getTrip(db, row.id)).toMatchObject({ source: 'gap', scope: 'work', startedAt: from + 24 * HOUR, endedAt: from + 25 * HOUR });
    expect(tripSourceLabel({ source: 'gap', startedBy: null })).toBe('gap');
    expect(mileageCsv([{ startedAt: from, miles: 6.2, scope: 'unsorted', purpose: '', source: 'gap', odoStart: null, odoEnd: null }])).toContain(',gap,');
  });
});

describe('Home card order', () => {
  it('Missing trips and odometer cards sit after "no trips", before backups', () => {
    expect(pickHomeAlert({ missingTrips: true, odometer: true, backupFailing: true }, {}, 0)).toBe('missingTrips');
    expect(pickHomeAlert({ odometer: true, odometerDue: true, backupFailing: true }, {}, 0)).toBe('odometer');
    expect(pickHomeAlert({ noTrips: true, missingTrips: true }, {}, 0)).toBe('noTrips');
    expect(pickHomeAlert({ odometerDue: true, proRenews: true }, {}, 0)).toBe('odometerDue');
  });
});

describe('backup', () => {
  async function roundTrip(tables: BackupTables, photos: Record<string, Uint8Array>) {
    const chunks: Uint8Array[] = [];
    await packBackup(
      tables,
      referencedPhotos(tables).map((name) => ({ name, read: () => photos[name] ?? null })),
      { createdAt: at(2026, 11, 16), appVersion: '2.0.0', onChunk: (c) => chunks.push(c), onProgress: () => {} },
    );
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of chunks) {
      bytes.set(c, o);
      o += c.length;
    }
    return unpackBackup(bytes);
  }

  it('carries "Not a trip" answers, odometer readings and their photos', async () => {
    const src = makeTestDb();
    answerGap(src, 'p1', 'n1', 'dismissed', 5);
    addReading(src, { value: 48_210, unit: 'mi', readAt: at(2026, 11, 1), photoPath: 'odo1.jpg' });
    addReading(src, { value: 48_730, unit: 'mi', readAt: at(2026, 11, 16) });
    const tables = snapshotTables(src);
    expect(referencedPhotos(tables)).toEqual(['odo1.jpg']);
    const res = await roundTrip(tables, { 'odo1.jpg': new Uint8Array([0xff, 0xd8, 1, 0xff, 0xd9]) });
    if (!res.ok) throw new Error(res.error);
    expect([...res.photos.keys()]).toEqual(['odo1.jpg']);
    const dst = makeTestDb();
    replaceAllData(dst, res.manifest.tables);
    const back = snapshotTables(dst);
    expect(back.tripGapDismissals).toEqual(tables.tripGapDismissals);
    expect(back.odometerReadings).toEqual(tables.odometerReadings);
    wipeAllData(dst);
    expect(snapshotTables(dst).odometerReadings).toEqual([]);
  });

  it('older files without the tables restore with none', async () => {
    const src = makeTestDb();
    const t = snapshotTables(src) as Partial<BackupTables>;
    delete t.tripGapDismissals;
    delete t.odometerReadings;
    const res = await roundTrip(t as BackupTables, {});
    if (!res.ok) throw new Error(res.error);
    expect(res.manifest.tables.odometerReadings).toEqual([]);
    expect(res.manifest.tables.tripGapDismissals).toEqual([]);
  });
});
