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
  | { kind: 'power_connected' | 'power_disconnected' | 'wake' | 'boot'; at: number };

export interface BondedDevice {
  address: string;
  name: string | null;
}

export interface TripDetectHealth {
  activityPermission: boolean;
  backgroundLocation: boolean;
  /** Not "Unrestricted" in battery settings: may miss drives. */
  batteryOptimized: boolean;
  /** Background use restricted by the user / system (Samsung sleeping apps): automatic trips paused. */
  backgroundRestricted: boolean;
  restrictedBucket: boolean;
  /** Activity transitions registered with Play services. */
  registered: boolean;
  manufacturer: string;
}

/** Headless JS task the native receivers run (registered in src/features/trips/backgroundTask.ts). */
export const TRIP_DETECT_TASK = 'SundayTripDetect';

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
  /** S1: state the receivers read while JS is dead (Android). */
  configure?(cfg: { enabled?: boolean; tripActive?: boolean; startOnCharge?: boolean; vanAddress?: string | null }): void;
  /** S1: one pending wake-up (end-of-trip check) that runs the JS task (Android). */
  scheduleWake?(atMs: number): void;
  cancelWake?(): void;
  health?(): TripDetectHealth;
  /** Dev: log a fake signal and run the JS task as a real one would. */
  simulate?(kind: string, activity: string | null, transition: string | null, address: string | null): void;
  /** iOS only: CoreMotion history (about 7 days). */
  queryActivities?(fromMs: number, toMs: number): Promise<Omit<Extract<TripSignal, { kind: 'activity' }>, 'kind' | 'at'>[]>;
  addListener(event: 'onSignal', cb: (s: TripSignal) => void): EventSubscription;
}

/** null in Jest / Expo Go / web: callers must treat automatic trips as unavailable. */
export const TripDetect = requireOptionalNativeModule<TripDetectNative>('SundayTripDetect');

export function addSignalListener(cb: (s: TripSignal) => void): EventSubscription | null {
  return TripDetect?.addListener('onSignal', cb) ?? null;
}
