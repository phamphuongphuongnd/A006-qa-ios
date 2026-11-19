// iOS (B-96): "Still on a trip?" and "Trip isn't recording" come from engine checks that need a wake-up. iOS has no
// alarm that starts the app: the wake timer (TripWatcher) only fires while the app runs, and the app stops running
// exactly when recording breaks (killed, location revoked) or may sleep through a long stop. So the two notifications
// are also booked ahead as local notifications with the engine's own identifiers — iOS delivers them even with the
// app gone — and re-booked as GPS fixes arrive (TRIP_TASK), cancelled when the trip ends. When the engine runs first
// it posts the same identifier (no duplicate) and the plan below drops the booking.
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { getActiveTrip, lastMoveAt } from '@/db/tripsRepo';
import { formatDistance } from '@/features/trips/format';

import { needsRebook, planBackstops } from './backstopPlan';
import { INITIAL_ENGINE_STATE, type EngineState, type EngineTrip } from './engine';
import { cancelScheduled, NOTIF_AUTO_SAVED, NOTIF_SILENT, NOTIF_STILL, scheduleSilent, scheduleTripEnded } from './notifyAuto';
import { getKV } from './repo';

let booked: { still?: number | null; silent?: number | null } = {};

/** Book / move / cancel the two notifications to match the active trip (iOS only; never throws). */
export async function syncIosBackstops(now = Date.now()): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const s = getSettings(db);
    const active = getActiveTrip(db);
    const trip: EngineTrip | null =
      active && (active.status === 'running' || active.status === 'paused')
        ? {
            id: active.id,
            status: active.status,
            startedBy: active.startedBy,
            startedAt: active.startedAt,
            lastPointAt: active.lastPointAt,
            lastMoveAt: lastMoveAt(db, active),
          }
        : null;
    // Same key as runner.ts KEY_ENGINE.
    const plan = s.notify.missedTrip
      ? planBackstops(trip, getKV<EngineState>(db, 'engine', INITIAL_ENGINE_STATE), now, s.mergeStopMinutes * 60_000)
      : { still: null, silent: null };
    if (needsRebook(booked.still, plan.still)) {
      booked.still = plan.still;
      // Builds before 19/11 booked "Still on a trip?" under its own identifier.
      await cancelScheduled(NOTIF_STILL);
      if (plan.still === null || !trip || !active) await cancelScheduled(NOTIF_AUTO_SAVED);
      else await scheduleTripEnded(plan.still, trip.lastMoveAt ?? trip.startedAt, formatDistance(active.distanceM, s.distanceUnit), trip.id);
    }
    if (needsRebook(booked.silent, plan.silent)) {
      booked.silent = plan.silent;
      if (plan.silent === null) await cancelScheduled(NOTIF_SILENT);
      else await scheduleSilent(plan.silent);
    }
  } catch (e) {
    booked = {};
    console.warn('[auto-trip] backstop failed', e);
  }
}
