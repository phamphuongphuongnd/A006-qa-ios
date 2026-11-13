import type { Minor, VehicleCostMethod } from './types';

/**
 * Vehicle cost method (X2, Q24, product.md §5.3). Pure rules shared by Settings (S-15), onboarding (S-01c),
 * Reports and exports (S5). Data side: `src/db/vehicleCostsRepo.ts`.
 *
 * - mileage: the mileage allowance is claimed; entries in "vehicle running cost" categories (fuel, repairs,
 *   insurance & road tax, lease) are still logged and sorted but are NOT added to totals / tax lines / MTD files —
 *   Reports shows them as "Covered by mileage rate". Parking, tolls and congestion are added on top.
 * - actual: no mileage allowance; every vehicle entry counts; Reports shows the business-use share of miles.
 * - unsure: counted exactly like mileage, and Reports nudges the driver to choose.
 */
export interface VehicleTreatment {
  /** Add the mileage allowance to "Car, van and travel expenses" / "Line 9". */
  claimsMileage: boolean;
  /** Leave running-cost entries out of totals (show them in the "Covered by mileage rate" group instead). */
  excludesRunningCosts: boolean;
  /** Show "Business use 87% · 30,450 of 35,000 mi" and the accountant note. */
  showsBusinessUse: boolean;
  /** Reports asks the driver to choose a method. */
  nudgeToChoose: boolean;
}

export const VEHICLE_COST_METHODS: readonly VehicleCostMethod[] = ['mileage', 'actual', 'unsure'];

export const effectiveVehicleMethod = (m: VehicleCostMethod): 'mileage' | 'actual' => (m === 'actual' ? 'actual' : 'mileage');

export function vehicleTreatment(m: VehicleCostMethod): VehicleTreatment {
  const actual = effectiveVehicleMethod(m) === 'actual';
  return { claimsMileage: !actual, excludesRunningCosts: !actual, showsBusinessUse: actual, nudgeToChoose: m === 'unsure' };
}

/** True when this entry's category is covered by the mileage rate under method `m` (left out of totals). */
export const isCoveredByMileage = (category: { vehicleRunningCost: boolean } | null | undefined, m: VehicleCostMethod): boolean =>
  !!category?.vehicleRunningCost && vehicleTreatment(m).excludesRunningCosts;

/** Splits rows into what counts towards totals and what the mileage rate already covers. */
export function splitCoveredByMileage<T extends { amountMinor: Minor; vehicleRunningCost: boolean }>(
  rows: readonly T[],
  m: VehicleCostMethod,
): { counted: T[]; covered: T[]; coveredMinor: Minor } {
  const counted: T[] = [];
  const covered: T[] = [];
  let coveredMinor = 0;
  for (const r of rows) {
    if (isCoveredByMileage(r, m)) {
      covered.push(r);
      coveredMinor += r.amountMinor;
    } else counted.push(r);
  }
  return { counted, covered, coveredMinor };
}

/** Business-use share for the actual-costs method; null when no miles were logged. Percent rounded to whole. */
export function businessUse(workMiles: number, totalMiles: number): { share: number; percent: number } | null {
  if (!(totalMiles > 0)) return null;
  const share = Math.min(1, Math.max(0, workMiles / totalMiles));
  return { share, percent: Math.round(share * 100) };
}

/**
 * "Change how you claim vehicle costs?" (§5.3): asked when switching between two real methods after this tax year
 * already has work vehicle data (HMRC expects the same method for the same vehicle). Choosing for the first time
 * (from 'unsure') or switching to 'unsure' never asks.
 */
export function methodChangeNeedsConfirm(from: VehicleCostMethod, to: VehicleCostMethod, hasWorkVehicleDataThisYear: boolean): boolean {
  if (from === to || from === 'unsure' || to === 'unsure') return false;
  return hasWorkVehicleDataThisYear;
}
