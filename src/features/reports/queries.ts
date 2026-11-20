import { min } from 'drizzle-orm';

import { entries, trips, type TripRow } from '@/db/schema';
import { listTrips } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { metersToMiles, toTenths } from '@/domain/mileage';
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

/**
 * Miles by scope for Reports (Business use = work / all sorted + unsorted miles). Running trips count so far.
 * B-154: each trip is fixed to 0.1 (mi, or km with `unit: 'km'` for the screen) and the fixed values are added up in
 * whole tenths, so the totals equal the trip rows in the CSV / PDF added up. Fields keep the "Miles" names in km too.
 */
export function tripSummary(db: AppDb, period: Period, unit: 'mi' | 'km' = 'mi'): TripSummary {
  const tenths = { work: 0, personal: 0, unsorted: 0 };
  let unsortedCount = 0;
  for (const t of listTrips(db, period)) {
    const v = toTenths(unit === 'km' ? t.distanceM / 1000 : metersToMiles(t.distanceM));
    if (t.scope === 'work') tenths.work += v;
    else if (t.scope === 'personal') tenths.personal += v;
    else {
      tenths.unsorted += v;
      unsortedCount++;
    }
  }
  return { workMiles: tenths.work / 10, personalMiles: tenths.personal / 10, unsortedMiles: tenths.unsorted / 10, unsortedCount };
}
