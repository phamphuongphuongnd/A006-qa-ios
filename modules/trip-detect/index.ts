import { requireOptionalNativeModule, type EventSubscription } from 'expo';

/** One detection signal. `at` = when the app recorded it; `eventAt` = when it happened (activity events). */
export type TripSignal =
  | {
      kind: 'activity' | 'sample';
      activity: 'driving' | 'walking' | 'cycling' | 'running' | 'still' | 'tilting' | 'unknown';
      transition?: 'enter' | 'exit';
      confidence?: number;
      at: number;
      eventAt: number;
    }
  | { kind: 'bt_connected' | 'bt_disconnected'; address: string | null; name: string | null; at: number }
  | { kind: 'power_connected' | 'power_disconnected'; at: number };

export interface BondedDevice {
  address: string;
  name: string | null;
}

interface TripDetectNative {
  hasActivityPermission(): boolean;
  startTransitions(): Promise<void>;
  stopTransitions(): Promise<void>;
  startSampling(intervalMs: number): Promise<void>;
  stopSampling(): Promise<void>;
  getRecentEvents(sinceMs: number): TripSignal[];
  clearEvents(): void;
  isCharging(): boolean;
  watchPower(on: boolean): void;
  getBondedDevices(): BondedDevice[];
  /** iOS only: CoreMotion history (about 7 days). */
  queryActivities?(fromMs: number, toMs: number): Promise<Omit<Extract<TripSignal, { kind: 'activity' }>, 'kind' | 'at'>[]>;
  addListener(event: 'onSignal', cb: (s: TripSignal) => void): EventSubscription;
}

/** null in Jest / Expo Go / web: callers must treat automatic trips as unavailable. */
export const TripDetect = requireOptionalNativeModule<TripDetectNative>('SundayTripDetect');

export function addSignalListener(cb: (s: TripSignal) => void): EventSubscription | null {
  return TripDetect?.addListener('onSignal', cb) ?? null;
}
