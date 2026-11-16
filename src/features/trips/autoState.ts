// Pure apart from one synchronous native read: imported by the headless widget task, Home and tests. Owned by S1.
import { nativeHealth, type TripDetectHealth } from './auto/native';

/** The phone stopped automatic trips: permission taken back, background use restricted (Samsung sleeping apps). */
export function autoPausedBy(h: TripDetectHealth | null): boolean {
  if (!h) return false;
  return !h.activityPermission || !h.backgroundLocation || h.backgroundRestricted || h.restrictedBucket;
}

/**
 * Automatic-trip state for the widget line "Auto trips on" / "Auto trips paused" (F-20), Home and S-07d.
 * 'paused' when the OS has stopped detection (same signal as the Home `autoPaused` card).
 */
export function autoTripState(s: { autoTrips: boolean }, pro: boolean, health: TripDetectHealth | null = nativeHealth()): 'off' | 'on' | 'paused' {
  if (!s.autoTrips || !pro) return 'off';
  return autoPausedBy(health) ? 'paused' : 'on';
}
