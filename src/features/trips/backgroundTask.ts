/**
 * Background location task. Must be evaluated at bundle load (imported from the app entry `index.ts`), so the
 * OS can deliver location batches even when Android restarts the JS runtime headless for the foreground service.
 */
import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppRegistry, AppState, Platform } from 'react-native';

import { db } from '@/db/client';
import { ensureMigrated } from '@/db/migrate';
import { getSettings } from '@/db/settingsRepo';
import { appendPoints, getActiveTrip, getTrip } from '@/db/tripsRepo';
import { refreshWidgets } from '@/features/widgets/refresh';

import { addSignalListener, TRIP_DETECT_TASK } from '../../../modules/trip-detect';
import { processAutoSignals, syncAutoDetection } from './auto/runner';
import { TRIP_TASK } from './constants';
import { formatDistance } from './format';
import { cancelLongTripReminder, clearTripNotification, showTripNotification } from './notify';

let lastWidgetAt = 0;

TaskManager.defineTask<{ locations?: LocationObject[] }>(TRIP_TASK, async ({ data, error }) => {
  if (error) return;
  try {
    await ensureMigrated();
  } catch {
    return;
  }
  const active = getActiveTrip(db);
  if (!active) {
    // Trip ended or was discarded while updates were still registered.
    await Location.stopLocationUpdatesAsync(TRIP_TASK).catch(() => {});
    await clearTripNotification();
    await cancelLongTripReminder();
    return;
  }
  if (active.status !== 'running') return;
  // The first batch can carry the OS's cached fix from before this trip started (seen on A13: a trip started 18:06
  // showed "stopped recording at 17:57"); drop anything older than the trip.
  const locations = (data?.locations ?? []).filter((l) => l.timestamp >= active.startedAt);
  if (locations.length === 0) return;
  appendPoints(
    db,
    active.id,
    locations.map((l) => ({
      ts: l.timestamp,
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      accuracy: l.coords.accuracy ?? 999,
      speed: l.coords.speed,
    })),
  );
  const trip = getTrip(db, active.id);
  if (!trip) return;
  const unit = getSettings(db).distanceUnit;
  await showTripNotification(trip, formatDistance(trip.distanceM, unit));
  const now = Date.now();
  if (now - lastWidgetAt > 60_000) {
    lastWidgetAt = now;
    refreshWidgets().catch(() => {});
  }
});

/**
 * S1 automatic trips: the native receivers (activity transitions, van Bluetooth, wake alarms) run this headless task
 * — also with the app closed or locked — to start / end trips. See features/trips/auto/runner.ts.
 */
AppRegistry.registerHeadlessTask(TRIP_DETECT_TASK, () => async () => {
  await ensureMigrated();
  await syncAutoDetection();
  await processAutoSignals();
});

// App start and every return to the foreground: re-check Pro / permissions / registrations and catch up on signals.
const onActive = () => {
  ensureMigrated()
    .then(() => syncAutoDetection())
    .then(() => processAutoSignals())
    .catch(() => {});
};
if (AppState.currentState === 'active') setTimeout(onActive, 2_000);
else if (Platform.OS === 'ios') {
  // B-95: iOS has no headless task. A significant location change relaunches the whole app in the background
  // (JS bundle included) with ~10–30 s to run: process what TripWatcher logged straight away. Android starts JS
  // headless through SundayTripDetect above instead.
  onActive();
}
if (Platform.OS === 'ios') {
  // Each wake-up (location change, wake timer, live CoreMotion update) logs signals and then sends onSignal.
  addSignalListener(() => {
    ensureMigrated()
      .then(() => processAutoSignals())
      .catch(() => {});
  });
}
AppState.addEventListener('change', (s) => {
  if (s === 'active') onActive();
});
