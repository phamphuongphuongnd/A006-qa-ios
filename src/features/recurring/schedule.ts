import type { RecurringFreq } from '@/domain/types';

/**
 * F-10 recurring schedule, on local calendar days written 'YYYY-MM-DD' (the `recurring` table's text dates).
 * Pure: no DB, no clock — `today` is passed in.
 *
 * - weekly / four_weekly: `day` = weekday 0–6 (Sun = 0). Every 4 weeks counts from the first such weekday on or after
 *   `startsOn`.
 * - monthly: `day` = 1–31, clamped to the month's last day (31 → 30 Nov, 28/29 Feb). Each month clamps from `day`
 *   again, so "31st" is back on 31 Dec after 30 Nov.
 * - yearly: `month` 1–12 + `day`, clamped the same way (29 Feb → 28 Feb in other years).
 */
export interface Schedule {
  freq: RecurringFreq;
  day: number;
  month?: number | null;
  startsOn: string;
  endsOn?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local calendar day of a timestamp. */
export const dayOf = (at: number) => toDay(new Date(at));

/** Local midnight of a 'YYYY-MM-DD' day. */
export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local noon of the day: entries made by a template sit mid-day, away from DST edges and week boundaries. */
export const noonOf = (s: string) => {
  const d = parseDay(s);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
};

const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();
const clampDay = (y: number, m0: number, day: number) => new Date(y, m0, Math.min(Math.max(1, day), daysInMonth(y, m0)));
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** First due day on or after `from` (and on or after `startsOn`), or null once past `endsOn`. */
export function nextOnOrAfter(s: Schedule, from: string): string | null {
  const start = parseDay(s.startsOn);
  const f = parseDay(from);
  const base = f > start ? f : start;
  let out: Date;
  switch (s.freq) {
    case 'weekly': {
      out = addDays(base, (s.day - base.getDay() + 7) % 7);
      break;
    }
    case 'four_weekly': {
      const anchor = addDays(start, (s.day - start.getDay() + 7) % 7);
      if (anchor >= base) out = anchor;
      else {
        const diff = Math.round((base.getTime() - anchor.getTime()) / 86_400_000);
        out = addDays(anchor, Math.ceil(diff / 28) * 28);
      }
      break;
    }
    case 'monthly': {
      out = clampDay(base.getFullYear(), base.getMonth(), s.day);
      if (out < base) out = clampDay(base.getFullYear(), base.getMonth() + 1, s.day);
      break;
    }
    case 'yearly': {
      const m0 = (s.month ?? 1) - 1;
      out = clampDay(base.getFullYear(), m0, s.day);
      if (out < base) out = clampDay(base.getFullYear() + 1, m0, s.day);
      break;
    }
  }
  const day = toDay(out);
  if (s.endsOn && day > s.endsOn) return null;
  return day;
}

/** Next due day strictly after `after`. */
export const nextAfter = (s: Schedule, after: string) => nextOnOrAfter(s, toDay(addDays(parseDay(after), 1)));

/** Safety cap: a template never makes more than this many entries in one catch-up. */
export const MAX_CATCH_UP = 400;

/**
 * Due days from `nextOn` up to and including `today` (catch-up after the app wasn't opened, or Pro came back), plus
 * the template's new `nextOn` (null = ended).
 */
export function dueDays(s: Schedule, nextOn: string | null, today: string): { days: string[]; nextOn: string | null } {
  const days: string[] = [];
  let at = nextOn;
  while (at !== null && at <= today && days.length < MAX_CATCH_UP) {
    if (s.endsOn && at > s.endsOn) {
      at = null;
      break;
    }
    days.push(at);
    at = nextAfter(s, at);
  }
  return { days, nextOn: at };
}

const ORD = (n: number) => {
  const r10 = n % 10;
  const r100 = n % 100;
  if (r10 === 1 && r100 !== 11) return `${n}st`;
  if (r10 === 2 && r100 !== 12) return `${n}nd`;
  if (r10 === 3 && r100 !== 13) return `${n}rd`;
  return `${n}th`;
};
export const ordinal = ORD;

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Monthly on the 1st", "Weekly on Monday", "Every 4 weeks on Friday", "Yearly on 6 Apr". */
export function repeatLabel(s: Pick<Schedule, 'freq' | 'day' | 'month'>): string {
  switch (s.freq) {
    case 'weekly':
      return `Weekly on ${WEEKDAY[s.day]}`;
    case 'four_weekly':
      return `Every 4 weeks on ${WEEKDAY[s.day]}`;
    case 'monthly':
      return `Monthly on the ${ORD(s.day)}`;
    case 'yearly':
      return `Yearly on ${s.day} ${MONTH[(s.month ?? 1) - 1]}`;
  }
}

/** "1 Dec" (adds the year when it isn't this year's). */
export function shortDay(s: string, today: string): string {
  const d = parseDay(s);
  const label = `${d.getDate()} ${MONTH[d.getMonth()]}`;
  return s.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${d.getFullYear()}`;
}

/** "1 Apr 2026" */
export function longDay(s: string): string {
  const d = parseDay(s);
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

/** The schedule's "On" value that matches a given day (used when creating from an entry or changing "Repeats"). */
export function dayFieldFor(freq: RecurringFreq, on: string): { day: number; month: number | null } {
  const d = parseDay(on);
  if (freq === 'weekly' || freq === 'four_weekly') return { day: d.getDay(), month: null };
  if (freq === 'monthly') return { day: d.getDate(), month: null };
  return { day: d.getDate(), month: d.getMonth() + 1 };
}
