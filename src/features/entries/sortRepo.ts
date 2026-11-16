import { and, eq, gte, lt, sql } from 'drizzle-orm';

import { trips, type TripRow } from '@/db/schema';
import type { AppDb } from '@/db/types';
import type { SortedEntry } from '@/domain/suggest';
import type { EntryType, Period, Scope } from '@/domain/types';
import { weekOf } from '@/domain/week';
import { forgetKnownRoute, recordKnownRoute, type RouteRecord } from '@/features/rules/knownRoutes';

/**
 * Sort-tab queries (S2). Bản 2: the queue holds unsorted entries **and** automatic trips the app couldn't classify
 * (`trips.scope = 'unsorted'`, P1-2).
 */

const DAY = 24 * 60 * 60 * 1000;

/** Finished trips still waiting for Work / Personal. */
const OPEN_TRIP = sql`${trips.scope} = 'unsorted' AND ${trips.status} IN ('done', 'interrupted')`;

/** Weeks (newest first) with unsorted entries or trips, with counts — for the week picker. */
export function sortWeeks(db: AppDb): { week: Period; count: number }[] {
  const ats = db.all<{ at: number }>(sql`
    SELECT occurred_at AS at FROM entries WHERE category_id IS NULL
    UNION ALL SELECT started_at AS at FROM trips WHERE scope = 'unsorted' AND status IN ('done', 'interrupted')`);
  const map = new Map<number, { week: Period; count: number }>();
  for (const r of ats) {
    const w = weekOf(r.at);
    const cur = map.get(w.start) ?? { week: w, count: 0 };
    cur.count++;
    map.set(w.start, cur);
  }
  return [...map.values()].sort((a, b) => b.week.start - a.week.start);
}

/** Unsorted trips of the week, oldest first. */
export function openTrips(db: AppDb, period: Period): TripRow[] {
  return db
    .select()
    .from(trips)
    .where(and(OPEN_TRIP, gte(trips.startedAt, period.start), lt(trips.startedAt, period.end)))
    .orderBy(trips.startedAt)
    .all();
}

/** Trips of the week the driver sorted from the queue (they count as "done" in "9 of 14 sorted"). */
export function sortedQueueTrips(db: AppDb, period: Period): number {
  const n = db
    .select({ n: sql<number>`COUNT(*)` })
    .from(trips)
    .where(and(eq(trips.startedBy, 'auto'), eq(trips.classifiedBy, 'user'), gte(trips.startedAt, period.start), lt(trips.startedAt, period.end)))
    .get()?.n;
  return Number(n ?? 0);
}

/** Sorted entries for the suggester (with OCR merchant), newest first. */
export function sortHistoryV2(db: AppDb, limit = 500): SortedEntry[] {
  return db.all<SortedEntry>(
    sql`SELECT type, note, amount_minor AS amountMinor, category_id AS categoryId, scope, ocr_merchant AS merchant FROM entries
      WHERE category_id IS NOT NULL ORDER BY sorted_at DESC LIMIT ${limit}`,
  );
}

/** Free "Most used": how often each category was used by entries dated in the last 90 days. */
export function categoryUsage90(db: AppDb, type: EntryType, now = Date.now()): { categoryId: string; count: number }[] {
  return db.all<{ categoryId: string; count: number }>(
    sql`SELECT category_id AS categoryId, COUNT(*) AS count FROM entries
      WHERE type = ${type} AND category_id IS NOT NULL AND occurred_at >= ${now - 90 * DAY}
      GROUP BY category_id`,
  );
}

export interface MergeCandidate {
  id: string;
  note: string;
  amountMinor: number;
  occurredAt: number;
  categoryId: string | null;
}

/** Merge sheet (S-06): entries of the same type within ±1 day of `at`, nearest first, excluding `exceptId`. */
export function mergeCandidates(db: AppDb, type: EntryType, at: number, exceptId: string): MergeCandidate[] {
  return db.all<MergeCandidate>(
    sql`SELECT id, note, amount_minor AS amountMinor, occurred_at AS occurredAt, category_id AS categoryId FROM entries
      WHERE type = ${type} AND id <> ${exceptId} AND occurred_at >= ${at - DAY} AND occurred_at <= ${at + DAY}
      ORDER BY ABS(occurred_at - ${at}) ASC LIMIT 30`,
  );
}

export interface TripSortUndo {
  tripId: string;
  scope: TripRow['scope'];
  classifiedBy: TripRow['classifiedBy'];
  route: RouteRecord;
}

/** Driver picked Work / Personal for an Unsorted trip: scope + classifiedBy 'user', and one vote for its route. */
export function sortTrip(db: AppDb, tripId: string, scope: Scope, now = Date.now()): TripSortUndo | null {
  const t = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!t) return null;
  db.update(trips).set({ scope, classifiedBy: 'user' }).where(eq(trips.id, tripId)).run();
  const route = recordKnownRoute(db, tripId, scope, now);
  return { tripId, scope: t.scope, classifiedBy: t.classifiedBy, route };
}

export function undoSortTrip(db: AppDb, u: TripSortUndo): void {
  db.update(trips).set({ scope: u.scope, classifiedBy: u.classifiedBy }).where(eq(trips.id, u.tripId)).run();
  forgetKnownRoute(db, u.route);
}

