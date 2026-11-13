import { and, count, eq, gte, lt } from 'drizzle-orm';

import { taxYearOf } from '@/domain/taxYear';
import type { VehicleCostMethod } from '@/domain/types';
import { methodChangeNeedsConfirm } from '@/domain/vehicleCosts';

import { categories, entries, trips } from './schema';
import { getSettings, updateSettings, type AppSettings } from './settingsRepo';
import type { AppDb } from './types';

/** This tax year already has Work trips or Work entries in vehicle running-cost categories. */
export function hasWorkVehicleDataThisYear(db: AppDb, now = Date.now()): boolean {
  const region = getSettings(db).region ?? 'UK';
  const y = taxYearOf(now, region);
  const tripN =
    db
      .select({ n: count() })
      .from(trips)
      .where(and(eq(trips.scope, 'work'), gte(trips.startedAt, y.start), lt(trips.startedAt, y.end)))
      .get()?.n ?? 0;
  if (tripN > 0) return true;
  const entryN =
    db
      .select({ n: count() })
      .from(entries)
      .innerJoin(categories, eq(entries.categoryId, categories.id))
      .where(
        and(
          eq(entries.scope, 'work'),
          eq(categories.vehicleRunningCost, true),
          gte(entries.occurredAt, y.start),
          lt(entries.occurredAt, y.end),
        ),
      )
      .get()?.n ?? 0;
  return entryN > 0;
}

export type VehicleMethodChange =
  | { status: 'saved'; settings: AppSettings }
  | { status: 'unchanged' }
  /** Show "Change how you claim vehicle costs?"; call again with `confirmed: true` on "Change". */
  | { status: 'needs_confirm' };

/** The Settings "Vehicle costs" row and onboarding S-01c write through this. */
export function changeVehicleCostMethod(
  db: AppDb,
  to: VehicleCostMethod,
  opts: { confirmed?: boolean; now?: number } = {},
): VehicleMethodChange {
  const from = getSettings(db).vehicleCostMethod;
  if (from === to) return { status: 'unchanged' };
  if (!opts.confirmed && methodChangeNeedsConfirm(from, to, hasWorkVehicleDataThisYear(db, opts.now))) {
    return { status: 'needs_confirm' };
  }
  return { status: 'saved', settings: updateSettings(db, { vehicleCostMethod: to }) };
}
