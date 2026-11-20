/**
 * B-88 (Phương 19/11: a drive in slow traffic never started — the motion sensor said still / walking, never driving).
 * When the phone leaves 'still' and no Trip runs, Android checks GPS for a while (a "drive check"); a phone that gets
 * far enough away faster than a walk, while the sensor doesn't say walking, is in a vehicle: the Trip starts, dated
 * back to when it left 'still'. Pure part; see probe.ts.
 *
 * B-143 (Phương 20/11, A13 real walks / drives): (a) only faster than a walk AND the sensor not on foot right now — far
 * away alone is no drive any more, and a step counter reading 0 proves nothing (A13 doesn't count steps with the screen
 * off); (b) the cool-down only holds for the same movement — a stop ('still' enter) and a new start ('still' exit)
 * checks again at once; (d) a check whose last 2 minutes still move goes on (at most 12 more minutes).
 */
import { haversine, STOP_RADIUS_M } from '@/domain/mileage';

/** How long one drive check runs. */
export const PROBE_WINDOW_MS = 12 * 60_000;
/** No new check this long after one ended without a drive — for the same movement only (B-143 b). */
export const PROBE_COOLDOWN_MS = 20 * 60_000;
/** Only a check started this soon after leaving 'still'. */
export const PROBE_START_WITHIN_MS = 3 * 60_000;
/** Away from where the drive began… */
export const PROBE_MIN_DISTANCE_M = 500;
/** …at more than a brisk walk on average (9 km/h). */
export const PROBE_MIN_SPEED_MPS = 2.5;
/** Fixes worse than this are ignored (balanced power: wifi / cell). */
export const PROBE_MAX_ACCURACY_M = 100;
/** B-143 (d): a check still moving over its last 2 minutes goes on… */
export const PROBE_MOVING_RECENT_MS = 2 * 60_000;
/** …2 minutes at a time… */
export const PROBE_EXTEND_STEP_MS = 2 * 60_000;
/** …at most this much past its 12 minutes. */
export const PROBE_EXTEND_MAX_MS = 12 * 60_000;
/** Fixes a check keeps (24 minutes at one every 30 s, and some spare). */
export const PROBE_MAX_FIXES = 60;

export interface ProbeFix {
  lat: number;
  lng: number;
  ts: number;
  accuracy: number;
}

/** Phương 19/11 (B-88 v2): this many steps a minute or more = walking / running right now — never a drive. */
export const WALKING_STEPS_PER_MIN = 40;

export interface ProbeContext {
  /** The motion sensor's current activity is walking / running. */
  onFoot: boolean;
  /** The motion sensor said cycling at any point of this check — a bike never starts a Trip. */
  cycling: boolean;
  /** Steps a minute since the previous fix (phone's step counter); null when unknown. Only a high count matters. */
  stepsPerMin: number | null;
}

/** Is `from` → `fix` a drive? */
export function probeSaysDriving(from: ProbeFix, fix: ProbeFix, ctx: ProbeContext): boolean {
  if (ctx.cycling || ctx.onFoot) return false;
  // Walking with the phone in a bag: the motion sensor may miss it, the step counter may not (a 0 proves nothing).
  if (ctx.stepsPerMin !== null && ctx.stepsPerMin >= WALKING_STEPS_PER_MIN) return false;
  if (fix.accuracy > PROBE_MAX_ACCURACY_M || from.accuracy > PROBE_MAX_ACCURACY_M) return false;
  const d = haversine(from, fix);
  if (d < PROBE_MIN_DISTANCE_M) return false;
  const secs = Math.max(1, (fix.ts - from.ts) / 1000);
  return d / secs >= PROBE_MIN_SPEED_MPS;
}

/**
 * The check's fixes (oldest first) up to the newest one: where the drive began, or -1. The earliest fix from which the
 * newest is a drive — walked to the van for 10 minutes, then drove: the drive is counted from the van, not from home.
 */
export function findDrive(fixes: ProbeFix[], ctx: ProbeContext): number {
  if (fixes.length < 2) return -1;
  const last = fixes[fixes.length - 1];
  for (let i = 0; i < fixes.length - 1; i++) if (probeSaysDriving(fixes[i], last, ctx)) return i;
  return -1;
}

/**
 * B-143 (d): the check ran out (`now > until`) — go on? Only while the last 2 minutes of fixes really moved (more than
 * the Stop radius: GPS wander indoors is no movement), the sensor doesn't say walking, and no more than
 * PROBE_EXTEND_MAX_MS past the first 12 minutes (`maxUntil`). Returns the new end, or null = stop now.
 */
export function extendProbe(input: { now: number; until: number; maxUntil: number; fixes: ProbeFix[]; onFoot: boolean }): number | null {
  const { now, until, maxUntil, fixes, onFoot } = input;
  if (onFoot || now <= until || until >= maxUntil || fixes.length < 2) return null;
  const last = fixes[fixes.length - 1];
  if (now - last.ts > PROBE_MOVING_RECENT_MS) return null;
  const moving = fixes.some((f) => f !== last && last.ts - f.ts <= PROBE_MOVING_RECENT_MS && haversine(f, last) > STOP_RADIUS_M);
  return moving ? Math.min(now + PROBE_EXTEND_STEP_MS, maxUntil) : null;
}

/** Start a drive check now? */
export function shouldStartProbe(input: {
  now: number;
  enabled: boolean;
  tripActive: boolean;
  movedAt: number;
  probeAfter: number;
  probing: boolean;
  /** B-143 (b): last 'still' enter, and when the previous check's movement began. */
  stillEnterAt?: number;
  lastCheckSince?: number;
}): boolean {
  const { now, enabled, tripActive, movedAt, probeAfter, probing } = input;
  if (!enabled || tripActive || probing || movedAt <= 0 || now - movedAt > PROBE_START_WITHIN_MS) return false;
  if (now >= probeAfter) return true;
  // The cool-down is for the same movement: stopped ('still' enter) since that check, then moved again → a new one.
  const stillAt = input.stillEnterAt ?? 0;
  return stillAt > (input.lastCheckSince ?? 0) && movedAt > stillAt;
}
