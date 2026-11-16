import { eq } from 'drizzle-orm';

import { listCategories, seedCategories } from '@/db/categoriesRepo';
import { createEntry, unsortedCount } from '@/db/entriesRepo';
import { startTrial } from '@/db/proRepo';
import { entries } from '@/db/schema';
import { makeTestDb } from '@/db/testing/testDb';
import type { AppDb } from '@/db/types';

import {
  createRecurring,
  deleteRecurring,
  generateDueRecurring,
  getRecurring,
  isEnded,
  recurringName,
  setPaused,
  updateRecurring,
  validateRecurring,
  type RecurringInput,
} from '../repo';
import { dayFieldFor, dueDays, nextAfter, nextOnOrAfter, ordinal, repeatLabel, type Schedule } from '../schedule';

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).getTime();

describe('schedule', () => {
  const monthly31: Schedule = { freq: 'monthly', day: 31, startsOn: '2026-01-01' };

  it('monthly clamps to month end and comes back to the 31st', () => {
    expect(nextOnOrAfter(monthly31, '2026-11-01')).toBe('2026-11-30');
    expect(nextAfter(monthly31, '2026-11-30')).toBe('2026-12-31');
    expect(nextAfter(monthly31, '2027-01-31')).toBe('2027-02-28');
    expect(nextAfter(monthly31, '2027-02-28')).toBe('2027-03-31');
  });

  it('monthly on the 1st from mid-month is next month', () => {
    expect(nextOnOrAfter({ freq: 'monthly', day: 1, startsOn: '2026-04-01' }, '2026-11-13')).toBe('2026-12-01');
    expect(nextOnOrAfter({ freq: 'monthly', day: 14, startsOn: '2026-04-01' }, '2026-11-14')).toBe('2026-11-14');
  });

  it('weekly lands on the weekday', () => {
    // 13 Nov 2026 is a Friday.
    expect(nextOnOrAfter({ freq: 'weekly', day: 1, startsOn: '2026-01-01' }, '2026-11-13')).toBe('2026-11-16');
    expect(nextOnOrAfter({ freq: 'weekly', day: 5, startsOn: '2026-01-01' }, '2026-11-13')).toBe('2026-11-13');
  });

  it('every 4 weeks counts from the first weekday after the start', () => {
    const s: Schedule = { freq: 'four_weekly', day: 5, startsOn: '2026-10-14' }; // first Friday = 16 Oct
    expect(nextOnOrAfter(s, '2026-10-01')).toBe('2026-10-16');
    expect(nextOnOrAfter(s, '2026-10-17')).toBe('2026-11-13');
    expect(nextAfter(s, '2026-11-13')).toBe('2026-12-11');
  });

  it('yearly clamps 29 Feb', () => {
    const s: Schedule = { freq: 'yearly', day: 29, month: 2, startsOn: '2028-01-01' };
    expect(nextOnOrAfter(s, '2028-01-01')).toBe('2028-02-29');
    expect(nextAfter(s, '2028-02-29')).toBe('2029-02-28');
  });

  it('stops after the end day', () => {
    const s: Schedule = { freq: 'monthly', day: 1, startsOn: '2026-01-01', endsOn: '2026-12-15' };
    expect(nextAfter(s, '2026-12-01')).toBeNull();
    expect(dueDays(s, '2026-11-01', '2027-03-01')).toEqual({ days: ['2026-11-01', '2026-12-01'], nextOn: null });
  });

  it('catches up every missed day', () => {
    const s: Schedule = { freq: 'weekly', day: 1, startsOn: '2026-01-01' };
    expect(dueDays(s, '2026-11-02', '2026-11-16')).toEqual({ days: ['2026-11-02', '2026-11-09', '2026-11-16'], nextOn: '2026-11-23' });
    expect(dueDays(s, '2026-11-23', '2026-11-16')).toEqual({ days: [], nextOn: '2026-11-23' });
  });

  it('labels', () => {
    expect(repeatLabel({ freq: 'monthly', day: 1 })).toBe('Monthly on the 1st');
    expect(repeatLabel({ freq: 'monthly', day: 14 })).toBe('Monthly on the 14th');
    expect(repeatLabel({ freq: 'four_weekly', day: 5 })).toBe('Every 4 weeks on Friday');
    expect(repeatLabel({ freq: 'yearly', day: 6, month: 4 })).toBe('Yearly on 6 Apr');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st',
    ]);
    expect(dayFieldFor('weekly', '2026-11-13')).toEqual({ day: 5, month: null });
    expect(dayFieldFor('yearly', '2026-11-13')).toEqual({ day: 13, month: 11 });
  });
});

