import { listCategories, seedCategories } from '@/db/categoriesRepo';
import { categorise, createEntry, getEntry } from '@/db/entriesRepo';
import { startTrial } from '@/db/proRepo';
import { tripPoints, trips } from '@/db/schema';
import { makeTestDb } from '@/db/testing/testDb';
import type { AppDb } from '@/db/types';
import { DAY_MS } from '@/domain/pro';
import { weekOf } from '@/domain/week';
import { categoryUsage90, mergeCandidates, openTrips, sortedQueueTrips, sortHistoryV2, sortTrip, sortWeeks, undoSortTrip } from '@/features/entries/sortRepo';

import { applyRulesOnSave, undoAutoSort } from '../applyOnSave';
import { knownRouteScope, recordKnownRoute } from '../knownRoutes';
import {
  acceptOffer,
  autoCounts,
  autoSortedIn,
  createRule,
  declineOffer,
  deleteRule,
  findSameRule,
  getRule,
  listRules,
  markAutoReviewed,
  restoreRule,
  restoreRuleEntries,
  ruleOfferAfterSort,
  setRuleEnabled,
  unreviewedAutoCount,
  unsortRuleEntries,
} from '../repo';

const NOW = new Date(2026, 10, 12, 12, 0).getTime(); // Thu 12 Nov 2026

function setup(pro = true) {
  const db = makeTestDb();
  seedCategories(db, 'UK');
  if (pro) startTrial(db, NOW - DAY_MS);
  const cat = (key: string) => listCategories(db).find((c) => c.key === key)!;
  return { db, cat };
}

const add = (db: AppDb, note: string, amountMinor = 5000, extra: Partial<Parameters<typeof createEntry>[1]> = {}, at = NOW - 3600_000) =>
  createEntry(db, { type: 'expense', amountMinor, currency: 'GBP', note, occurredAt: at, ...extra }, at);

describe('applyRulesOnSave', () => {
  it('sorts a matching new entry, marks it Auto and counts the hit', () => {
    const { db, cat } = setup();
    const rule = createRule(db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('fuel').id, scope: 'work' }, NOW);
    const e = add(db, 'Shell M62');
    const res = applyRulesOnSave(db, e.id, NOW);
    expect(res).toMatchObject({ ruleId: rule.id, categoryId: cat('fuel').id, categoryName: 'Fuel', scope: 'work' });
    const after = getEntry(db, e.id)!;
    expect(after.categoryId).toBe(cat('fuel').id);
    expect(after.ruleId).toBe(rule.id);
    expect(after.sortedAt).toBe(NOW);
    expect(getRule(db, rule.id)!.hits).toBe(1);
    // Undo puts it back in the queue and takes the hit back.
    undoAutoSort(db, e.id, res!.previousScope, NOW);
    expect(getEntry(db, e.id)).toMatchObject({ categoryId: null, ruleId: null, sortedAt: null });
    expect(getRule(db, rule.id)!.hits).toBe(0);
  });

  it('uses the receipt merchant from OCR', () => {
    const { db, cat } = setup();
    createRule(db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('fuel').id, scope: 'work' }, NOW);
    const e = add(db, '', 5000, { ocrMerchant: 'SHELL UK OIL PRODUCTS LTD' });
    expect(applyRulesOnSave(db, e.id, NOW)?.categoryName).toBe('Fuel');
  });

  it('does nothing without Pro, for disabled rules, sorted entries or no match', () => {
    const free = setup(false);
    createRule(free.db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: free.cat('fuel').id, scope: 'work' }, NOW);
    expect(applyRulesOnSave(free.db, add(free.db, 'Shell').id, NOW)).toBeNull();

    const { db, cat } = setup();
    const r = createRule(db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('fuel').id, scope: 'work' }, NOW);
    expect(applyRulesOnSave(db, add(db, 'Tesco').id, NOW)).toBeNull();
    const sorted = add(db, 'Shell', 5000, { categoryId: cat('repairs').id });
    expect(applyRulesOnSave(db, sorted.id, NOW)).toBeNull();
    expect(getEntry(db, sorted.id)!.categoryId).toBe(cat('repairs').id);
    setRuleEnabled(db, r.id, false);
    expect(applyRulesOnSave(db, add(db, 'Shell').id, NOW)).toBeNull();
  });

  it('keeps an entry marked Personal at capture Personal', () => {
    const { db, cat } = setup();
    createRule(db, { matchText: 'Greggs', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('other_expense').id, scope: 'work' }, NOW);
    const e = add(db, 'Greggs', 420, { scope: 'personal' });
    expect(applyRulesOnSave(db, e.id, NOW)?.scope).toBe('personal');
  });

  it('stops applying when Pro ends, but the rules and sorted entries stay', () => {
    const { db, cat } = setup();
    const r = createRule(db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('fuel').id, scope: 'work' }, NOW);
    const e1 = add(db, 'Shell');
    applyRulesOnSave(db, e1.id, NOW);
    const later = NOW + 10 * DAY_MS; // trial over
    const e2 = add(db, 'Shell', 5000, {}, later);
    expect(applyRulesOnSave(db, e2.id, later)).toBeNull();
    expect(getRule(db, r.id)).toBeTruthy();
    expect(getEntry(db, e1.id)!.categoryId).toBe(cat('fuel').id);
  });
});

