import { weekOf } from '@/domain/week';

import {
  dateDotTime,
  dateTimeLabel,
  dayHeader,
  dayTotalLabel,
  periodLabel,
  durationLabel,
  greetingKey,
  groupByDay,
  milesLabel,
  signedAmount,
  sortMinutes,
  weekdayTime,
} from '../format';
import {
  backupDue,
  commonType,
  datePeriod,
  EMPTY_FILTER,
  hasActiveFilter,
  keypadText,
  keypadValue,
  newPartMinor,
  partMinor,
  pickSortWeek,
  showBackupBanner,
  sortCardScope,
  sortQueue,
  toggledScope,
  toRepoFilter,
} from '../logic';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const DAY = 86_400_000;

describe('keypad', () => {
  it('types cash-register style', () => {
    expect(keypadValue('1250')).toBe(1250);
    expect(keypadValue('')).toBe(0);
    expect(keypadValue('0007')).toBe(7);
  });
  it('drops digits past 999,999.99', () => {
    expect(keypadValue('99999999')).toBe(99_999_999);
    expect(keypadValue('999999999')).toBe(99_999_999);
  });
  it('ignores non-digits and round-trips', () => {
    expect(keypadValue('12a,5')).toBe(125);
    expect(keypadText(0)).toBe('');
    expect(keypadText(1250)).toBe('1250');
  });
});

describe('format', () => {
  const now = at(2026, 11, 15, 10);
  it('labels day groups', () => {
    expect(dayHeader(at(2026, 11, 15, 7), now)).toBe('Today');
    expect(dayHeader(at(2026, 11, 14, 23), now)).toBe('Yesterday');
    expect(dayHeader(at(2026, 11, 9, 6), now)).toBe('Mon 9 Nov');
  });
  it('formats dates and times', () => {
    expect(dateTimeLabel(at(2026, 11, 10, 13, 5))).toBe('Tue 10 Nov, 13:05');
    expect(dateDotTime(at(2026, 11, 9, 6, 12))).toBe('Mon 9 Nov · 06:12');
    expect(weekdayTime(at(2026, 11, 14, 9, 15))).toBe('Sat 09:15');
  });
  it('greets by hour', () => {
    expect(greetingKey(at(2026, 1, 1, 6))).toBe('morning');
    expect(greetingKey(at(2026, 1, 1, 12))).toBe('afternoon');
    expect(greetingKey(at(2026, 1, 1, 18))).toBe('evening');
  });
  it('signs amounts and durations', () => {
    expect(signedAmount('expense', 1500, 'GBP')).toBe('−£15.00');
    expect(signedAmount('income', 62000, 'USD')).toBe('+$620.00');
    expect(durationLabel((2 * 60 + 14) * 60_000 + 30_000)).toBe('2h 14m');
    expect(durationLabel(5 * 60_000)).toBe('5m');
    expect(milesLabel(8412.4)).toBe('8,412');
  });
  it('groups by day with totals', () => {
    const items = [
      { occurredAt: at(2026, 11, 9, 14), type: 'expense' as const, amountMinor: 350 },
      { occurredAt: at(2026, 11, 9, 11), type: 'income' as const, amountMinor: 1000 },
      { occurredAt: at(2026, 11, 8, 17), type: 'expense' as const, amountMinor: 980 },
    ];
    const g = groupByDay(items);
    expect(g).toHaveLength(2);
    expect(g[0].items).toHaveLength(2);
    expect(dayTotalLabel(g[0], 'GBP')).toBe('−£3.50 / +£10.00');
    expect(dayTotalLabel(g[1], 'GBP')).toBe('−£9.80');
  });
  it('estimates sort minutes', () => {
    expect(sortMinutes(14)).toBe(3);
    expect(sortMinutes(1)).toBe(1);
  });
});

describe('entries filter', () => {
  const now = at(2026, 11, 12);
  const ty = { start: at(2026, 4, 6, 0), end: at(2027, 4, 6, 0) };
  it('detects active filters', () => {
    expect(hasActiveFilter(EMPTY_FILTER)).toBe(false);
    expect(hasActiveFilter({ ...EMPTY_FILTER, search: '  ' })).toBe(false);
    expect(hasActiveFilter({ ...EMPTY_FILTER, withReceipt: true })).toBe(true);
  });
  it('maps to the repo filter', () => {
    const f = toRepoFilter({ ...EMPTY_FILTER, search: ' Kwik ', scope: 'personal', withReceipt: true, date: 'thisWeek' }, now, ty);
    expect(f).toMatchObject({ search: 'Kwik', scope: 'personal', withReceipt: true, period: weekOf(now) });
    expect(f.type).toBeUndefined();
    const p = { start: 1, end: 2 };
    expect(toRepoFilter({ ...EMPTY_FILTER, date: 'thisWeek', period: p }, now, ty).period).toBe(p);
  });
  it('builds date ranges', () => {
    expect(datePeriod('any', now, ty)).toBeUndefined();
    expect(datePeriod('lastWeek', now, ty)).toEqual(weekOf(weekOf(now).start - DAY));
    expect(datePeriod('thisMonth', now, ty)).toEqual({ start: at(2026, 11, 1, 0), end: at(2026, 12, 1, 0) });
    expect(datePeriod('lastMonth', at(2026, 1, 10), ty)).toEqual({ start: at(2025, 12, 1, 0), end: at(2026, 1, 1, 0) });
    expect(datePeriod('taxYear', now, ty)).toBe(ty);
  });
});

