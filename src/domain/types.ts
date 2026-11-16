export type Region = 'UK' | 'US';
export type Currency = 'GBP' | 'USD';
export type EntryType = 'income' | 'expense';
export type Scope = 'work' | 'personal';

/** Money is always stored as an integer number of minor units (pence / cents). */
export type Minor = number;

/** Half-open time range [start, end) in epoch milliseconds. */
export interface Period {
  start: number;
  end: number;
}

export const currencyOf = (region: Region): Currency => (region === 'UK' ? 'GBP' : 'USD');

// ---- Bản 2 (product.md §8) ----

/** A Trip may wait in the Sort queue (P1-2): automatic trips the app could not classify for sure. */
export type TripScope = Scope | 'unsorted';

/**
 * Where a Trip came from: recorded by GPS, typed in (odometer / distance / A → B), or added as an estimate for miles the
 * app missed — a Missing trip between two GPS trips (Q26) or miles missing from an Odometer check (Q27). Label "Estimated".
 */
export type TripSource = 'gps' | 'manual' | 'gap';

/** How a GPS trip was started. Manual (odometer / distance) trips have none. */
export type TripStartedBy = 'user' | 'auto' | 'nfc';

/** Why an automatic trip got its scope without the driver (P1-2). */
export type TripClassifiedBy = 'bluetooth' | 'route' | 'work_hours' | 'user';

/** How an Entry was created. */
export type EntrySource = 'manual' | 'recurring';

/** F-10 repeat options: "Weekly" · "Every 4 weeks" · "Monthly" · "Yearly". */
export type RecurringFreq = 'weekly' | 'four_weekly' | 'monthly' | 'yearly';

/** X2 / Q24: how the driver claims vehicle costs. 'unsure' counts like 'mileage' and Reports nudges to choose. */
export type VehicleCostMethod = 'mileage' | 'actual' | 'unsure';

/** ProState.entitlement (product.md §8). */
export type ProEntitlement = 'none' | 'trial' | 'active' | 'expired';

/** Work/Personal pickers need a side: an Unsorted trip shows `fallback` until the driver chooses. */
export const pickerScope = (s: TripScope, fallback: Scope = 'work'): Scope => (s === 'unsorted' ? fallback : s);
