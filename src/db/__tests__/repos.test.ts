import { applyRegionToCategories, createCategory, deleteCategory, listCategories, seedCategories, updateCategory } from '../categoriesRepo';
import {
  categorise,
  createEntry,
  deleteEntries,
  getEntry,
  listEntries,
  listReceipts,
  mergeEntries,
  orphanedFiles,
  restoreSnapshot,
  sortHistory,
  splitEntry,
  topNotes,
  totalsFor,
  unsortedCount,
  unsortedWeeks,
  updateEntry,
} from '../entriesRepo';
import { getSettings, updateSettings } from '../settingsRepo';
import { makeTestDb } from '../testing/testDb';
import {
  addManualTrip,
  appendPoints,
  endTrip,
  getActiveTrip,
  mileageTotals,
  pauseTrip,
  resumeTrip,
  startTrip,
  updateTrip,
} from '../tripsRepo';
import { taxYearFor } from '@/domain/taxYear';
import { weekOf } from '@/domain/week';
import type { AppDb } from '../types';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
let db: AppDb;
const cat = (name: string) => listCategories(db, { includeHidden: true }).find((c) => c.name === name)!.id;

beforeEach(() => {
  db = makeTestDb();
  seedCategories(db, 'UK');
});

describe('settings', () => {
  it('returns defaults and persists patches', () => {
    expect(getSettings(db)).toMatchObject({ region: null, onboarded: false, defaultScope: 'work' });
    updateSettings(db, { region: 'UK', reminder: { on: true, weekday: 0, hour: 18, minute: 0 } });
    expect(getSettings(db)).toMatchObject({ region: 'UK', reminder: { on: true } });
  });
});

describe('categories', () => {
  it('seeds once with 3 income + 9 expense', () => {
    seedCategories(db, 'UK');
    expect(listCategories(db, { type: 'income' })).toHaveLength(3);
    expect(listCategories(db, { type: 'expense' })).toHaveLength(9);
  });
  it('validates names, hides, and only deletes unused', () => {
    expect(createCategory(db, { type: 'expense', name: ' fuel ', icon: 'x', color: '#000', taxLine: 'x' })).toEqual({ ok: false, error: 'duplicate_name' });
    expect(createCategory(db, { type: 'expense', name: '  ', icon: 'x', color: '#000', taxLine: 'x' })).toEqual({ ok: false, error: 'empty_name' });
    const made = createCategory(db, { type: 'expense', name: 'Meals', icon: 'x', color: '#000', taxLine: 'x' });
    expect(made.ok).toBe(true);
    const fuel = cat('Fuel');
    const e = createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP' });
    categorise(db, e.id, fuel);
    expect(deleteCategory(db, fuel)).toEqual({ ok: false, error: 'in_use' });
    updateCategory(db, fuel, { hidden: true });
    expect(listCategories(db).some((c) => c.id === fuel)).toBe(false);
    if (made.ok) expect(deleteCategory(db, made.id)).toEqual({ ok: true });
  });
  it('switches region names/tax lines but keeps user renames', () => {
    updateCategory(db, cat('Phone & data'), { name: 'My phone' });
    applyRegionToCategories(db, 'UK', 'US');
    const all = listCategories(db, { includeHidden: true });
    expect(all.find((c) => c.key === 'repairs')).toMatchObject({ name: 'Vehicle repairs', taxLine: 'Schedule C: Line 21 Repairs and maintenance' });
    expect(all.find((c) => c.key === 'phone')).toMatchObject({ name: 'My phone', taxLine: 'Schedule C: Line 25 Utilities' });
  });
});

