/**
 * Trip lifecycle: repository writes + GPS recording + notifications + widget refresh, in one place.
 * Screens (Active trip, Home card, Miles) call these instead of the repository directly.
 */
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { getSettings } from '@/db/settingsRepo';
import {
  deleteTrip,
  endTrip,
  getActiveTrip,
  getTrip,
  markInterrupted,
  pauseTrip,
  resumeTrip,
  startTrip,
  updateTrip,
} from '@/db/tripsRepo';
import type { Scope } from '@/domain/types';
import { t } from '@/i18n';
import { refreshWidgets } from '@/features/widgets/refresh';

import './backgroundTask';
import { NOTIF_COLOR, TRIP_TASK } from './constants';
import { formatDistance } from './format';
import {
  cancelLongTripReminder,
  clearTripNotification,
  ensureNotificationPermission,
  scheduleLongTripReminder,
  showTripNotification,
} from './notify';

const distanceText = (trip: TripRow) => formatDistance(trip.distanceM, getSettings(db).distanceUnit);

export type StartBlocker = 'gps_off' | 'needs_permission' | null;

/** What stands between the user and a recording trip. Background ("all the time") is optional on Android. */
export async function startBlocker(): Promise<StartBlocker> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return 'needs_permission';
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

/** Starts a GPS trip (or returns the one already running). Throws if recording can't start. */
export async function startGpsTrip(): Promise<TripRow> {
  const existing = getActiveTrip(db);
  if (existing) return existing;
  await ensureNotificationPermission();
  const trip = startTrip(db, 'work');
  try {
    await beginRecording();
  } catch (e) {
    deleteTrip(db, trip.id);
    throw e;
  }
  await showTripNotification(trip, distanceText(trip), true);
  await scheduleLongTripReminder(trip);
  refreshWidgets().catch(() => {});
  return trip;
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

/** Ends the active trip; it is saved immediately (the sheet then edits scope / purpose). */
export async function endActiveTrip(): Promise<TripRow | undefined> {
  const trip = getActiveTrip(db);
  if (!trip) return undefined;
  const done = endTrip(db, trip.id);
  await stopRecording();
  await clearTripNotification();
  await cancelLongTripReminder();
  refreshWidgets().catch(() => {});
  return done;
}

export function saveEndedTrip(id: string, scope: Scope, purpose: string) {
  updateTrip(db, id, { scope, purpose });
}

export async function discardTrip(id: string) {
  const trip = getTrip(db, id);
  deleteTrip(db, id);
  if (trip && (trip.status === 'running' || trip.status === 'paused')) {
    await stopRecording();
    await clearTripNotification();
    await cancelLongTripReminder();
  }
  refreshWidgets().catch(() => {});
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
  if (started && fg?.granted) {
    await showTripNotification(trip, distanceText(trip));
    return false;
  }
  markInterrupted(db, trip.id);
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
