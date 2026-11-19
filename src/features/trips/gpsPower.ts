/**
 * B-131 (Phương 19/11, A13: GPS every 5 s was nearly all the battery a parked trip used): while a running Trip hasn't
 * really moved for a while, ask for a fix every PARKED_INTERVAL_MS instead; back to every 5 s as soon as the motion
 * sensor says driving or a fix lands outside the Stop radius (that moves `lastMoveAt`). Android only for now.
 */
export type GpsMode = 'drive' | 'parked';

/** Not really moved for this long → parked mode. */
export const PARKED_AFTER_MS = 2 * 60_000;
/** One fix this often while parked (still high accuracy, so a move away is seen). */
export const PARKED_INTERVAL_MS = 30_000;

export function gpsModeFor(input: { now: number; lastMoveAt: number; sensorDriving: boolean }): GpsMode {
  if (input.sensorDriving) return 'drive';
  return input.now - input.lastMoveAt >= PARKED_AFTER_MS ? 'parked' : 'drive';
}
