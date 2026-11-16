// Pure (no DB / native / timers): the automatic-trip decision step (P1-1, F-12). The runner feeds it the detection
// signals logged since the last run and applies the actions it returns.

export type Activity = 'driving' | 'walking' | 'cycling' | 'running' | 'still' | 'tilting' | 'unknown';

/** A detection signal as logged by modules/trip-detect (plus 'wake' alarms and 'boot'). */
export type EngineSignal =
  | { kind: 'activity' | 'sample'; activity: Activity; transition?: 'enter' | 'exit'; confidence?: number; at: number; eventAt?: number }
  | { kind: 'bt_connected' | 'bt_disconnected'; address: string | null; at: number }
  | { kind: 'power_connected' | 'power_disconnected' | 'wake' | 'boot'; at: number };

/** Persisted between runs (features/trips/auto/store.ts). */
export interface EngineState {
  /** Signals at or before this were handled. */
  seenUntil: number;
  /** Latest activity the phone entered (transition enter / confident sample) and when. */
  activity: Activity | null;
  activityAt: number;
  /** Last time the phone left 'still' / 'walking' (backdates an automatic start). */
  movedAt: number;
  /** Last connect of the chosen van Bluetooth device (classification: "Bluetooth van" → Work). */
  vanConnectedAt: number;
  /** "Still on a trip?" / "Trip isn't recording" already sent for this trip at this last-move time. */
  stillNotifiedFor: number;
  silentNotifiedFor: number;
}

export const INITIAL_ENGINE_STATE: EngineState = {
  seenUntil: 0,
  activity: null,
  activityAt: 0,
  movedAt: 0,
  vanConnectedAt: 0,
  stillNotifiedFor: 0,
  silentNotifiedFor: 0,
};

export interface EngineConfig {
  /** settings.autoTrips && Pro. Running automatic trips still end on their own when this turns off. */
  enabled: boolean;
  vanAddress: string | null;
  startOnCharge: boolean;
  mergeStopMinutes: number;
}

export interface EngineTrip {
  id: string;
  status: 'running' | 'paused';
  startedBy: 'user' | 'auto' | 'nfc' | null;
  startedAt: number;
  /** Last GPS fix that was kept (fixes while standing still are dropped), i.e. last time the vehicle moved. */
  lastPointAt: number | null;
}

export type EngineAction =
  | { type: 'start'; at: number; reason: 'motion' | 'bluetooth' | 'charging' }
  | { type: 'end'; tripId: string; at: number }
  | { type: 'notifyStill'; tripId: string; since: number }
  | { type: 'notifySilent'; tripId: string; since: number }
  | { type: 'wake'; at: number };

/** Manual trip standing still this long → "Still on a trip?" (F-12). */
export const STILL_NOTIFY_MS = 45 * 60_000;
/** No location this long while the phone is still driving → "Trip isn't recording". */
export const SILENT_NOTIFY_MS = 10 * 60_000;
/** A start signal backdates to a 'still' / 'walking' exit at most this far back. */
export const BACKDATE_MAX_MS = 5 * 60_000;
export const DRIVING_STALE_MS = 2 * 60 * 60_000;
/** Raw samples count as driving from this confidence (0–100). */
export const SAMPLE_DRIVING_CONFIDENCE = 75;

const when = (s: EngineSignal) => ('eventAt' in s && s.eventAt ? s.eventAt : s.at);

const isMotion = (a: Activity | null) => a === 'driving';

/**
 * One decision step. `signals` may include ones already seen (they are skipped by `seenUntil`).
 * `charging` = phone charging right now. Returns the new state and what to do.
 */
