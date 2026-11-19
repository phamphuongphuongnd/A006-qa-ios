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
import { appendPoints, getActiveTrip, getTrip, lastMoveAt } from '@/db/tripsRepo';
import { refreshWidgets } from '@/features/widgets/refresh';

import { addSignalListener, TRIP_DETECT_TASK } from '../../../modules/trip-detect';
import { syncIosBackstops } from './auto/backstop';
import type { EngineState } from './auto/engine';
import { hasActivityPermission, logDiagnostic } from './auto/native';
import { getKV } from './auto/repo';
import { processAutoSignals, syncAutoDetection } from './auto/runner';
import { TRIP_TASK } from './constants';
import { restoreRecording, syncGpsMode } from './controller';
import { formatDistance } from './format';
import { cancelLongTripReminder, clearTripNotification, showTripNotification } from './notify';

let lastWidgetAt = 0;
/** Engine pass from the GPS task (Phương 19/11): a Trip standing still ends on time even if no alarm fires. */
let lastEngineAt = 0;
/** B-131: GPS rate check (every batch while parked — batches are 30 s apart then — at most every 20 s while driving). */
let lastGpsModeAt = 0;

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
  if (Platform.OS === 'ios' && active.startedBy === 'auto') {
    // B-95 backstop: the end-of-trip wake timer should have ended an automatic trip that stood still this long. If it
    // didn't fire (phone asleep), let the engine end it now — before fixes of the next drive join it.
    const mergeMs = getSettings(db).mergeStopMinutes * 60_000;
    if (Date.now() - lastMoveAt(db, active) >= mergeMs) {
      await processAutoSignals();
      if (getActiveTrip(db)?.id !== active.id) return;
    }
  }
  // The first batch can carry the OS's cached fix from before this trip started (seen on A13: a trip started 18:06
  // showed "stopped recording at 17:57"); drop anything older than the trip.
  const locations = (data?.locations ?? []).filter((l) => l.timestamp >= active.startedAt);
  if (locations.length === 0) return;
  // Phương 19/11: when the motion sensor says the phone is still (and the driver allowed it), GPS wander adds nothing.
  const engine = getKV<EngineState | null>(db, 'engine', null);
  const sensorStill = engine?.activity === 'still' && hasActivityPermission();
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
    { sensorStill },
  );
  // iOS (B-96): move the booked "Still on a trip?" / "Trip isn't recording" past this fix.
  if (Platform.OS === 'ios') await syncIosBackstops();
  const trip = getTrip(db, active.id);
  if (!trip) return;
  const unit = getSettings(db).distanceUnit;
  await showTripNotification(trip, formatDistance(trip.distanceM, unit));
  const now = Date.now();
  if (now - lastEngineAt > 60_000) {
    lastEngineAt = now;
    processAutoSignals().catch(() => {});
  }
  if (now - lastGpsModeAt > 20_000) {
    lastGpsModeAt = now;
    syncGpsMode(now).catch(() => {});
  }
  if (now - lastWidgetAt > 60_000) {
    lastWidgetAt = now;
    refreshWidgets().catch(() => {});
  }
});

/**
 * S1 automatic trips: the native receivers (activity transitions, van Bluetooth, wake alarms) run this headless task
 * — also with the app closed or locked — to start / end trips. See features/trips/auto/runner.ts.
 */
AppRegistry.registerHeadlessTask(TRIP_DETECT_TASK, () => async (data?: { reason?: string }) => {
  await ensureMigrated();
  // B-129: app updated / phone restarted mid-trip → the trip records again (logged for "Share trip diagnostics").
  if (data?.reason === 'restart') {
    await restoreRecording()
      .then(() => logDiagnostic('restore_ok', { screen: String(AppState.currentState) }))
      .catch((e) => logDiagnostic('restore_failed', { error: String((e as Error)?.message ?? e).slice(0, 200) }));
  }
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
