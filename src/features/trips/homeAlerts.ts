import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { useNow } from '@/features/entries/useNow';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';

import { dayStart, noTripsDayKeys, noTripsDays } from './auto/missed';
import { isSamsung, nativeHealth } from './auto/native';
import { activityTimes, getKV, setKV } from './auto/repo';
import { autoTripState } from './autoState';
import { useInterruptedTrip } from './hooks';

/**
 * Trip signals for the Home alert card (features/home/alerts.ts). Home draws the cards; S1 fills them:
 * `autoPaused` (the OS stopped automatic trips — battery saving / permission revoked) and `noTripsDays`
 * (≥ 2 work days with entries but no trips, short names like "Tue"; Home card only, no push).
 */
export interface TripAlertSignals {
  tripStopped: boolean;
  autoPaused: boolean;
  /** Samsung phones get the "Samsung battery saving…" wording. */
  samsung: boolean;
  noTripsDays: string[];
}

const KEY_DISMISSED = 'noTripsDismissed';

function noTripsInput(now: number) {
  const from = dayStart(now, 8);
  const { entryTimes, tripTimes } = activityTimes(db, from, dayStart(now));
  return { now, entryTimes, tripTimes, workHours: getSettings(db).workHours, dismissed: getKV<string[]>(db, KEY_DISMISSED, []) };
}

export function useTripAlertSignals(): TripAlertSignals {
  'use no memo';
  const interrupted = useInterruptedTrip();
  const { settings } = useSettings();
  const { pro } = usePro();
  // Re-read the phone's state every minute and on any trip / entry change.
  const now = useNow(60_000);
  const today = dayStart(now);
  const days = useLive(() => noTripsDays(noTripsInput(Date.now())), [today], ['entries', 'trips', 'settings']);
  const paused = autoTripState(settings, pro, nativeHealth()) === 'paused';
  return { tripStopped: !!interrupted, autoPaused: paused, samsung: paused && isSamsung(), noTripsDays: days };
}

/** "Not driving" on the no-trips card: the days in the window are answered and don't come back. */
export function dismissNoTrips(_days: string[]): void {
  const input = noTripsInput(Date.now());
  setKV(db, KEY_DISMISSED, [...new Set([...input.dismissed, ...noTripsDayKeys(input)])].slice(-30));
}
