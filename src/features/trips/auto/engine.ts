// Pure (no DB / native / timers): the automatic-trip decision step (P1-1, F-12). The runner feeds it the detection
// signals logged since the last run and applies the actions it returns.

export type Activity = 'driving' | 'walking' | 'cycling' | 'running' | 'still' | 'tilting' | 'unknown';

/** A detection signal as logged by modules/trip-detect (plus 'wake' alarms and 'boot'). */
export type EngineSignal =
  | { kind: 'activity' | 'sample'; activity: Activity; transition?: 'enter' | 'exit'; confidence?: number; at: number; eventAt?: number }
  | { kind: 'bt_connected' | 'bt_disconnected'; address: string | null; at: number }
  | { kind: 'power_connected' | 'power_disconnected' | 'wake' | 'boot'; at: number; reason?: string };

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
  /** B-143 (b): last 'still' enter (a stop: the drive check's cool-down ends for the next movement). */
  stillEnterAt?: number;
  /** B-143 (c): last time the sensor left driving / cycling (a crawling van reads as cycling)… */
  vehicleExitAt?: number;
  /** …and walking / running followed it, with no driving / cycling since: the driver walked away from the van. */
  footAfterDrive?: boolean;
}

export const INITIAL_ENGINE_STATE: EngineState = {
  seenUntil: 0,
  activity: null,
  activityAt: 0,
  movedAt: 0,
  vanConnectedAt: 0,
  stillNotifiedFor: 0,
  silentNotifiedFor: 0,
  stillEnterAt: 0,
  vehicleExitAt: 0,
  footAfterDrive: false,
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
  /** Last GPS fix that was kept. */
  lastPointAt: number | null;
  /**
   * When the vehicle last really moved (start of the final cluster of fixes within the Stop radius — `parkedSince`).
   * GPS wander while parked doesn't move it. Missing → `lastPointAt`.
   */
  lastMoveAt?: number | null;
}

export type EngineAction =
  | { type: 'start'; at: number; reason: 'motion' | 'bluetooth' | 'charging' }
  | { type: 'end'; tripId: string; at: number; startedBy: EngineTrip['startedBy'] }
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

/** An enter dated this little before the exit it pairs with still follows it (B-143). */
export const EXIT_ENTER_SKEW_MS = 1_000;

const when = (s: EngineSignal) => ('eventAt' in s && s.eventAt ? s.eventAt : s.at);

const isMotion = (a: Activity | null) => a === 'driving';
/** B-143: walking / running — never a drive, never a vehicle's miles. */
export const isOnFoot = (a: Activity | null | undefined) => a === 'walking' || a === 'running';
const isVehicle = (a: Activity) => a === 'driving' || a === 'cycling';

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
      if (s.kind === 'activity' && s.transition === 'exit' && isVehicle(s.activity)) {
        state.vehicleExitAt = Math.max(state.vehicleExitAt ?? 0, at);
      }
      if (s.kind === 'activity' && s.transition === 'exit' && s.activity === state.activity) {
        state.activity = null;
        state.activityAt = at;
      }
      // B-143: A13 dates an exit and the enter that goes with it from two clock reads — the enter can come out 1 ms
      // before the exit (still exit 07:10:25.082 / walking enter .081): it still follows that exit.
      const follows = at >= state.activityAt || (state.activity === null && state.activityAt - at <= EXIT_ENTER_SKEW_MS);
      if (entered && follows) {
        // B-143 (c): on foot after leaving the van (on foot straight from driving = a lost exit) → walked away from it,
        // until the sensor says driving / cycling again.
        if (isOnFoot(s.activity)) {
          if (state.activity && isVehicle(state.activity)) state.vehicleExitAt = at;
          if ((state.vehicleExitAt ?? 0) > 0) state.footAfterDrive = true;
        }
        if (isVehicle(s.activity)) state.footAfterDrive = false;
        if (s.activity === 'still' && s.kind === 'activity') state.stillEnterAt = Math.max(state.stillEnterAt ?? 0, at);
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
  // Phương 19/11 (CONTEXT: Trip end): a Trip ends when the vehicle hasn't really moved for the merge threshold —
  // GPS wander at home no longer counts as moving — automatic or started by the driver, Van Bluetooth or not.
  const lastMove = tripLastMove(trip, state);
  // Activity recognition still says 'driving' (GPS can drop out in tunnels): not a stop. A 'driving' state with no
  // fix for DRIVING_STALE_MS is not trusted any more (a lost exit transition must not keep a trip open forever).
  const driving = isMotion(state.activity) && now - Math.max(lastFix, state.activityAt) < DRIVING_STALE_MS;
  const mergeMs = cfg.mergeStopMinutes * 60_000;
  if (!driving && now - lastMove >= mergeMs) {
    // End time = when the vehicle really stopped, not when we noticed.
    actions.push({ type: 'end', tripId: trip.id, at: lastMove, startedBy: trip.startedBy });
    return { state, actions };
  }
  actions.push({ type: 'wake', at: (driving ? now : lastMove) + mergeMs + 30_000 });
  if (driving && now - lastFix >= SILENT_NOTIFY_MS && state.silentNotifiedFor !== lastFix) {
    state.silentNotifiedFor = lastFix;
    actions.push({ type: 'notifySilent', tripId: trip.id, since: lastFix });
  }
  return { state, actions };
}

/**
 * When the vehicle last really moved (CONTEXT: Trip end). B-143 (c, Phương 20/11): the driver walked away from the van
 * — the walk adds no fixes (`recordingFilter`), and the van parked when the sensor stopped saying driving.
 */
export function tripLastMove(trip: EngineTrip, state: EngineState): number {
  const lastMove = Math.max(trip.lastMoveAt ?? trip.lastPointAt ?? 0, trip.startedAt);
  const parkedAt = state.footAfterDrive && (state.vehicleExitAt ?? 0) >= trip.startedAt ? (state.vehicleExitAt ?? 0) : 0;
  return Math.max(lastMove, parkedAt);
}

/**
 * Which fixes of a running Trip add nothing (backgroundTask.ts → appendPoints):
 * - `sensorStill` (Phương 19/11): the motion sensor says still — GPS wander at home. B-143: not a 'still' entered
 *   before the drive check found this Trip's drive (`probeFoundAt`) — the sensor missed that drive (slow traffic).
 * - `onFoot` (B-143 c): walking / running — the driver walked away (a delivery, home); never the van's miles.
 * - `walkSpeed` (B-143 c): the sensor left driving / cycling in this Trip and said nothing since — fixes slower than
 *   WALK_AFTER_DRIVE_MAX_MPS (domain/mileage.ts) are someone walking.
 * Without the motion permission the sensor is not read.
 */
export function recordingFilter(input: {
  state: EngineState | null;
  permission: boolean;
  tripStartedAt: number;
  probeFoundAt: number | null;
}): { sensorStill: boolean; onFoot: boolean; walkSpeed: boolean } {
  const { state, permission, tripStartedAt, probeFoundAt } = input;
  if (!state || !permission) return { sensorStill: false, onFoot: false, walkSpeed: false };
  const missedDrive = probeFoundAt !== null && state.activityAt <= probeFoundAt;
  const exit = state.vehicleExitAt ?? 0;
  return {
    sensorStill: state.activity === 'still' && !missedDrive,
    onFoot: isOnFoot(state.activity),
    walkSpeed: state.activity === null && exit >= tripStartedAt && exit >= state.activityAt,
  };
}

/** Automatic trips shorter than this were not real drives (car park shuffle, false detection): dropped silently. */
export const MIN_AUTO_TRIP_M = 500;
