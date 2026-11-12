import { seedCategories } from '../categoriesRepo';
import { createEntry, getEntry, listEntries, listEntriesPage } from '../entriesRepo';
import { makeTestDb } from '../testing/testDb';
import type { AppDb } from '../types';

const at = (d: number, h: number) => new Date(2026, 10, d, h).getTime();
let db: AppDb;

beforeEach(() => {
  db = makeTestDb();
  seedCategories(db, 'UK');
});

const add = (d: number, h: number, extra: Partial<Parameters<typeof createEntry>[1]> = {}) =>
  createEntry(db, { type: 'expense', amountMinor: 100 * d + h, currency: 'GBP', occurredAt: at(d, h), ...extra });

describe('listEntries (raw rows)', () => {
  it('returns the same fields as the entry row plus receiptCount', () => {
    const e = add(3, 9, { note: 'Shell', scope: 'personal', receiptPaths: ['a.jpg', 'b.jpg'] });
    const [row] = listEntries(db);
    expect(row).toEqual({ ...getEntry(db, e.id), receiptCount: 2 });
  });

  it('orders newest first by default, oldest first on request, and filters', () => {
    add(1, 8);
    add(2, 8, { scope: 'personal' });
    add(3, 8, { type: 'income' });
    expect(listEntries(db).map((r) => r.occurredAt)).toEqual([at(3, 8), at(2, 8), at(1, 8)]);
    expect(listEntries(db, { oldestFirst: true }).map((r) => r.occurredAt)).toEqual([at(1, 8), at(2, 8), at(3, 8)]);
    expect(listEntries(db, { scope: 'personal' })).toHaveLength(1);
    expect(listEntries(db, { type: 'income', period: { start: at(3, 0), end: at(4, 0) } })).toHaveLength(1);
    expect(listEntries(db, { limit: 2 })).toHaveLength(2);
  });
});

describe('listEntriesPage', () => {
  it('extends a page so its last day is complete', () => {
    add(1, 8);
    add(2, 8);
    add(2, 12);
    add(2, 18);
    add(3, 8);
    // 2 newest = day 3 + day 2 18:00 → extended to all of day 2.
    const p = listEntriesPage(db, {}, 2);
    expect(p.more).toBe(true);
    expect(p.rows.map((r) => r.occurredAt)).toEqual([at(3, 8), at(2, 18), at(2, 12), at(2, 8)]);
    // Oldest first: day 1 + day 2 08:00 → all of day 2.
    const q = listEntriesPage(db, { oldestFirst: true }, 2);
    expect(q.rows.map((r) => r.occurredAt)).toEqual([at(1, 8), at(2, 8), at(2, 12), at(2, 18)]);
  });

  it('reports no more when the page is not full', () => {
    add(1, 8);
    expect(listEntriesPage(db, {}, 5)).toMatchObject({ more: false });
  });
});
