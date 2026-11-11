import type { Period } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 24 * 60 * 60 * 1000;

/** Week = Monday 00:00 → next Monday 00:00, local time. */
export function weekOf(at: number | Date): Period {
  const d = new Date(at);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

/** "9–15 Nov", or "30 Nov – 6 Dec" when the week spans two months. */
export function weekLabel(week: Period): string {
  const first = new Date(week.start);
  const last = new Date(week.end - DAY / 2);
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${MONTHS[last.getMonth()]}`;
  }
  return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
}