describe('sort queue', () => {
  const e = (id: string, day: number, cat: string | null = null) => ({ id, occurredAt: at(2026, 11, day), categoryId: cat });
  it('orders oldest first, skipped to the back, sorted removed', () => {
    const list = [e('c', 12), e('a', 9), e('b', 10), e('done', 11, 'fuel')];
    expect(sortQueue(list, []).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(sortQueue(list, ['a']).map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(sortQueue(list, ['done', 'b']).map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
  it('picks the week', () => {
    const w1 = { week: { start: 200, end: 300 } };
    const w2 = { week: { start: 100, end: 200 } };
    expect(pickSortWeek(null, [w1, w2])).toBe(w1.week);
    expect(pickSortWeek(100, [w1, w2])).toBe(w2.week);
    expect(pickSortWeek(50, [w1, w2])).toBe(w1.week);
    expect(pickSortWeek(null, [])).toBeNull();
  });
});

describe('backup banner', () => {
  const now = at(2026, 11, 12);
  const base = { lastBackupAt: null, backupReminder: true, backupBannerSnoozedUntil: null };
  it('never backed up: only with 20+ entries', () => {
    expect(showBackupBanner(base, 19, now)).toBe(false);
    expect(showBackupBanner(base, 20, now)).toBe(true);
  });
  it('last backup over 30 days', () => {
    expect(backupDue({ lastBackupAt: now - 30 * DAY }, 0, now)).toBe(false);
    expect(backupDue({ lastBackupAt: now - 34 * DAY }, 0, now)).toBe(true);
  });
  it('respects snooze and the reminder switch', () => {
    expect(showBackupBanner({ ...base, backupBannerSnoozedUntil: now + DAY }, 50, now)).toBe(false);
    expect(showBackupBanner({ ...base, backupBannerSnoozedUntil: now - 1 }, 50, now)).toBe(true);
    expect(showBackupBanner({ ...base, backupReminder: false }, 50, now)).toBe(false);
  });
});

describe('split + selection helpers', () => {
  it('parses part amounts', () => {
    expect(partMinor('45')).toBe(4500);
    expect(partMinor('45.5')).toBe(4550);
    expect(partMinor('£1,000.00')).toBe(100000);
    expect(partMinor('abc')).toBe(0);
    expect(partMinor('-3')).toBe(0);
    expect(newPartMinor(6000, [4500, 1000])).toBe(500);
    expect(newPartMinor(6000, [4500, 2000])).toBe(0);
  });
  it('toggles scope and finds a common type', () => {
    expect(toggledScope(['work', 'work'])).toBe('personal');
    expect(toggledScope(['work', 'personal'])).toBe('work');
    expect(commonType(['expense', 'expense'])).toBe('expense');
    expect(commonType(['expense', 'income'])).toBeNull();
    expect(commonType([])).toBeNull();
  });
});

describe('sort card scope (B-01)', () => {
  it('keeps Personal even when history says Work', () => {
    expect(sortCardScope('personal', 'work')).toBe('personal');
    expect(sortCardScope('personal', null)).toBe('personal');
  });
  it('lets history move a Work entry', () => {
    expect(sortCardScope('work', 'personal')).toBe('personal');
    expect(sortCardScope('work', null)).toBe('work');
  });
});

describe('periodLabel (B-07)', () => {
  it('names the period the filter is on', () => {
    expect(periodLabel({ start: at(2026, 4, 6, 0), end: at(2027, 4, 6, 0) })).toBe('6 Apr 2026 – 5 Apr 2027');
    expect(periodLabel({ start: at(2026, 7, 1, 0), end: at(2026, 10, 1, 0) })).toBe('1 Jul – 30 Sep 2026');
    expect(periodLabel({ start: at(2026, 11, 12, 0), end: at(2026, 11, 13, 0) })).toBe('12 Nov 2026');
  });
});