describe('entries', () => {
  it('captures unsorted, sorts, and counts by week', () => {
    const e = createEntry(db, { type: 'expense', amountMinor: 7240, currency: 'GBP', note: ' Shell M62 ', occurredAt: at(2026, 11, 9) });
    createEntry(db, { type: 'expense', amountMinor: 420, currency: 'GBP', note: 'Greggs', occurredAt: at(2026, 11, 2), scope: 'personal' });
    expect(e.note).toBe('Shell M62');
    expect(e.categoryId).toBeNull();
    expect(unsortedCount(db)).toBe(2);
    expect(unsortedWeeks(db).map((w) => w.count)).toEqual([1, 1]);
    categorise(db, e.id, cat('Fuel'), 'work');
    expect(getEntry(db, e.id)?.sortedAt).not.toBeNull();
    expect(unsortedCount(db, weekOf(at(2026, 11, 9)))).toBe(0);
    expect(sortHistory(db)).toEqual([{ type: 'expense', note: 'Shell M62', amountMinor: 7240, categoryId: cat('Fuel'), scope: 'work' }]);
  });

  it('rejects non-positive amounts', () => {
    expect(() => createEntry(db, { type: 'expense', amountMinor: 0, currency: 'GBP' })).toThrow();
  });

  it('clears the category when the type flips', () => {
    const e = createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP', categoryId: cat('Fuel') });
    updateEntry(db, e.id, { type: 'income' });
    expect(getEntry(db, e.id)).toMatchObject({ type: 'income', categoryId: null, sortedAt: null });
  });

  it('filters and searches by note or amount', () => {
    createEntry(db, { type: 'expense', amountMinor: 7240, currency: 'GBP', note: 'Shell M62', receiptPaths: ['a.jpg'] });
    createEntry(db, { type: 'income', amountMinor: 62000, currency: 'GBP', note: 'DPD payout' });
    createEntry(db, { type: 'expense', amountMinor: 350, currency: 'GBP', note: '50%_off' });
    expect(listEntries(db, { search: 'shell' })).toHaveLength(1);
    expect(listEntries(db, { search: '620' })).toHaveLength(1);
    expect(listEntries(db, { search: '%' })).toHaveLength(1);
    expect(listEntries(db, { type: 'income' })).toHaveLength(1);
    const withR = listEntries(db, { withReceipt: true });
    expect(withR).toHaveLength(1);
    expect(withR[0].receiptCount).toBe(1);
    expect(topNotes(db, 'expense')).toHaveLength(2);
  });

  it('delete + undo restores entry and receipts; reports orphaned files', () => {
    const e = createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP', receiptPaths: ['r1.jpg'] });
    const { snapshot, orphaned } = deleteEntries(db, [e.id]);
    expect(orphaned).toEqual(['r1.jpg']);
    expect(getEntry(db, e.id)).toBeUndefined();
    restoreSnapshot(db, snapshot);
    expect(getEntry(db, e.id)).toBeDefined();
    expect(listReceipts(db, e.id)).toHaveLength(1);
  });

  it('merges same-type entries with undo', () => {
    const a = createEntry(db, { type: 'expense', amountMinor: 350, currency: 'GBP', note: 'RingGo', occurredAt: 2, receiptPaths: ['p.jpg'] });
    const b = createEntry(db, { type: 'expense', amountMinor: 1240, currency: 'GBP', note: 'NCP', occurredAt: 1 });
    const inc = createEntry(db, { type: 'income', amountMinor: 1, currency: 'GBP' });
    expect(mergeEntries(db, [a.id, inc.id])).toEqual({ ok: false, reason: 'mixed_types' });
    const r = mergeEntries(db, [a.id, b.id]);
    if (!r.ok) throw new Error('merge failed');
    expect(getEntry(db, r.id)).toMatchObject({ amountMinor: 1590, note: 'NCP · RingGo', occurredAt: 1 });
    expect(listReceipts(db, r.id)).toHaveLength(1);
    expect(getEntry(db, a.id)).toBeUndefined();
    restoreSnapshot(db, r.snapshot);
    expect(getEntry(db, r.id)).toBeUndefined();
    expect(getEntry(db, a.id)).toBeDefined();
    expect(listReceipts(db, a.id)).toHaveLength(1);
  });

  it('splits into parts sharing the receipt, with undo', () => {
    const e = createEntry(db, { type: 'expense', amountMinor: 6000, currency: 'GBP', note: 'Tesco', receiptPaths: ['t.jpg'] });
    expect(splitEntry(db, e.id, [{ amountMinor: 5000, categoryId: null, scope: 'work', note: 'x' }, { amountMinor: 500, categoryId: null, scope: 'work', note: 'y' }])).toEqual({ ok: false, reason: 'invalid' });
    const r = splitEntry(db, e.id, [
      { amountMinor: 4500, categoryId: cat('Fuel'), scope: 'work', note: 'Tesco' },
      { amountMinor: 1500, categoryId: null, scope: 'personal', note: 'Tesco groceries' },
    ]);
    if (!r.ok) throw new Error('split failed');
    const parts = r.ids.map((id) => getEntry(db, id)!);
    expect(parts.map((p) => p.amountMinor)).toEqual([4500, 1500]);
    expect(parts.every((p) => p.splitFromMinor === 6000 && p.splitGroupId === parts[0].splitGroupId)).toBe(true);
    expect(r.ids.every((id) => listReceipts(db, id).length === 1)).toBe(true);
    // Deleting one part keeps the shared file in use.
    expect(deleteEntries(db, [r.ids[0]]).orphaned).toEqual([]);
    expect(orphanedFiles(db, ['t.jpg'])).toEqual([]);
    restoreSnapshot(db, r.snapshot);
    expect(getEntry(db, e.id)?.amountMinor).toBe(6000);
  });

  it('totals work entries for a period', () => {
    createEntry(db, { type: 'income', amountMinor: 62000, currency: 'GBP', occurredAt: at(2026, 11, 10) });
    createEntry(db, { type: 'expense', amountMinor: 7240, currency: 'GBP', occurredAt: at(2026, 11, 9) });
    createEntry(db, { type: 'expense', amountMinor: 420, currency: 'GBP', occurredAt: at(2026, 11, 9), scope: 'personal' });
    expect(totalsFor(db, weekOf(at(2026, 11, 9)))).toEqual({ incomeMinor: 62000, expenseMinor: 7240, netMinor: 54760 });
    expect(totalsFor(db, weekOf(at(2026, 11, 9)), 'all').expenseMinor).toBe(7660);
  });
});

