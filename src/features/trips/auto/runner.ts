// Runs the automatic-trip engine against the DB: called by the headless task "SundayTripDetect" (native receivers),
// on app start / foreground, and after the S-07d switch changes. Never throws.
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { getProStatus } from '@/db/proRepo';
import { getSettings } from '@/db/settingsRepo';
import { deleteTrip, getActiveTrip, getTrip, lastMoveAt } from '@/db/tripsRepo';
import { hasPro } from '@/domain/pro';
import { t } from '@/i18n';
import { refreshWidgets } from '@/features/widgets/refresh';

import { autoPausedBy } from '../autoState';
import { endActiveTrip, startGpsTrip } from '../controller';
import { formatDistance } from '../format';
import { classifyTrip } from './classify';
import { INITIAL_ENGINE_STATE, MIN_AUTO_TRIP_M, step, type EngineSignal, type EngineState } from './engine';
import { configureNative, hasActivityPermission, isCharging, isSamsung, nativeHealth, readSignals, scheduleWake, setTransitions } from './native';
import { syncIosBackstops } from './backstop';
import {
  isPresented,
  NOTIF_SILENT,
  NOTIF_STILL,
  notifyAutoPaused,
  notifyAutoSaved,
  notifyProEnded,
  notifySilent,
  notifyStartFailed,
  notifyStill,
  notifyTripEnded,
} from './notifyAuto';
import { finishAutoTrip, getKV, lastParkedPoint, seedStartPoint, setKV, tripEnds } from './repo';
import { routeScopeFor } from './routes';
import { syncTripActive } from './sync';

const KEY_ENGINE = 'engine';
const KEY_FLAGS = 'flags';

interface Flags {
  /** "Automatic trips are off — Pro ended" sent (reset when Pro is back). */
  proEndedNotified: boolean;
  /** "Paused by your phone" sent (reset when healthy again). */
  pausedNotified: boolean;
  /** Last time the engine ran (S-07d "last check 2 min ago"). */
  lastRunAt: number;
}

const DEFAULT_FLAGS: Flags = { proEndedNotified: false, pausedNotified: false, lastRunAt: 0 };

export const getAutoFlags = (): Flags => ({ ...DEFAULT_FLAGS, ...getKV<Partial<Flags>>(db, KEY_FLAGS, {}) });
const setFlags = (patch: Partial<Flags>) => setKV(db, KEY_FLAGS, { ...getAutoFlags(), ...patch });

let running: Promise<void> | null = null;
let again = false;

/**
 * One engine pass. Concurrent calls share the pass in progress, and one more pass follows it: a signal logged after
 * the running pass read the log (iOS: CoreMotion history copied in while JS was already busy) is not left waiting
 * for the next wake-up.
 */
export function processAutoSignals(now = Date.now()): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = runOnce(now)
    .catch((e: unknown) => console.warn('[auto-trip] run failed', e))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        processAutoSignals().catch(() => {});
      }
    });
  return running;
}

function toEngineSignals(sinceMs: number): EngineSignal[] {
  return readSignals(sinceMs) as EngineSignal[];
}

async function runOnce(now: number) {
  const s = getSettings(db);
  const pro = hasPro(getProStatus(db, now));
  const enabled = s.autoTrips && pro;
  const state0 = getKV<EngineState>(db, KEY_ENGINE, INITIAL_ENGINE_STATE);
  // First run: don't replay old history (a 'driving' from last week must not start a trip now).
  const since = state0.seenUntil || now - 60_000;
  const active = getActiveTrip(db);
  const engineTrip =
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
  const signals = toEngineSignals(since + 1);
  const { state, actions } = step({ ...state0, seenUntil: since }, signals, {
    enabled,
    vanAddress: s.vanBtDevice?.address ?? null,
    startOnCharge: s.startOnCharge,
    mergeStopMinutes: s.mergeStopMinutes,
  }, engineTrip, now, isCharging());
  setKV(db, KEY_ENGINE, state);

  for (const a of actions) {
    switch (a.type) {
      case 'start':
        try {
          const row = await startGpsTrip({ startedBy: 'auto', at: a.at, askNotifications: false });
          if (row.startedBy === 'auto' && row.startedAt === a.at) seedDeparture(row.id, a.at, signals);
        } catch {
          await notifyStartFailed();
        }
        break;
      case 'end':
        if (a.startedBy === 'auto') await endAutoTrip(a.at, state);
        else await endDriverTrip(a.at);
        break;
      case 'notifyStill':
        // iOS: the booked backstop (backstop.ts) may already be on screen — don't alert twice.
        if (s.notify.missedTrip && !(Platform.OS === 'ios' && (await isPresented(NOTIF_STILL)))) await notifyStill();
        break;
      case 'notifySilent':
        if (s.notify.missedTrip && !(Platform.OS === 'ios' && (await isPresented(NOTIF_SILENT)))) await notifySilent();
        break;
      case 'wake':
        scheduleWake(a.at);
        break;
    }
  }
  setFlags({ lastRunAt: now });
  await syncIosBackstops();
}

