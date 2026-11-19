/**
 * B-88 (Phương 19/11: a drive in slow traffic never started — the motion sensor said still / walking, never driving).
 * When the phone leaves 'still' and no Trip runs, Android checks GPS for a while (a "drive check"); a phone that gets
 * far enough away fast enough — or far away while the sensor doesn't say walking — is in a vehicle: the Trip starts,
 * dated back to when it left 'still'. Pure part; see probe.ts.
 */
import { haversine } from '@/domain/mileage';

/** How long one drive check runs. */
export const PROBE_WINDOW_MS = 12 * 60_000;
/** No new check this long after one ended without a drive (walking around the house). */
export const PROBE_COOLDOWN_MS = 20 * 60_000;
/** Only a check started this soon after leaving 'still'. */
export const PROBE_START_WITHIN_MS = 3 * 60_000;
/** Away from where the check started… */
export const PROBE_MIN_DISTANCE_M = 500;
/** …at more than a brisk walk on average, unless the sensor doesn't say walking at all (a phone in a crawling car). */
export const PROBE_MIN_SPEED_MPS = 2.5;
/** Fixes worse than this are ignored (balanced power: wifi / cell). */
export const PROBE_MAX_ACCURACY_M = 100;

export interface ProbeFix {
  lat: number;
  lng: number;
  ts: number;
  accuracy: number;
}

export type OnFoot = boolean;

/** Is this a drive? `origin` = first usable fix of the check; `onFoot` = the sensor's last word was walking / running / cycling. */
export function probeSaysDriving(origin: ProbeFix, fix: ProbeFix, onFoot: OnFoot): boolean {
  if (fix.accuracy > PROBE_MAX_ACCURACY_M || origin.accuracy > PROBE_MAX_ACCURACY_M) return false;
  const d = haversine(origin, fix);
  if (d < PROBE_MIN_DISTANCE_M) return false;
  const secs = Math.max(1, (fix.ts - origin.ts) / 1000);
  return !onFoot || d / secs >= PROBE_MIN_SPEED_MPS;
}

/** Start a drive check now? */
export function shouldStartProbe(input: {
  now: number;
  enabled: boolean;
  tripActive: boolean;
  movedAt: number;
  probeAfter: number;
  probing: boolean;
}): boolean {
  const { now, enabled, tripActive, movedAt, probeAfter, probing } = input;
  return enabled && !tripActive && !probing && movedAt > 0 && now - movedAt <= PROBE_START_WITHIN_MS && now >= probeAfter;
}