describe('rules list', () => {
  it('lists rules with category name and entry count; delete keeps the entries sorted', () => {
    const { db, cat } = setup();
    const r = createRule(db, { matchText: ' Shell  ', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('fuel').id, scope: 'work' }, NOW);
    applyRulesOnSave(db, add(db, 'Shell a').id, NOW);
    applyRulesOnSave(db, add(db, 'Shell b').id, NOW);
    const [item] = listRules(db);
    expect(item).toMatchObject({ matchText: 'Shell', categoryName: 'Fuel', entryCount: 2, enabled: true });
    expect(findSameRule(db, 'SHELL', 'expense')?.id).toBe(r.id);
    expect(findSameRule(db, 'SHELL', 'income')).toBeNull();
    const row = deleteRule(db, r.id)!;
    expect(listRules(db)).toHaveLength(0);
    expect(autoCounts(db, weekOf(NOW)).auto).toBe(2);
    restoreRule(db, row);
    expect(listRules(db)).toHaveLength(1);
  });
});

describe('rule offers', () => {
  it('offers after the 3rd same-place sort in a row, once', () => {
    const { db, cat } = setup();
    const income = (note: string, at: number) => createEntry(db, { type: 'income', amountMinor: 62000, currency: 'GBP', note, occurredAt: at }, at).id;
    const ids = [income('DPD weekly payout', NOW - 3 * DAY_MS), income('DPD payout', NOW - 2 * DAY_MS), income('DPD weekly', NOW - DAY_MS)];
    categorise(db, ids[0], cat('delivery_income').id, 'work', NOW - 30);
    categorise(db, ids[1], cat('delivery_income').id, 'work', NOW - 20);
    expect(ruleOfferAfterSort(db, ids[1], NOW)).toBeNull();
    categorise(db, ids[2], cat('delivery_income').id, 'work', NOW - 10);
    const offer = ruleOfferAfterSort(db, ids[2], NOW);
    expect(offer).toMatchObject({ key: 'dpd', matchText: 'DPD', categoryName: 'Delivery income', type: 'income' });
    acceptOffer(db, offer!, NOW);
    expect(ruleOfferAfterSort(db, ids[2], NOW)).toBeNull(); // a rule covers it now
  });

  it('"Not now" silences the place for 30 days; free users are never asked', () => {
    const { db, cat } = setup();
    const ids = [1, 2, 3].map((i) => add(db, `RingGo Leeds ${i}`, 350, {}, NOW - i * DAY_MS).id);
    ids.forEach((id, i) => categorise(db, id, cat('parking').id, 'work', NOW - 100 + i));
    expect(ruleOfferAfterSort(db, ids[2], NOW)).toMatchObject({ matchText: 'RingGo Leeds' });
    declineOffer(db, 'ringgo', NOW);
    expect(ruleOfferAfterSort(db, ids[2], NOW + DAY_MS)).toBeNull();

    const free = setup(false);
    const fids = [1, 2, 3].map((i) => add(free.db, 'RingGo', 350, {}, NOW - i * DAY_MS).id);
    fids.forEach((id, i) => categorise(free.db, id, free.cat('parking').id, 'work', NOW - 100 + i));
    expect(ruleOfferAfterSort(free.db, fids[2], NOW)).toBeNull();
  });

  it('does not offer when the newest sort of the place went elsewhere', () => {
    const { db, cat } = setup();
    const ids = [1, 2, 3, 4].map((i) => add(db, 'Tesco', 1000, {}, NOW - i * DAY_MS).id);
    ids.slice(0, 3).forEach((id, i) => categorise(db, id, cat('fuel').id, 'work', NOW - 100 + i));
    categorise(db, ids[3], cat('other_expense').id, 'personal', NOW - 50);
    expect(ruleOfferAfterSort(db, ids[3], NOW)).toBeNull();
  });
});