describe('recurring repo', () => {
  let db: AppDb;
  let lease: string;
  const NOW = at(2026, 11, 13);
  const input = (over: Partial<RecurringInput> = {}): RecurringInput => ({
    type: 'expense',
    amountMinor: 28900,
    currency: 'GBP',
    note: 'Van lease',
    categoryId: lease,
    scope: 'work',
    freq: 'monthly',
    day: 1,
    month: null,
    startsOn: '2026-04-01',
    endsOn: null,
    paused: false,
    ...over,
  });

  beforeEach(() => {
    db = makeTestDb();
    seedCategories(db, 'UK');
    lease = listCategories(db, { type: 'expense' })[0].id;
    startTrial(db, NOW);
  });

  it('does not back-fill before the day it was saved', () => {
    const r = createRecurring(db, input(), NOW);
    expect(r.nextOn).toBe('2026-12-01');
    expect(generateDueRecurring(db, NOW)).toBe(0);
  });

  it('makes sorted, labelled entries when due — not in the Sort queue', () => {
    createRecurring(db, input({ day: 13 }), NOW);
    expect(generateDueRecurring(db, NOW)).toBe(1);
    expect(generateDueRecurring(db, NOW + 3_600_000)).toBe(0);
    const rows = db.select().from(entries).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: 'recurring', categoryId: lease, scope: 'work', amountMinor: 28900, note: 'Van lease' });
    expect(rows[0].sortedAt).not.toBeNull();
    expect(new Date(rows[0].occurredAt).getDate()).toBe(13);
    expect(unsortedCount(db)).toBe(0);
  });

  it('catches up after days without the app', () => {
    const r = createRecurring(db, input({ freq: 'weekly', day: 5 }), NOW); // Fridays, from 13 Nov
    expect(generateDueRecurring(db, at(2026, 11, 28), true)).toBe(3); // 13, 20, 27 Nov
    expect(getRecurring(db, r.id)!.nextOn).toBe('2026-12-04');
  });

  it('stops without Pro and resumes when Pro is back', () => {
    createRecurring(db, input({ day: 13 }), NOW);
    expect(generateDueRecurring(db, NOW, false)).toBe(0);
    expect(generateDueRecurring(db, NOW, true)).toBe(1);
    // Trial over (no subscription): nothing made on 13 Dec.
    expect(generateDueRecurring(db, at(2026, 12, 13))).toBe(0);
  });

  it('paused templates make nothing and are not back-filled', () => {
    const r = createRecurring(db, input({ freq: 'weekly', day: 5 }), NOW);
    setPaused(db, r.id, true, NOW);
    expect(generateDueRecurring(db, at(2026, 11, 28), true)).toBe(0);
    setPaused(db, r.id, false, at(2026, 11, 28));
    expect(getRecurring(db, r.id)!.nextOn).toBe('2026-12-04');
  });

  it('created from an entry starts after that entry', () => {
    const e = createEntry(db, { type: 'expense', amountMinor: 1500, currency: 'GBP', categoryId: lease, occurredAt: NOW }, NOW);
    const r = createRecurring(db, input({ amountMinor: e.amountMinor, day: 13 }), NOW, '2026-11-13');
    expect(r.nextOn).toBe('2026-12-13');
    expect(generateDueRecurring(db, NOW, true)).toBe(0);
  });

  it('editing never changes entries already made; deleting keeps them', () => {
    const r = createRecurring(db, input({ day: 13 }), NOW);
    generateDueRecurring(db, NOW, true);
    updateRecurring(db, r.id, input({ day: 13, amountMinor: 30000 }), NOW);
    expect(db.select().from(entries).get()!.amountMinor).toBe(28900);
    expect(getRecurring(db, r.id)!.amountMinor).toBe(30000);
    deleteRecurring(db, r.id);
    expect(db.select().from(entries).where(eq(entries.recurringId, r.id)).all()).toHaveLength(1);
  });

  it('ends', () => {
    const r = createRecurring(db, input({ day: 13, endsOn: '2026-12-31' }), NOW);
    expect(generateDueRecurring(db, at(2027, 2, 1), true)).toBe(2);
    expect(isEnded(getRecurring(db, r.id)!)).toBe(true);
    expect(generateDueRecurring(db, at(2027, 3, 1), true)).toBe(0);
  });

  it('validates', () => {
    expect(validateRecurring(input({ amountMinor: 0 }))).toBe('amount');
    expect(validateRecurring(input({ endsOn: '2026-01-01' }))).toBe('ends_before_start');
    expect(validateRecurring(input())).toBeNull();
  });

  it('B-41: a new template needs a category, so its entries never land in the Sort queue', () => {
    expect(validateRecurring(input({ categoryId: null }))).toBe('category');
    expect(() => createRecurring(db, input({ categoryId: null }), NOW)).toThrow('category');
    expect(generateDueRecurring(db, NOW, true)).toBe(0);
    expect(unsortedCount(db)).toBe(0);
  });

  it('B-41: a template whose category was deleted can still be paused', () => {
    const r = createRecurring(db, input(), NOW);
    updateRecurring(db, r.id, input({ categoryId: null }), NOW);
    expect(() => setPaused(db, r.id, true, NOW)).not.toThrow();
    expect(getRecurring(db, r.id)!.paused).toBe(true);
  });

  it('B-41: the list names a template by its note, else its category', () => {
    expect(recurringName('Van lease', 'Fuel', 'Recurring entries')).toBe('Van lease');
    expect(recurringName('  ', 'Phone & data', 'Recurring entries')).toBe('Phone & data');
    expect(recurringName('', null, 'Recurring entries')).toBe('Recurring entries');
  });
});
