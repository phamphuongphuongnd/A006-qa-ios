import { min } from 'drizzle-orm';

import { entries, trips, type TripRow } from '@/db/schema';
import { listTrips } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { metersToMiles } from '@/domain/mileage';
import type { Period } from '@/domain/types';

/** Oldest entry or trip time — the first tax year offered in the Reports year picker. */
export function oldestRecordAt(db: AppDb): number | null {
  const e = db.select({ m: min(entries.occurredAt) }).from(entries).get()?.m ?? null;
  const t = db.select({ m: min(trips.startedAt) }).from(trips).get()?.m ?? null;
  if (e === null) return t;
  return t === null ? e : Math.min(e, t);
}

/** Finished trips in a period (a running trip is left out of logs and exports). */
export function finishedTrips(db: AppDb, period: Period): TripRow[] {
  return listTrips(db, period).filter((t) => t.status === 'done' || t.status === 'interrupted');
}

export interface TripSummary {
  workMiles: number;
  personalMiles: number;
  /** Automatic trips still waiting in the Sort queue (P1-2). */
  unsortedMiles: number;
  unsortedCount: number;
}

/** Miles by scope for Reports (Business use = work / all sorted + unsorted miles). Running trips count so far. */
export function tripSummary(db: AppDb, period: Period): TripSummary {
  const out: TripSummary = { workMiles: 0, personalMiles: 0, unsortedMiles: 0, unsortedCount: 0 };
  for (const t of listTrips(db, period)) {
    const mi = metersToMiles(t.distanceM);
    if (t.scope === 'work') out.workMiles += mi;
    else if (t.scope === 'personal') out.personalMiles += mi;
    else {
      out.unsortedMiles += mi;
      out.unsortedCount++;
    }
  }
  return out;
}
