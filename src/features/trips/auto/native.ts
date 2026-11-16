// Thin wrapper over modules/trip-detect for S1: everything is optional (null module in Jest / Expo Go / iOS gaps).
import { Platform } from 'react-native';

import { TripDetect, type TripDetectHealth, type TripSignal } from '../../../../modules/trip-detect';

export type { TripDetectHealth };

export const autoTripsSupported = () => TripDetect !== null;

export function readSignals(sinceMs: number): TripSignal[] {
  try {
    return TripDetect?.getRecentEvents(sinceMs) ?? [];
  } catch {
    return [];
  }
}

export const isCharging = (): boolean => {
  try {
    return TripDetect?.isCharging() ?? false;
  } catch {
    return false;
  }
};

export function configureNative(cfg: { enabled?: boolean; tripActive?: boolean; startOnCharge?: boolean; vanAddress?: string | null }) {
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