/** A departure wake-up this long after the drive began still belongs to it (iOS logs it ~150 m in). */
export const DEPARTURE_WINDOW_MS = 10 * 60_000;

/**
 * iOS (B-95): the phone left the region around the last parking spot and this drive started → count from that spot.
 * Android never logs 'departure'.
 */
function seedDeparture(tripId: string, startAt: number, signals: EngineSignal[]) {
  const departed = signals.some(
    (s) => s.kind === 'wake' && s.reason === 'departure' && s.at >= startAt - DEPARTURE_WINDOW_MS,
  );
  if (!departed) return;
  const parked = lastParkedPoint(db);
  if (parked && parked.endedAt <= startAt) seedStartPoint(db, tripId, parked);
}

/**
 * Phương 19/11: a Trip the driver started also ends on its own after the merge threshold without moving — saved as it
 * is (never dropped: the driver started it), ending when the vehicle stopped, with "Continue trip" on the notice.
 */
async function endDriverTrip(at: number) {
  const done = await endActiveTrip(at);
  if (!done) return;
  refreshWidgets().catch(() => {});
  const s = getSettings(db);
  await notifyTripEnded(formatDistance(done.distanceM, s.distanceUnit), at, done.id);
}

async function endAutoTrip(at: number, state: EngineState) {
  const done = await endActiveTrip(at);
  if (!done) return;
  if (done.distanceM < MIN_AUTO_TRIP_M) {
    // Not a real drive (car park shuffle, false detection): drop it quietly.
    deleteTrip(db, done.id);
    refreshWidgets().catch(() => {});
    return;
  }
  const s = getSettings(db);
  if (done.classifiedBy === 'user') {
    // The driver already chose ("Mark as personal" while it ran): keep it.
    finishAutoTrip(db, done.id, done.scope, 'user');
    refreshWidgets().catch(() => {});
    return;
  }
  const ends = tripEnds(db, done.id);
  const c = classifyTrip({
    startedAt: done.startedAt,
    endedAt: done.endedAt ?? at,
    routeScope: ends ? routeScopeFor(db, ends.start, ends.end) : null,
    vanConnected: state.vanConnectedAt >= done.startedAt - 10 * 60_000 && state.vanConnectedAt <= (done.endedAt ?? at),
    workHours: s.workHours,
  });
  finishAutoTrip(db, done.id, c.scope, c.by);
  refreshWidgets().catch(() => {});
  if (s.notify.tripAuto) {
    const scopeText = c.scope === 'unsorted' ? t('autoTrip.notif.sortSunday') : c.scope === 'work' ? t('common.work') : t('common.personal');
    await notifyAutoSaved(formatDistance(getTrip(db, done.id)?.distanceM ?? done.distanceM, s.distanceUnit), scopeText, done.id, at);
  }
}

/**
 * Make the native side match the settings + Pro: transitions registered only while automatic trips can run (or an
 * automatic trip is still recording), receivers configured, one-time notices for "Pro ended" / "paused by phone".
 * Called on app start / foreground, from S-07d and from the headless task.
 */
export async function syncAutoDetection(now = Date.now()): Promise<void> {
  try {
    const s = getSettings(db);
    const pro = hasPro(getProStatus(db, now));
    const enabled = s.autoTrips && pro;
    const active = getActiveTrip(db);
    configureNative({
      enabled,
      startOnCharge: s.startOnCharge,
      vanAddress: s.vanBtDevice?.address ?? null,
      tripActive: !!active,
    });
    // Also while any trip records: 'driving' / 'still' drive the end-of-trip and missed-trip checks.
    const wantTransitions = (enabled || !!active) && hasActivityPermission();
    const health = nativeHealth();
    if (wantTransitions && !health?.registered) await setTransitions(true);
    if (!wantTransitions && health?.registered) await setTransitions(false);
    syncTripActive(now);

    const flags = getAutoFlags();
    if (s.autoTrips && !pro && !flags.proEndedNotified) {
      setFlags({ proEndedNotified: true });
      await notifyProEnded();
    } else if (pro && flags.proEndedNotified) setFlags({ proEndedNotified: false });

    const paused = enabled && autoPausedBy(health);
    if (paused && !flags.pausedNotified && s.notify.missedTrip) {
      setFlags({ pausedNotified: true });
      await notifyAutoPaused(isSamsung());
    } else if (!paused && flags.pausedNotified) setFlags({ pausedNotified: false });
  } catch (e) {
    console.warn('[auto-trip] sync failed', e);
  }
}
