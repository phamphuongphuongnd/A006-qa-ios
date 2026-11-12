import { min } from 'drizzle-orm';

import { entries, trips } from '@/db/schema';
import type { AppDb } from '@/db/types';

/** Oldest entry or trip time — the first tax year offered in the Reports year picker. */
export function oldestRecordAt(db: AppDb): number | null {
  const e = db.select({ m: min(entries.occurredAt) }).from(entries).get()?.m ?? null;
  const t = db.select({ m: min(trips.startedAt) }).from(trips).get()?.m ?? null;
  if (e === null) return t;
  return t === null ? e : Math.min(e, t);
}
