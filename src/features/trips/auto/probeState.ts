// B-88 drive check: the stored state and how it stops (kept apart from probe.ts so the trip controller can stop a
// running check without importing the check itself).
import * as Location from 'expo-location';

import { db } from '@/db/client';

import { configureNative } from './native';
import { PROBE_COOLDOWN_MS } from './probeLogic';
import { getKV, setKV } from './repo';

export const PROBE_TASK = 'sunday-drive-check';
const KEY_PROBE = 'probe';

export interface ProbeState {
  /** When the phone left 'still' (a drive found by the check starts here). */
  startedAt: number;
  /** The check stops by itself after this. */
  until: number;
  origin: { lat: number; lng: number; ts: number; accuracy: number } | null;
  /** B-88 v2: the step counter at the previous fix (steps a minute = walking). */
  steps?: { at: number; count: number } | null;
  /** B-88 v2: the motion sensor said cycling during this check. */
  cycling?: boolean;
}

export const getProbe = () => getKV<ProbeState | null>(db, KEY_PROBE, null);
/** No new check before this (cool-down after one found nothing). */
export const probeAfter = () => getKV<number>(db, 'probeAfter', 0);
export const setProbe = (p: ProbeState | null) => setKV(db, KEY_PROBE, p);

/**
 * Stop a running check. `found`: a drive started (no cool-down — a Trip runs now anyway).
 * A13-16: expo-location runs ONE foreground service for every location task — stopping the check's updates stopped the
 * Trip's too (a trip started on charge mid-check lost GPS when the check ended). `onTripStillRecording` puts the Trip's
 * recording back.
 */
export async function stopProbe(found: boolean, now = Date.now(), onTripStillRecording?: () => Promise<void>): Promise<void> {
  const p = getProbe();
  if (p) setProbe(null);
  const started = await Location.hasStartedLocationUpdatesAsync(PROBE_TASK).catch(() => true);
  if (started) {
    await Location.stopLocationUpdatesAsync(PROBE_TASK).catch(() => {});
    await onTripStillRecording?.().catch(() => {});
  }
  if (p) {
    const after = found ? now : now + PROBE_COOLDOWN_MS;
    setKV(db, 'probeAfter', after);
    configureNative({ probeAfter: after });
  }
}
