import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listEntries } from '@/db/entriesRepo';
import type { AppSettings } from '@/db/settingsRepo';
import { businessTripMiles } from '@/db/tripsRepo';
import { buildReport } from '@/domain/report';
import { currencyOf, type Region } from '@/domain/types';
import { businessUse, vehicleTreatment } from '@/domain/vehicleCosts';
import { useLive } from '@/state/useLive';

import type { ReportPeriod } from './period';
import { tripSummary } from './queries';
import { mileageWindow, monthlySeries, rangeMileageEstimate, ratesLabel } from './series';

/**
 * Everything S-09 shows for one period. Re-runs after any DB write. The vehicle cost method (X2 / Q24) decides
 * whether the mileage allowance is an expense (mileage rate / not sure) or the business-use share is shown (actual).
 */
export function useReport(period: ReportPeriod, settings: AppSettings, region: Region) {
  'use no memo';
  const entries = useLive(() => listEntries(db, { period }), [period.start, period.end], ['entries', 'receipts']);
  const categories = useLive(() => listCategories(db, { includeHidden: true }), [], ['categories']);
  const win = mileageWindow(period.start, period.end, region);
  const unit = settings.distanceUnit;
  const trips = useLive(
    // `summary` (miles) prices the allowance and feeds the files; `shown` is the same trips in the display unit (B-154).
    () => ({ summary: tripSummary(db, period), shown: tripSummary(db, period, unit), work: businessTripMiles(db, win) }),
    [period.start, period.end, win.start, unit],
    ['trips'],
  );
  const rates = settings.mileageRates[region];
  const method = settings.vehicleCostMethod;
  const treatment = vehicleTreatment(method);
  const mileageEstimateMinor = rangeMileageEstimate(trips.work, period.start, period.end, rates, region);
  const s = trips.summary;
  const report = buildReport(entries, categories, period, {
    vehicle: { method, mileageMinor: mileageEstimateMinor, workMiles: s.workMiles, region },
  });
  // The chart leaves out what the totals leave out (running costs covered by the mileage rate).
  const running = new Set(categories.filter((c) => c.vehicleRunningCost).map((c) => c.id));
  const months = monthlySeries(
    treatment.excludesRunningCosts ? entries.filter((e) => !(e.type === 'expense' && e.categoryId && running.has(e.categoryId))) : entries,
    period,
  );
  return {
    entries,
    categories,
    report,
    months,
    currency: currencyOf(region),
    method,
    treatment,
    miles: s.workMiles,
    trips: s,
    /** Trip totals in the display unit (mi or km), each trip fixed to 0.1 then added: what Reports prints. */
    shown: trips.shown,
    businessUse: businessUse(trips.shown.workMiles, trips.shown.workMiles + trips.shown.personalMiles + trips.shown.unsortedMiles),
    mileageEstimateMinor,
    ratesText: ratesLabel(rates, currencyOf(region), period.start, period.end),
  };
}