export function step(
  state0: EngineState,
  signals: EngineSignal[],
  cfg: EngineConfig,
  trip: EngineTrip | null,
  now: number,
  charging: boolean,
): { state: EngineState; actions: EngineAction[] } {
  const state: EngineState = { ...state0 };
  const actions: EngineAction[] = [];
  let startAt: number | null = null;
  let startReason: 'motion' | 'bluetooth' | 'charging' = 'motion';
  const fresh = signals.filter((s) => s.at > state0.seenUntil).sort((a, b) => a.at - b.at);

  for (const s of fresh) {
    state.seenUntil = Math.max(state.seenUntil, s.at);
    const at = when(s);
    if (s.kind === 'activity' || s.kind === 'sample') {
      const entered =
        (s.kind === 'activity' && s.transition === 'enter') ||
        (s.kind === 'sample' && (s.activity !== 'driving' || (s.confidence ?? 0) >= SAMPLE_DRIVING_CONFIDENCE));
      if (s.kind === 'activity' && s.transition === 'exit' && (s.activity === 'still' || s.activity === 'walking')) {
        state.movedAt = Math.max(state.movedAt, at);
        if (cfg.startOnCharge && charging && s.activity === 'still' && !trip && startAt === null) {
          // "Start when charging" + moving (Android: the charger is the van's).
          startAt = at;
          startReason = 'charging';
        }
      }
      if (s.kind === 'activity' && s.transition === 'exit' && s.activity === state.activity) {
        state.activity = null;
        state.activityAt = at;
      }
      if (entered && at >= state.activityAt) {
        state.activity = s.activity;
        state.activityAt = at;
        if (s.activity === 'driving' && !trip && startAt === null) {
          startAt = at;
          startReason = 'motion';
        }
      }
    } else if (s.kind === 'bt_connected') {
      if (cfg.vanAddress && s.address && s.address.toUpperCase() === cfg.vanAddress.toUpperCase()) {
        state.vanConnectedAt = s.at;
        if (!trip && startAt === null) {
          startAt = s.at;
          startReason = 'bluetooth';
        }
      }
    }
    // bt_disconnected never ends a trip (P1-1); power / wake / boot only trigger a re-check.
  }

  if (!trip) {
    if (cfg.enabled && startAt !== null) {
      // Backdate to when the phone left 'still' / 'walking' so the first miles count.
      const back = state.movedAt && state.movedAt <= startAt && startAt - state.movedAt <= BACKDATE_MAX_MS ? state.movedAt : startAt;
      actions.push({ type: 'start', at: Math.min(back, now), reason: startReason });
      actions.push({ type: 'wake', at: now + cfg.mergeStopMinutes * 60_000 + 30_000 });
    }
    return { state, actions };
  }

  if (trip.status !== 'running') return { state, actions };

  const lastFix = Math.max(trip.lastPointAt ?? 0, trip.startedAt);
  // Activity recognition still says 'driving' (GPS can drop out in tunnels): not a stop. A 'driving' state with no
  // fix for DRIVING_STALE_MS is not trusted any more (a lost exit transition must not keep a trip open forever).
  const driving = isMotion(state.activity) && now - Math.max(lastFix, state.activityAt) < DRIVING_STALE_MS;
  if (trip.startedBy === 'auto') {
    const mergeMs = cfg.mergeStopMinutes * 60_000;
    if (!driving && now - lastFix >= mergeMs) {
      // End time = when the vehicle really stopped, not when we noticed.
      actions.push({ type: 'end', tripId: trip.id, at: lastFix });
      return { state, actions };
    }
    actions.push({ type: 'wake', at: (driving ? now : lastFix) + mergeMs + 30_000 });
  } else {
    if (!driving && now - lastFix >= STILL_NOTIFY_MS) {
      if (state.stillNotifiedFor !== lastFix) {
        state.stillNotifiedFor = lastFix;
        actions.push({ type: 'notifyStill', tripId: trip.id, since: lastFix });
      }
    } else {
      actions.push({ type: 'wake', at: (driving ? now : lastFix) + STILL_NOTIFY_MS + 30_000 });
    }
  }
  if (driving && now - lastFix >= SILENT_NOTIFY_MS && state.silentNotifiedFor !== lastFix) {
    state.silentNotifiedFor = lastFix;
    actions.push({ type: 'notifySilent', tripId: trip.id, since: lastFix });
  }
  return { state, actions };
}

/** Automatic trips shorter than this were not real drives (car park shuffle, false detection): dropped silently. */
export const MIN_AUTO_TRIP_M = 500;
