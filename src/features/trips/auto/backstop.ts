// iOS (B-96): "Still on a trip?" and "Trip isn't recording" come from engine checks that need a wake-up. iOS has no
// alarm that starts the app: the wake timer (TripWatcher) only fires while the app runs, and the app stops running
// exactly when recording breaks (killed, location revoked) or may sleep through a long stop. So the two notifications
// are also booked ahead as local notifications with the engine's own identifiers — iOS delivers them even with the
// app gone — and re-booked as GPS fixes arrive (TRIP_TASK), cancelled when the trip ends. When the engine runs first
// it posts the same identifier (no duplicate) and the plan below drops the booking.
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { getActiveTrip } from '@/db/tripsRepo';

import { needsRebook, planBackstops } from './backstopPlan';
import { INITIAL_ENGINE_STATE, type EngineState, type EngineTrip } from './engine';
import { cancelScheduled, NOTIF_SILENT, NOTIF_STILL, scheduleSilent, scheduleStill } from './notifyAuto';
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
        ? { id: active.id, status: active.status, startedBy: active.startedBy, startedAt: active.startedAt, lastPointAt: active.lastPointAt }
        : null;
    // Same key as runner.ts KEY_ENGINE.
    const plan = s.notify.missedTrip ? planBackstops(trip, getKV<EngineState>(db, 'engine', INITIAL_ENGINE_STATE), now) : { still: null, silent: null };
    if (needsRebook(booked.still, plan.still)) {
      booked.still = plan.still;
      if (plan.still === null) await cancelScheduled(NOTIF_STILL);
      else await scheduleStill(plan.still);
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
