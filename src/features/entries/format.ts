import { formatMoney } from '@/domain/money';
import type { Currency, EntryType, Minor } from '@/domain/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

const startOfDay = (at: number) => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** "07:42" */
export const timeLabel = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "Mon 9 Nov" */
export const dateLabel = (at: number) => {
  const d = new Date(at);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "9 Nov" */
export const dayMonth = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** Period [start, end) as a chip label: "6 Apr – 5 May 2026", or "6 Apr 2026 – 5 Apr 2027" across years (B-07). */
export function periodLabel(p: { start: number; end: number }): string {
  const a = new Date(p.start);
  const b = new Date(p.end - 1);
  if (startOfDay(p.start) === startOfDay(p.end - 1)) return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  if (a.getFullYear() === b.getFullYear()) return `${dayMonth(p.start)} – ${dayMonth(p.end - 1)} ${b.getFullYear()}`;
  return `${dayMonth(p.start)} ${a.getFullYear()} – ${dayMonth(p.end - 1)} ${b.getFullYear()}`;
}

/** "Tue 10 Nov, 13:05" — the changed-date chip in Quick capture and the Date & time row. */
export const dateTimeLabel = (at: number) => `${dateLabel(at)}, ${timeLabel(at)}`;

/** "Mon 9 Nov · 06:12" — Sort card. */
export const dateDotTime = (at: number) => `${dateLabel(at)} · ${timeLabel(at)}`;

/** "Sat 09:15" — Home recent rows / Sort list. */
export const weekdayTime = (at: number) => `${DAYS[new Date(at).getDay()]} ${timeLabel(at)}`;

/** Day group header: "Today", "Yesterday" or "Mon 9 Nov". */
export function dayHeader(at: number, now = Date.now(), labels = { today: 'Today', yesterday: 'Yesterday' }): string {
  const day = startOfDay(at);
  const today = startOfDay(now);
  if (day === today) return labels.today;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (day === y.getTime()) return labels.yesterday;
  return dateLabel(at);
}

/** Greeting bucket by local hour. */
export function greetingKey(at = Date.now()): 'morning' | 'afternoon' | 'evening' {
  const h = new Date(at).getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** Signed amount for lists: "−£15.00" (expense) / "+£620.00" (income). */
export const signedAmount = (type: EntryType, minor: Minor, currency: Currency) =>
  type === 'expense' ? `−${formatMoney(minor, currency)}` : `+${formatMoney(minor, currency)}`;

/** "2h 14m" / "14m" */
export function durationLabel(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** Whole-number miles with thousands separator: 8412 → "8,412". */
export const milesLabel = (miles: number) => String(Math.round(miles)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export interface DayGroup<T> {
  key: number;
  at: number;
  items: T[];
  incomeMinor: Minor;
  expenseMinor: Minor;
}

/** Groups entries (already sorted) by local day, keeping order, with per-day totals. */
export function groupByDay<T extends { occurredAt: number; type: EntryType; amountMinor: Minor }>(items: T[]): DayGroup<T>[] {
  const out: DayGroup<T>[] = [];
  const byKey = new Map<number, DayGroup<T>>();
  for (const it of items) {
    const key = startOfDay(it.occurredAt);
    let g = byKey.get(key);
    if (!g) {
      g = { key, at: it.occurredAt, items: [], incomeMinor: 0, expenseMinor: 0 };
      byKey.set(key, g);
      out.push(g);
    }
    g.items.push(it);
    if (it.type === 'income') g.incomeMinor += it.amountMinor;
    else g.expenseMinor += it.amountMinor;
  }
  return out;
}

/** Day total text: "−£42.10", "+£310.00" or "−£42.10 / +£310.00". */
export function dayTotalLabel(g: { incomeMinor: Minor; expenseMinor: Minor }, currency: Currency): string {
  const parts: string[] = [];
  if (g.expenseMinor > 0) parts.push(signedAmount('expense', g.expenseMinor, currency));
  if (g.incomeMinor > 0) parts.push(signedAmount('income', g.incomeMinor, currency));
  return parts.join(' / ');
}

/** Sunday-sort time estimate: ~12 s per entry, at least a minute. */
export const sortMinutes = (count: number) => Math.max(1, Math.ceil(count / 5));
