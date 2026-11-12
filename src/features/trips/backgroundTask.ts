/**
 * Background location task. Must be evaluated at bundle load (imported from the app entry `index.ts`), so the
 * OS can deliver location batches even when Android restarts the JS runtime headless for the foreground service.
 */
import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { appendPoints, getActiveTrip, getTrip } from '@/db/tripsRepo';
import { refreshWidgets } from '@/features/widgets/refresh';

import { TRIP_TASK } from './constants';
import { formatDistance } from './format';
import { cancelLongTripReminder, clearTripNotification, showTripNotification } from './notify';

let lastWidgetAt = 0;

TaskManager.defineTask<{ locations?: LocationObject[] }>(TRIP_TASK, async ({ data, error }) => {
  if (error) return;
  const active = getActiveTrip(db);
  if (!active) {
    // Trip ended or was discarded while updates were still registered.
    await Location.stopLocationUpdatesAsync(TRIP_TASK).catch(() => {});
    await clearTripNotification();
    await cancelLongTripReminder();
    return;
  }
  if (active.status !== 'running') return;
  const locations = data?.locations ?? [];
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
