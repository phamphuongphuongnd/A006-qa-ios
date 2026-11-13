import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { createEntry } from '@/db/entriesRepo';
import { getProStatus } from '@/db/proRepo';
import { entries, recurring, type RecurringRow } from '@/db/schema';
import { newId, type AppDb } from '@/db/types';
import { hasPro } from '@/domain/pro';
import type { Currency, EntryType, Minor, RecurringFreq, Scope } from '@/domain/types';

import { dayOf, dueDays, nextOnOrAfter, noonOf, parseDay } from './schedule';

/** What the S-17 sheet edits. Dates are local 'YYYY-MM-DD'. */
export interface RecurringInput {
  type: EntryType;
  amountMinor: Minor;
  currency: Currency;
  note: string;
  categoryId: string | null;
  scope: Scope;
  freq: RecurringFreq;
  day: number;
  month: number | null;
  startsOn: string;
  endsOn: string | null;
  paused: boolean;
}

export type RecurringError = 'amount' | 'ends_before_start';

export function validateRecurring(i: RecurringInput): RecurringError | null {
  if (!Number.isInteger(i.amountMinor) || i.amountMinor <= 0) return 'amount';
  if (i.endsOn && i.endsOn < i.startsOn) return 'ends_before_start';
  return null;
}

export const listRecurring = (db: AppDb): RecurringRow[] =>
  db.select().from(recurring).orderBy(asc(recurring.nextOn), asc(recurring.createdAt)).all();

export const getRecurring = (db: AppDb, id: string): RecurringRow | undefined =>
  db.select().from(recurring).where(eq(recurring.id, id)).get();

/**
 * First due day for a template saved today: never before today (a template starting "1 Apr" saved in November does
 * not back-fill April–October — those were logged by hand). An ended template keeps `nextOn` = its end day + 1 so it
 * simply never comes due.
 */
function firstNextOn(i: Pick<RecurringInput, 'freq' | 'day' | 'month' | 'startsOn' | 'endsOn'>, today: string, after?: string): string {
  const from = after && after >= today ? nextDayOf(after) : today;
  return nextOnOrAfter(i, from) ?? nextDayOf(i.endsOn ?? today);
}

const nextDayOf = (s: string) => {
  const d = parseDay(s);
  return dayOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime());
};

/**
 * `fromEntryDay`: created with "Make recurring" on an entry dated that day — the entry itself is that day's
 * occurrence, so the template starts after it.
 */
export function createRecurring(db: AppDb, i: RecurringInput, now = Date.now(), fromEntryDay?: string): RecurringRow {
  const err = validateRecurring(i);
  if (err) throw new Error(err);
  const today = dayOf(now);
  const row: RecurringRow = {
    id: newId(),
    ...i,
    note: i.note.trim().slice(0, 120),
    nextOn: firstNextOn(i, today, fromEntryDay),
    createdAt: now,
    updatedAt: now,
  };
  db.insert(recurring).values(row).run();
  return row;
}

/**
 * Editing a template never changes entries it already made (F-10). A change to the schedule, or un-pausing, picks
 * the next due day from today again (paused weeks are not back-filled).
 */
export function updateRecurring(db: AppDb, id: string, i: RecurringInput, now = Date.now()): RecurringRow | undefined {
  const err = validateRecurring(i);
  if (err) throw new Error(err);
  const cur = getRecurring(db, id);
  if (!cur) return undefined;
  const today = dayOf(now);
  const scheduleChanged =
    cur.freq !== i.freq ||
    cur.day !== i.day ||
    (cur.month ?? null) !== (i.month ?? null) ||
    cur.startsOn !== i.startsOn ||
    (cur.endsOn ?? null) !== (i.endsOn ?? null) ||
    (cur.paused && !i.paused);
  const nextOn = scheduleChanged ? firstNextOn(i, today) : cur.nextOn;
  const patch = { ...i, note: i.note.trim().slice(0, 120), nextOn, updatedAt: now };
  db.update(recurring).set(patch).where(eq(recurring.id, id)).run();
  return { ...cur, ...patch };
}

export function setPaused(db: AppDb, id: string, paused: boolean, now = Date.now()) {
  const cur = getRecurring(db, id);
  if (!cur) return;
  const { id: _id, nextOn: _n, createdAt: _c, updatedAt: _u, ...input } = cur;
  updateRecurring(db, id, { ...input, paused }, now);
}

/** Entries it made stay (with their "Recurring" label). */
export function deleteRecurring(db: AppDb, id: string) {
  db.delete(recurring).where(eq(recurring.id, id)).run();
}

/**
 * Creates every due entry (P1-9): already sorted (category + Work/Personal from the template), label "Recurring",
 * never in the Sort queue, no notification. Runs at app start / foreground, from the nightly background task and
 * after saving a template. Does nothing without Pro — templates wait, and come back when Pro does (product §6).
 * A template whose category was deleted makes unsorted entries (they go to Sort, the driver picks a category).
 * Returns how many entries were made.
 */
export function generateDueRecurring(db: AppDb, now = Date.now(), pro = hasPro(getProStatus(db, now))): number {
  if (!pro) return 0;
  const today = dayOf(now);
  let made = 0;
  for (const tpl of listRecurring(db)) {
    if (tpl.paused || tpl.nextOn > today || isEnded(tpl)) continue;
    const { days, nextOn } = dueDays(tpl, tpl.nextOn, today);
    db.transaction((tx) => {
      const t = tx as unknown as AppDb;
      for (const day of days) {
        const at = noonOf(day);
        // Never twice for one day (two runs racing: foreground + background task).
        const start = parseDay(day).getTime();
        const end = start + 86_400_000 + 3_600_000;
        const dup = t
          .select({ id: entries.id })
          .from(entries)
          .where(and(eq(entries.recurringId, tpl.id), gte(entries.occurredAt, start), lt(entries.occurredAt, end)))
          .get();
        if (dup) continue;
        createEntry(
          t,
          {
            type: tpl.type,
            amountMinor: tpl.amountMinor,
            currency: tpl.currency,
            occurredAt: at,
            note: tpl.note,
            categoryId: tpl.categoryId,
            scope: tpl.scope,
            source: 'recurring',
            recurringId: tpl.id,
          },
          now,
        );
        made++;
      }
      t.update(recurring)
        .set({ nextOn: nextOn ?? nextDayOf(tpl.endsOn ?? today) })
        .where(eq(recurring.id, tpl.id))
        .run();
    });
  }
  return made;
}

/** Past its "Ends" day: nothing more will be made. */
export const isEnded = (t: Pick<RecurringRow, 'endsOn' | 'nextOn'>) => !!t.endsOn && t.nextOn > t.endsOn;
