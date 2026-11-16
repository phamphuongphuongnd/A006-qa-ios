import { and, eq, gte, inArray, isNull, lt } from 'drizzle-orm';

import { entries, trips } from '@/db/schema';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import type { AppDb } from '@/db/types';
import type { Period } from '@/domain/types';

/**
 * "Exported" marker (Q29, F-23 — MileIQ "Mark drives as reported"). Every file made from S-10 stamps the entries and
 * finished trips of its period with `exported_at`; editing one afterwards clears the stamp (SQLite triggers in 0004),
 * so "N changes since your last export" = items of the period without a stamp, once the period has been exported.
 */

const scopeWhere = (includePersonal: boolean) => (includePersonal ? [] : [eq(entries.scope, 'work')]);
const tripScopeWhere = (includePersonal: boolean) => (includePersonal ? [] : [eq(trips.scope, 'work')]);
const DONE = ['done', 'interrupted'] as const;

export function markExported(db: AppDb, period: Period & { fileStem: string }, includePersonal: boolean, now = Date.now()): void {
  db.transaction((tx) => {
    tx.update(entries)
      .set({ exportedAt: now })
      .where(and(gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end), ...scopeWhere(includePersonal)))
      .run();
    tx.update(trips)
      .set({ exportedAt: now })
      .where(and(gte(trips.startedAt, period.start), lt(trips.startedAt, period.end), inArray(trips.status, [...DONE]), ...tripScopeWhere(includePersonal)))
      .run();
  });
  const log = getSettings(db).exportLog;
  updateSettings(db, { exportLog: { ...log, [period.fileStem]: now } });
}

/** Entries + finished trips of the period added or edited since they were last exported. */
export function exportChanges(db: AppDb, period: Period, includePersonal: boolean): number {
  const e = db
    .select({ id: entries.id })
    .from(entries)
    .where(and(gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end), isNull(entries.exportedAt), ...scopeWhere(includePersonal)))
    .all().length;
  const t = db
    .select({ id: trips.id })
    .from(trips)
    .where(
      and(
        gte(trips.startedAt, period.start),
        lt(trips.startedAt, period.end),
        isNull(trips.exportedAt),
        inArray(trips.status, [...DONE]),
        ...tripScopeWhere(includePersonal),
      ),
    )
    .all().length;
  return e + t;
}

/** When this period's files were last made (null = never). */
export const lastExportAt = (db: AppDb, fileStem: string): number | null => getSettings(db).exportLog[fileStem] ?? null;
