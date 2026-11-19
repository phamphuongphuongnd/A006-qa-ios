/**
 * Trip lifecycle: repository writes + GPS recording + notifications + widget refresh, in one place.
 * Screens (Active trip, Home card, Miles) call these instead of the repository directly.
 */
import { eq } from 'drizzle-orm';
import * as Location from 'expo-location';
import { AppState, Linking, Platform } from 'react-native';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { getSettings } from '@/db/settingsRepo';
import {
  deleteTrip,
  endTrip,
  getActiveTrip,
  getTrip,
  lastMoveAt,
  markInterrupted,
  pauseTrip,
  reopenTrip,
  resumeTrip,
  startTrip,
  updateTrip,
} from '@/db/tripsRepo';
import { trips } from '@/db/schema';
import type { Scope, TripStartedBy } from '@/domain/types';
import { t } from '@/i18n';
import { refreshWidgets } from '@/features/widgets/refresh';

import { allowBackgroundLocationStart } from './auto/native';
import { rebuildStops, setTripScope } from './auto/repo';
import { syncTripActive } from './auto/sync';
import './backgroundTask';
import { CONTINUE_WINDOW_MS, NOTIF_COLOR, TRIP_TASK } from './constants';
import { formatDistance } from './format';
import {
  cancelLongTripReminder,
  clearTripNotification,
  ensureNotificationPermission,
  scheduleLongTripReminder,
  showTripNotification,
} from './notify';

const distanceText = (trip: TripRow) => formatDistance(trip.distanceM, getSettings(db).distanceUnit);

export type StartBlocker = 'gps_off' | 'needs_permission' | 'needs_precise' | null;

/**
 * QA-100 MOD-1: "Approximate" (Android) / Precise off (iOS) still counts as granted, but fixes are ~1–3 km apart and
 * fail the accuracy filter (`MAX_ACCURACY_M`) — the trip sat on "Finding GPS…" and saved 0.0 mi without a word.
 */
export const isApproximate = (p: Pick<Location.LocationPermissionResponse, 'granted' | 'android' | 'ios'> | null | undefined): boolean =>
  !!p?.granted && (p.android?.accuracy === 'coarse' || p.ios?.accuracy === 'reduced');

/** What stands between the user and a recording trip. Background ("all the time") is optional on Android. */
export async function startBlocker(): Promise<StartBlocker> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return 'needs_permission';
  if (isApproximate(fg)) return 'needs_precise';
  if (!(await Location.hasServicesEnabledAsync())) return 'gps_off';
  return null;
}

/** Android: 'Allow all the time' not granted yet → show S-07a step 2 once. iOS asks by itself later. */
export async function needsBackgroundStep(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const bg = await Location.getBackgroundPermissionsAsync();
  return !bg.granted;
}

async function beginRecording() {
  // A13-13: an automatic start from Van Bluetooth / activity recognition runs with no screen open.
  if (AppState.currentState !== 'active') allowBackgroundLocationStart();
  await Location.startLocationUpdatesAsync(TRIP_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5_000,
    distanceInterval: 15,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: t('trip.notifServiceTitle'),
      notificationBody: t('trip.notifServiceBody'),
      notificationColor: NOTIF_COLOR,
      killServiceOnDestroy: false,
    },
  });
}

async function stopRecording() {
  if (await Location.hasStartedLocationUpdatesAsync(TRIP_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TRIP_TASK).catch(() => {});
  }
}

/**
 * Starts a GPS trip (or returns the one already running). Throws if recording can't start.
 * Automatic trips (S1) pass `startedBy: 'auto'`, a back-dated `at` and start Unsorted; NFC taps pass 'nfc'.
 */
export async function startGpsTrip(opts: { startedBy?: TripStartedBy; at?: number; askNotifications?: boolean } = {}): Promise<TripRow> {
  const existing = getActiveTrip(db);
  if (existing) return existing;
  const startedBy = opts.startedBy ?? 'user';
  if (opts.askNotifications !== false) await ensureNotificationPermission();
  const trip = startTrip(db, 'work', opts.at ?? Date.now(), startedBy);
  if (startedBy === 'auto') {
    // Work / Personal is decided when it ends (P1-2).
    db.update(trips).set({ scope: 'unsorted' }).where(eq(trips.id, trip.id)).run();
  }
  try {
    await beginRecording();
  } catch (e) {
    deleteTrip(db, trip.id);
    throw e;
  }
  const row = getTrip(db, trip.id) ?? trip;
  await showTripNotification(row, distanceText(row), true);
  await scheduleLongTripReminder(row);
  syncTripActive();
  refreshWidgets().catch(() => {});
  return row;
}

export async function pauseActiveTrip() {
  const trip = getActiveTrip(db);
  if (!trip || trip.status !== 'running') return;
  pauseTrip(db, trip.id);
  await stopRecording();
  const now = getTrip(db, trip.id);
  if (now) await showTripNotification(now, distanceText(now), true);
  refreshWidgets().catch(() => {});
}

/**
 * "Continue trip" on the notice of a Trip that ended on its own (Phương 19/11): the same Trip records again, if it
 * ended within CONTINUE_WINDOW_MS and no other Trip has started since. False when it can't be continued.
 */
