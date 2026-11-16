// Keeps the native side (modules/trip-detect AutoConfig) in step with the DB after any trip start / end.
import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { getActiveTrip } from '@/db/tripsRepo';

import { STILL_NOTIFY_MS } from './engine';
import { cancelWake, configureNative, scheduleWake } from './native';

/**
 * Tell the receivers whether a trip is recording (then every activity change reaches JS) and keep one wake-up
 * pending for the end-of-trip / "Still on a trip?" check.
 */
export function syncTripActive(now = Date.now()) {
  const trip = getActiveTrip(db);
  configureNative({ tripActive: !!trip });
  if (!trip) {
    cancelWake();
    return;
  }
  const s = getSettings(db);
  const wait = trip.startedBy === 'auto' ? s.mergeStopMinutes * 60_000 : STILL_NOTIFY_MS;
  scheduleWake(Math.max(now, trip.lastPointAt ?? trip.startedAt) + wait + 30_000);
}
