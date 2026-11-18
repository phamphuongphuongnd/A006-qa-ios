import { strToU8, zipSync } from 'fflate';

import { seedCategories } from '@/db/categoriesRepo';
import { createEntry } from '@/db/entriesRepo';
import { makeTestDb } from '@/db/testing/testDb';

import { snapshotTables } from '../dataStore';
import { BACKUP_FORMAT, BACKUP_VERSION, MANIFEST_NAME, packBackup } from '../pack';
import { bytesSource, readBackupStream, type PhotoSink } from '../streamRestore';

const photo = (n: number, fill: number) => new Uint8Array(n).fill(fill);

async function makeBackup(photos: Record<string, Uint8Array>) {
  const db = makeTestDb();
  seedCategories(db, 'UK');
  createEntry(db, { type: 'expense', amountMinor: 1250, currency: 'GBP', note: 'Shell', receiptPaths: Object.keys(photos) });
  const tables = snapshotTables(db);
  const chunks: Uint8Array[] = [];
  await packBackup(
    tables,
    Object.entries(photos).map(([name, b]) => ({ name, read: () => b })),
    { createdAt: 1_700_000_000_000, appVersion: 'qa', onChunk: (c) => chunks.push(c) },
  );
  const out = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return { bytes: out, tables };
}

function memorySink() {
  const files = new Map<string, number[]>();
  const sink: PhotoSink = {
    open: (name) => {
      const buf: number[] = [];
      files.set(name, buf);
      return { write: (c) => buf.push(...c), close: () => {} };
    },
  };
  return { sink, files };
}

describe('QA-100 B-87: streamed restore', () => {
  it('reads manifest + photos chunk by chunk, photos go to the sink', async () => {
    const { bytes, tables } = await makeBackup({ 'a1.jpg': photo(300_000, 7), 'b2.jpg': photo(5, 9) });
    const { sink, files } = memorySink();
    const r = await readBackupStream(bytesSource(bytes, 64 * 1024), sink);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.photos).toBe(2);
    expect(r.manifest.tables.entries).toEqual(tables.entries);
    expect(files.get('a1.jpg')).toHaveLength(300_000);
    expect(files.get('a1.jpg')!.every((x) => x === 7)).toBe(true);
    expect(files.get('b2.jpg')).toEqual([9, 9, 9, 9, 9]);
  });

  it('preview reads only the manifest', async () => {
    const { bytes } = await makeBackup({ 'a1.jpg': photo(1000, 1) });
    const r = await readBackupStream(bytesSource(bytes, 300), null);
    expect(r.ok && r.manifest.counts.photos).toBe(1);
  });

  it('refuses non-zips, truncated files, oversized photos and missing photos', async () => {
    expect(await readBackupStream(bytesSource(strToU8('hello')), null)).toEqual({ ok: false, error: 'not_backup' });
    expect(await readBackupStream(bytesSource(new Uint8Array(0)), null)).toEqual({ ok: false, error: 'not_backup' });

    const { bytes } = await makeBackup({ 'a1.jpg': photo(1000, 1) });
    // Cut inside backup.json (the last entry). Losing only the ZIP's central directory is fine: the data is all there.
    const cut = await readBackupStream(bytesSource(bytes.subarray(0, bytes.length - 400)), memorySink().sink);
    expect(cut.ok).toBe(false);

    const t = snapshotTables(makeTestDb());
    const manifest = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: 1, appVersion: 'qa', counts: { entries: 0, trips: 0, photos: 2, categories: t.categories.length }, tables: t };
    const bomb = zipSync({ [MANIFEST_NAME]: strToU8(JSON.stringify(manifest)), 'receipts/big.jpg': new Uint8Array(30 * 1024 * 1024) }, { level: 9 });
    expect(await readBackupStream(bytesSource(bomb), memorySink().sink)).toEqual({ ok: false, error: 'damaged' });

    const short = zipSync({ [MANIFEST_NAME]: strToU8(JSON.stringify(manifest)), 'receipts/one.jpg': photo(10, 1) });
    expect(await readBackupStream(bytesSource(short), memorySink().sink)).toEqual({ ok: false, error: 'damaged' });

    const evil = zipSync({ [MANIFEST_NAME]: strToU8(JSON.stringify({ ...manifest, counts: { ...manifest.counts, photos: 1 } })), 'receipts/../x.jpg': photo(10, 1) });
    expect(await readBackupStream(bytesSource(evil), memorySink().sink)).toEqual({ ok: false, error: 'damaged' });
  });

  it('REG-1: a manifest that inflates past 64 MB stops early with "damaged"', async () => {
    const bomb = zipSync({ [MANIFEST_NAME]: new Uint8Array(70 * 1024 * 1024).fill(32) }, { level: 9 });
    const before = process.memoryUsage().heapUsed;
    expect(await readBackupStream(bytesSource(bomb, 1024 * 1024), null)).toEqual({ ok: false, error: 'damaged' });
    // Refused from the declared size: nothing near 70 MB was held.
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(40 * 1024 * 1024);
  });
});
