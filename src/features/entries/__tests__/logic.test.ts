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
  entryWhen,
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
  cardActionsStack,
  sortScrolls,
  mixedQueue,
  tripKey,
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
    expect(dateTimeLabel(at(2026, 11, 10, 13, 5), at(2026, 11, 18, 9, 0))).toBe('Tue 10 Nov, 13:05');
    expect(dateTimeLabel(at(2019, 11, 20, 11, 9), at(2026, 11, 18, 9, 0))).toBe('20 Nov 2019, 11:09');
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

describe('mixedQueue (bản 2: entries + Unsorted trips)', () => {
  const e = (id: string, occurredAt: number, categoryId: string | null = null) => ({ id, occurredAt, categoryId });
  const tr = (id: string, startedAt: number) => ({ id, startedAt });

  it('orders entries and trips oldest first, sorted entries drop out', () => {
    const q = mixedQueue([e('a', 30), e('b', 10), e('c', 5, 'fuel')], [tr('t', 20)], []);
    expect(q.map((i) => i.key)).toEqual(['b', tripKey('t'), 'a']);
    expect(q[1]).toMatchObject({ kind: 'trip', trip: { id: 't' } });
  });

  it('skipped cards go to the back in skip order', () => {
    const q = mixedQueue([e('a', 1), e('b', 2)], [tr('t', 3)], [tripKey('t'), 'a']);
    expect(q.map((i) => i.key)).toEqual(['b', tripKey('t'), 'a']);
    const q2 = mixedQueue([e('a', 1), e('b', 2)], [tr('t', 0)], ['a', tripKey('t')]);
    expect(q2.map((i) => i.key)).toEqual(['b', 'a', tripKey('t')]);
  });
});

describe('QA-100 dates in lists', () => {
  const now = new Date(2026, 10, 17, 12).getTime();
  const d = (y: number, m: number, day: number, h = 10, mi = 23) => new Date(y, m - 1, day, h, mi).getTime();
  it('entryWhen: weekday within 6 days, date after that, year when it differs (A37-3)', () => {
    expect(entryWhen(d(2026, 11, 15), now)).toBe('Sun 10:23');
    expect(entryWhen(d(2026, 10, 25), now)).toBe('25 Oct 10:23');
    expect(entryWhen(d(2025, 11, 17), now)).toBe('17 Nov 2025 10:23');
  });
  it('dayHeader adds the year for another year (MOD-5)', () => {
    expect(dayHeader(d(2025, 11, 17), now)).toBe('Mon 17 Nov 2025');
    expect(dayHeader(d(2026, 11, 9), now)).toBe('Mon 9 Nov');
  });
});

// B-152 (and QA-100 phiên B): the Sort card's four actions go icon-above-label when they can't fit side by side.
describe('cardActionsStack', () => {
  it('stacks where the labels were cut', () => {
    expect(cardActionsStack(295, 1.235)).toBe(true); // iPhone SE, XXL: "E… Split Mer… S…"
    expect(cardActionsStack(295, 1.118)).toBe(true); // iPhone SE, XL
    expect(cardActionsStack(288, 1.2999)).toBe(true); // Android 360dp, text 1.3 (reported as 1.2999)
    expect(cardActionsStack(288, 2.0)).toBe(true); // Android 360dp, text 2.0
  });
  it('keeps one row where the labels fit', () => {
    expect(cardActionsStack(295, 1.0)).toBe(false); // iPhone SE, default size
    expect(cardActionsStack(288, 1.0)).toBe(false); // Android 360dp
    expect(cardActionsStack(288, 0.85)).toBe(false);
    expect(cardActionsStack(350, 1.353)).toBe(false); // Pro Max, XXXL
    expect(cardActionsStack(560, 2.0)).toBe(false); // iPad column
  });
});

// B-114 / B-147: which Sort layout a window gets (true = scrolling layout).
describe('sortScrolls', () => {
  it('a short window scrolls on every platform (MOD-11 split screen)', () => {
    expect(sortScrolls(436, 1, 'android')).toBe(true);
    expect(sortScrolls(436, 1, 'ios')).toBe(true);
  });
  it('Android keeps the B-114 v3 cases', () => {
    expect(sortScrolls(640, 2.0, 'android')).toBe(true); // 360×640dp, text 2.0 (OLD-13)
    expect(sortScrolls(640, 1.3, 'android')).toBe(false); // text 1.3: the scrolling layout cut the Split form
    expect(sortScrolls(640, 1.7, 'android')).toBe(false);
    expect(sortScrolls(800, 1.0, 'android')).toBe(false);
  });
  it('iOS: iPhone SE at XXXL scrolls (B-147), roomier sizes stay normal', () => {
    expect(sortScrolls(667, 1.35, 'ios')).toBe(true); // SE, XXXL: 667 / 1.35 ≈ 494
    expect(sortScrolls(667, 1.235, 'ios')).toBe(true); // SE, XXL: ≈ 540 — card scroll area ~95pt (B-152)
    expect(sortScrolls(667, 1.118, 'ios')).toBe(true); // SE, XL: ≈ 597
    expect(sortScrolls(667, 1.0, 'ios')).toBe(false);
    expect(sortScrolls(852, 1.35, 'ios')).toBe(false); // iPhone 16, XXXL: ≈ 631
    expect(sortScrolls(932, 1.35, 'ios')).toBe(false); // Pro Max, XXXL (passed in QA)
    expect(sortScrolls(667, 2.0, 'ios')).toBe(true); // SE, AX-Large (B-114 v3, passed in QA)
    expect(sortScrolls(1376, 1.35, 'ios')).toBe(false); // iPad 13"
  });
});
