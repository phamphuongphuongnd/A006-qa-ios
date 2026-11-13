// Pure (no DB / hooks): imported by the headless widget task and tests. Owned by S1.

/**
 * Automatic-trip state for the widget line "Auto trips on" / "Auto trips paused" (F-20) and Home. S1: return 'paused'
 * when the OS has stopped detection (same signal as `autoPaused`).
 */
export function autoTripState(s: { autoTrips: boolean }, pro: boolean): 'off' | 'on' | 'paused' {
  return s.autoTrips && pro ? 'on' : 'off';
}
