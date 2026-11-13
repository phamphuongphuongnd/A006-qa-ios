import { createEntry } from '@/db/entriesRepo';
import { makeTestDb } from '@/db/testing/testDb';

import { loggedToday } from '../notifications';
import { daysLabel, nextReminderAt, nudgeDays, nudgeTimes } from '../reminder';

jest.mock('expo-notifications', () => ({ AndroidImportance: {}, IosAuthorizationStatus: {} }));

const at = (y: number, m: number, d: number, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const nudge = { on: true, hour: 19, minute: 0, days: [1, 2, 3, 4, 5, 6] };

describe('daily nudge (Q22)', () => {
  // Friday 13 Nov 2026
  it('fires at 19:00 on the chosen days, from today if nothing was logged', () => {
    const times = nudgeTimes(nudge, nudge.days, at(2026, 11, 13, 12), false, 3);
    expect(times).toEqual([at(2026, 11, 13, 19), at(2026, 11, 14, 19), at(2026, 11, 16, 19)]); // Sunday skipped
  });
  it('skips today once something was logged, and after 19:00', () => {
    expect(nudgeTimes(nudge, nudge.days, at(2026, 11, 13, 12), true, 1)).toEqual([at(2026, 11, 14, 19)]);
    expect(nudgeTimes(nudge, nudge.days, at(2026, 11, 13, 20), false, 1)).toEqual([at(2026, 11, 14, 19)]);
  });
  it('is off by default / with no days', () => {
    expect(nudgeTimes({ ...nudge, on: false }, nudge.days, at(2026, 11, 13), false)).toEqual([]);
    expect(nudgeTimes(nudge, [], at(2026, 11, 13), false)).toEqual([]);
  });
  it('follows work days when work hours are set', () => {
    expect(nudgeDays(nudge, { on: true, days: [1, 3] })).toEqual([1, 3]);
    expect(nudgeDays(nudge, { on: false, days: [1, 3] })).toEqual(nudge.days);
  });
  it('labels the days', () => {
    expect(daysLabel([1, 2, 3, 4, 5, 6])).toBe('Mon–Sat');
    expect(daysLabel([5, 1, 2, 3, 4])).toBe('Mon–Fri');
    expect(daysLabel([0, 3])).toBe('Wed, Sun');
    expect(daysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
  });
  it('counts only entries the driver logged today', () => {
    const db = makeTestDb();
    const now = at(2026, 11, 13, 18);
    expect(loggedToday(db, now)).toBe(false);
    createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP', source: 'recurring' }, at(2026, 11, 13, 9));
    expect(loggedToday(db, now)).toBe(false);
    createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP' }, at(2026, 11, 12, 22));
    expect(loggedToday(db, now)).toBe(false);
    createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP' }, at(2026, 11, 13, 8));
    expect(loggedToday(db, now)).toBe(true);
  });
});

describe('Sunday reminder window', () => {
  it('next Sunday 18:00 strictly after now', () => {
    expect(nextReminderAt({ weekday: 0, hour: 18, minute: 0 }, at(2026, 11, 13))).toBe(at(2026, 11, 15, 18));
    expect(nextReminderAt({ weekday: 0, hour: 18, minute: 0 }, at(2026, 11, 15, 18))).toBe(at(2026, 11, 22, 18));
  });
});
