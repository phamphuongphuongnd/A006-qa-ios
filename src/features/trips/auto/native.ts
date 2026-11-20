// Thin wrapper over modules/trip-detect for S1: everything is optional (null module in Jest / Expo Go / iOS gaps).
import { Platform } from 'react-native';

import { TripDetect, type TripDetectHealth, type TripSignal } from '../../../../modules/trip-detect';
import { MOTION_LOOKBACK_MS, motionToSignals } from './motion';

export type { TripDetectHealth };

/** iOS also needs a motion coprocessor (the simulator has none): without it nothing can tell driving. */
export const autoTripsSupported = () => {
  if (TripDetect === null) return false;
  try {
    return TripDetect.isActivityAvailable?.() ?? true;
  } catch {
    return false;
  }
};

/** The native log as stored (iOS: raw CoreMotion snapshots) — for "Share trip diagnostics". */
export function readRawSignals(sinceMs: number): TripSignal[] {
  try {
    return TripDetect?.getRecentEvents(sinceMs) ?? [];
  } catch {
    return [];
  }
}

/** Signals for the engine. iOS logs CoreMotion snapshots, turned into the transitions Android logs (B-95). */
export function readSignals(sinceMs: number): TripSignal[] {
  if (Platform.OS !== 'ios') return readRawSignals(sinceMs);
  return motionToSignals(readRawSignals(sinceMs - MOTION_LOOKBACK_MS), sinceMs);
}

export function configureNative(cfg: { enabled?: boolean; tripActive?: boolean; vanAddress?: string | null; probeAfter?: number }) {
  try {
    TripDetect?.configure?.(cfg);
  } catch {
    // older native build without S1 functions
  }
}

export function scheduleWake(atMs: number) {
  try {
    TripDetect?.scheduleWake?.(atMs);
  } catch {
    // best effort
  }
}

/** iOS: wake the app when the phone leaves where the last trip ended (B-95). */
export function watchDeparture(lat: number, lng: number) {
  try {
    TripDetect?.watchDeparture?.(lat, lng);
  } catch {
    // best effort
  }
}

/**
 * A13-13: an automatic start (Van Bluetooth / activity recognition) runs with no screen open; expo-location refuses
 * that unless told otherwise. Android only, needs "Allow all the time".
 */
export function allowBackgroundLocationStart() {
  if (Platform.OS !== 'android') return;
  try {
    TripDetect?.allowBackgroundLocationStart?.();
  } catch {
    // older native build: the start fails as before and "Tap to record" shows
  }
}

/** Steps since boot (Android step counter), null when unknown. */
export async function stepCount(): Promise<number | null> {
  try {
    return (await TripDetect?.stepCount?.()) ?? null;
  } catch {
    return null;
  }
}

/** A diagnostics line next to the signals ("Share trip diagnostics"), e.g. how an automatic start went. */
export function logDiagnostic(kind: string, extra: Record<string, string | number | boolean | null>) {
  try {
    TripDetect?.log?.(kind, extra);
  } catch {
    // best effort
  }
}

export function cancelWake() {
  try {
    TripDetect?.cancelWake?.();
  } catch {
    // best effort
  }
}

export function nativeHealth(): TripDetectHealth | null {
  try {
    return TripDetect?.health?.() ?? null;
  } catch {
    return null;
  }
}

export const hasActivityPermission = (): boolean => {
  try {
    return TripDetect?.hasActivityPermission() ?? false;
  } catch {
    return false;
  }
};

export async function setTransitions(on: boolean): Promise<boolean> {
  if (!TripDetect) return false;
  try {
    if (on) await TripDetect.startTransitions();
    else await TripDetect.stopTransitions();
    return true;
  } catch {
    return false;
  }
}

export const bondedDevices = () => {
  try {
    return TripDetect?.getBondedDevices() ?? [];
  } catch {
    return [];
  }
};

/** Samsung gets its own battery wording / tips (Home card, S-07f). */
export const isSamsung = () => Platform.OS === 'android' && (nativeHealth()?.manufacturer ?? '').includes('samsung');

export function simulateSignal(kind: string, activity: string | null = null, transition: string | null = null, address: string | null = null) {
  TripDetect?.simulate?.(kind, activity, transition, address);
}