describe('auto-sorted review', () => {
  it('lists, marks reviewed, undoes all from a rule and restores', () => {
    const { db, cat } = setup();
    const week = weekOf(NOW);
    const r = createRule(db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: cat('fuel').id, scope: 'work' }, NOW);
    const a = add(db, 'Shell M62');
    const b = add(db, 'Shell Leeds');
    applyRulesOnSave(db, a.id, NOW);
    applyRulesOnSave(db, b.id, NOW);
    expect(autoSortedIn(db, week).map((e) => e.id)).toEqual([a.id, b.id]);
    expect(unreviewedAutoCount(db, week)).toBe(2);
    expect(markAutoReviewed(db, week, NOW)).toBe(2);
    expect(unreviewedAutoCount(db, week)).toBe(0);
    const undo = unsortRuleEntries(db, r.id, week, NOW);
    expect(getEntry(db, a.id)).toMatchObject({ categoryId: null, ruleId: null });
    expect(getRule(db, r.id)!.hits).toBe(0);
    restoreRuleEntries(db, undo, NOW);
    expect(getEntry(db, a.id)).toMatchObject({ categoryId: cat('fuel').id, ruleId: r.id });
    expect(getRule(db, r.id)!.hits).toBe(2);
  });
});

describe('sort queue data', () => {
  function addTrip(db: AppDb, id: string, at: number, scope: 'unsorted' | 'work', pts: [number, number][]) {
    db.insert(trips)
      .values({ id, source: 'gps', status: 'done', startedAt: at, endedAt: at + 3600_000, distanceM: 5000, scope, startedBy: 'auto' })
      .run();
    pts.forEach(([lat, lng], i) => db.insert(tripPoints).values({ tripId: id, ts: at + i * 60_000, lat, lng, accuracy: 10 }).run());
  }

  it('counts unsorted trips in the weeks, sorts them and learns the route', () => {
    const { db } = setup();
    const week = weekOf(NOW);
    add(db, 'Shell');
    const route: [number, number][] = [
      [53.7997, -1.5492],
      [53.74, -1.52],
      [53.6833, -1.4977],
    ];
    addTrip(db, 't1', NOW - 7200_000, 'unsorted', route);
    addTrip(db, 'done', NOW - 9000_000, 'work', route);
    expect(sortWeeks(db)).toEqual([{ week, count: 2 }]);
    expect(openTrips(db, week).map((t) => t.id)).toEqual(['t1']);
    const u = sortTrip(db, 't1', 'work', NOW)!;
    expect(openTrips(db, week)).toHaveLength(0);
    expect(sortedQueueTrips(db, week)).toBe(1);
    expect(knownRouteScope(db, { lat: 53.7997, lng: -1.5492 }, { lat: 53.6833, lng: -1.4977 })).toBeNull(); // 1 vote
    recordKnownRoute(db, 'done', 'work', NOW);
    recordKnownRoute(db, 'done', 'work', NOW);
    expect(knownRouteScope(db, { lat: 53.6833, lng: -1.4977 }, { lat: 53.7997, lng: -1.5492 })).toBe('work');
    undoSortTrip(db, u);
    expect(openTrips(db, week).map((t) => t.id)).toEqual(['t1']);
    expect(knownRouteScope(db, { lat: 53.7997, lng: -1.5492 }, { lat: 53.6833, lng: -1.4977 })).toBeNull(); // back to 2
  });

  it('history carries the receipt merchant; usage and merge candidates', () => {
    const { db, cat } = setup();
    const e = add(db, 'x', 700, { ocrMerchant: 'Shell', categoryId: cat('fuel').id });
    add(db, 'old', 700, { categoryId: cat('parking').id }, NOW - 100 * DAY_MS);
    expect(sortHistoryV2(db)[0]).toMatchObject({ merchant: 'Shell', categoryId: cat('fuel').id });
    expect(categoryUsage90(db, 'expense', NOW)).toEqual([{ categoryId: cat('fuel').id, count: 1 }]);
    const near = add(db, 'RingGo', 350, {}, NOW - 2 * 3600_000);
    add(db, 'far', 350, {}, NOW - 3 * DAY_MS);
    createEntry(db, { type: 'income', amountMinor: 100, currency: 'GBP', note: 'tip', occurredAt: NOW }, NOW);
    expect(mergeCandidates(db, 'expense', NOW - 3600_000, e.id).map((c) => c.id)).toEqual([near.id]);
  });
});