export async function continueTrip(tripId: string, now = Date.now()): Promise<boolean> {
  const trip = getTrip(db, tripId);
  if (!trip || trip.status !== 'done' || trip.endedAt === null || now - trip.endedAt > CONTINUE_WINDOW_MS) return false;
  if (getActiveTrip(db)) return false;
  reopenTrip(db, trip.id, now);
  try {
    await beginRecording();
  } catch (e) {
    endTrip(db, trip.id, trip.endedAt);
    throw e;
  }
  const row = getTrip(db, trip.id);
  if (row) await showTripNotification(row, distanceText(row), true);
  syncTripActive();
  refreshWidgets().catch(() => {});
  return true;
}

/**
 * B-129 (A13): after an app update or a reboot the running trip's GPS stayed off until the app was opened, while its
 * notice still said recording. The native receiver runs the task with reason 'restart': start recording again.
 */
export async function restoreRecording() {
  const trip = getActiveTrip(db);
  if (!trip || trip.status !== 'running') return;
  // Registering again restarts the location updates and their foreground service (no-op while already recording).
  await beginRecording();
  await showTripNotification(trip, distanceText(trip), true);
}

export async function resumeActiveTrip() {
  const trip = getActiveTrip(db);
  if (!trip || trip.status !== 'paused') return;
  resumeTrip(db, trip.id);
  try {
    await beginRecording();
  } catch (e) {
    pauseTrip(db, trip.id);
    throw e;
  }
  const now = getTrip(db, trip.id);
  if (now) await showTripNotification(now, distanceText(now), true);
  refreshWidgets().catch(() => {});
}

/**
 * Ends the active trip; it is saved immediately (the sheet then edits scope / purpose).
 * `at`: end time when it is not now ("Still on a trip?" → End trip ends when the vehicle stopped).
 */
export async function endActiveTrip(at?: number): Promise<TripRow | undefined> {
  const trip = getActiveTrip(db);
  if (!trip) {
    // "End trip" on a notification whose trip is gone (restore / delete all): still clear GPS + notifications (B-18).
    await stopOrphanRecording();
    return undefined;
  }
  // Not really moved for the merge threshold (GPS wander doesn't count — Phương 19/11): the trip ends when the vehicle
  // stopped (F-12).
  const now = Date.now();
  const lastMove = lastMoveAt(db, trip);
  const endAt = at ?? (trip.status === 'running' && now - lastMove >= getSettings(db).mergeStopMinutes * 60_000 ? lastMove : now);
  const done = endTrip(db, trip.id, endAt);
  await stopRecording();
  await clearTripNotification();
  await cancelLongTripReminder();
  syncTripActive();
  if (done) rebuildStops(db, done.id);
  refreshWidgets().catch(() => {});
  return done;
}

export function saveEndedTrip(id: string, scope: Scope, purpose: string) {
  const t = getTrip(db, id);
  if (t && t.scope !== scope) setTripScope(db, id, scope);
  updateTrip(db, id, { scope, purpose });
}

export async function discardTrip(id: string) {
  const trip = getTrip(db, id);
  deleteTrip(db, id);
  if (trip && (trip.status === 'running' || trip.status === 'paused')) {
    await stopRecording();
    await clearTripNotification();
    await cancelLongTripReminder();
    syncTripActive();
  }
  refreshWidgets().catch(() => {});
}

/**
 * GPS still recording but no running/paused trip left in the DB (Delete all data, Restore backup) → stop recording
 * and clear the trip notifications. Called after DB changes.
 */
export async function stopOrphanRecording() {
  if (getActiveTrip(db)) return;
  // The background task may already have stopped the updates itself, so clear the notifications either way (B-18).
  await stopRecording();
  await clearTripNotification();
  await cancelLongTripReminder();
}

/**
 * App start / return to foreground: a running trip whose recording silently stopped (OS killed the service,
 * permission revoked, location turned off for good) becomes "interrupted" so Home / Miles can say so.
 * Returns true when it marked a trip.
 */
export async function detectInterruptedTrip(): Promise<boolean> {
  const trip = getActiveTrip(db);
  if (!trip) {
    await stopRecording();
    return false;
  }
  if (trip.status === 'paused') {
    await showTripNotification(trip, distanceText(trip));
    return false;
  }
  const [started, fg] = await Promise.all([
    Location.hasStartedLocationUpdatesAsync(TRIP_TASK).catch(() => false),
    Location.getForegroundPermissionsAsync().catch(() => null),
  ]);
  // Switched to approximate mid-trip counts as stopped recording (MOD-1): nothing usable arrives any more.
  if (started && fg?.granted && !isApproximate(fg)) {
    await showTripNotification(trip, distanceText(trip));
    return false;
  }
  markInterrupted(db, trip.id);
  syncTripActive();
  await stopRecording();
  await clearTripNotification();
  await cancelLongTripReminder();
  refreshWidgets().catch(() => {});
  return true;
}

/** Location services switch (Android opens the Location page; iOS can only open the app's settings). */
export async function openLocationSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    } catch {
      // fall through
    }
  }
  await Linking.openSettings();
}