describe('trips', () => {
  const pt = (i: number) => ({ ts: 1000 + i * 10_000, lat: 53.8 + i * 0.001, lng: -1.55, accuracy: 10 });

  it('records GPS points, ignores paused points, splits segments on resume', () => {
    const t = startTrip(db, 'work', 1000);
    expect(startTrip(db).id).toBe(t.id); // only one active trip
    appendPoints(db, t.id, [pt(0), pt(1), pt(2)]);
    const twoSegs = getActiveTrip(db)!.distanceM;
    expect(twoSegs).toBeGreaterThan(220);
    pauseTrip(db, t.id);
    appendPoints(db, t.id, [pt(10)]); // dropped
    resumeTrip(db, t.id, 300_000);
    appendPoints(db, t.id, [{ ...pt(30), ts: 310_000 }, { ...pt(31), ts: 320_000 }]);
    const done = endTrip(db, t.id, 400_000)!;
    expect(done.status).toBe('done');
    // 2 segments before pause + 1 after; the jump from pt(2) to pt(30) is not counted.
    expect(done.distanceM).toBeGreaterThan(330);
    expect(done.distanceM).toBeLessThan(336);
    expect(getActiveTrip(db)).toBeUndefined();
  });

  it('drops fixes taken while the phone stands still (indoors / red light)', () => {
    const t = startTrip(db, 'work', 1000);
    appendPoints(db, t.id, [pt(0)]);
    // 2 minutes of jitter up to ~40 m around pt(0), OS speed ≈ 0.
    const jitter = Array.from({ length: 24 }, (_, i) => ({
      ts: 6000 + i * 5000,
      lat: 53.8 + ((i % 2 ? 1 : -1) * 0.00035),
      lng: -1.55 + ((i % 3) - 1) * 0.0005,
      accuracy: 25,
      speed: 0.4,
    }));
    appendPoints(db, t.id, jitter);
    expect(getActiveTrip(db)!.distanceM).toBe(0);
    // Driving away again (speed reported) counts from the last stored fix.
    appendPoints(db, t.id, [{ ...pt(1), ts: 200_000, speed: 9 }, { ...pt(2), ts: 210_000, speed: 9 }]);
    const d = endTrip(db, t.id, 300_000)!.distanceM;
    expect(d).toBeGreaterThan(220);
    expect(d).toBeLessThan(224);
  });

  it('adds manual trips and totals miles per scope in the tax year', () => {
    addManualTrip(db, { date: at(2026, 11, 10), scope: 'work', purpose: 'DLS4', odoStart: 41200, odoEnd: 41328 });
    const p = addManualTrip(db, { date: at(2026, 11, 11), scope: 'personal', purpose: '', miles: 12 });
    addManualTrip(db, { date: at(2026, 4, 5), scope: 'work', purpose: 'last year', miles: 99 });
    expect(() => addManualTrip(db, { date: 0, scope: 'work', purpose: '', odoStart: 5, odoEnd: 5 })).toThrow();
    const m = mileageTotals(db, taxYearFor(2026, 'UK'));
    expect(m.work).toBeCloseTo(128, 3);
    expect(m.personal).toBeCloseTo(12, 3);
    updateTrip(db, p.id, { scope: 'work' });
    expect(mileageTotals(db, taxYearFor(2026, 'UK')).work).toBeCloseTo(140, 3);
  });
});
