import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listEntries } from '@/db/entriesRepo';
import type { AppSettings } from '@/db/settingsRepo';
import { businessTripMiles, mileageTotals } from '@/db/tripsRepo';
import { buildReport } from '@/domain/report';
import { currencyOf, type Region } from '@/domain/types';
import { useLive } from '@/state/useLive';

import type { ReportPeriod } from './period';
import { monthlySeries, periodMileageEstimate, ratesLabel } from './series';

/** Everything S-09 shows for one period. Re-runs after any DB write. */
export function useReport(period: ReportPeriod, settings: AppSettings, region: Region) {
  const entries = useLive(() => listEntries(db, { period }));
  const categories = useLive(() => listCategories(db, { includeHidden: true }));
  const miles = useLive(() => ({ inPeriod: mileageTotals(db, period).work, yearTrips: businessTripMiles(db, period.year) }));
  const report = buildReport(entries, categories, period);
  const months = monthlySeries(entries, period);
  const rates = settings.mileageRates[region];
  return {
    entries,
    categories,
    report,
    months,
    currency: currencyOf(region),
    miles: miles.inPeriod,
    mileageEstimateMinor: periodMileageEstimate(miles.yearTrips, period.start, period.end, rates),
    ratesText: ratesLabel(rates, currencyOf(region), period.start, period.end),
  };
}
