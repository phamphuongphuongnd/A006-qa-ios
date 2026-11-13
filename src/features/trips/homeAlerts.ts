import { useInterruptedTrip } from './hooks';

/**
 * Trip signals for the Home alert card (features/home/alerts.ts). Owned by S1: fill `autoPaused` (the OS stopped
 * automatic trips — battery saving / permission revoked) and `noTripsDays` (work days with entries but no trips,
 * short names like "Tue") from the trip-detect module. Home draws the cards; S1 doesn't edit Home.
 */
export interface TripAlertSignals {
  tripStopped: boolean;
  autoPaused: boolean;
  /** Samsung phones get the "Samsung battery saving…" wording. */
  samsung: boolean;
  noTripsDays: string[];
}

export function useTripAlertSignals(): TripAlertSignals {
  'use no memo';
  const interrupted = useInterruptedTrip();
  return { tripStopped: !!interrupted, autoPaused: false, samsung: false, noTripsDays: [] };
}

/** "Not driving" on the no-trips card. S1: remember the days so the card doesn't come back for them. */
export function dismissNoTrips(_days: string[]): void {}
