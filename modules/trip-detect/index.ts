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
  | {
      /** iOS: a raw CoreMotion snapshot (activity + confidence 0–2 from `eventAt` on); JS turns these into transitions. */
      kind: 'motion';
      activity: 'driving' | 'walking' | 'cycling' | 'running' | 'still';
      confidence: number;
      at: number;
      eventAt: number;
    }
  | { kind: 'bt_connected' | 'bt_disconnected'; address: string | null; name: string | null; at: number }
  /** iOS wake: `reason` 'location' (significant change) / 'departure' / 'timer' (scheduleWake) / 'motion_error'. */
  | { kind: 'wake' | 'boot'; at: number; reason?: string };

export interface BondedDevice {
  address: string;
  name: string | null;
  /** Android: from the Bluetooth device class — 'personal' = headphones / speaker / watch / phone, not a vehicle. */
  kind?: 'car' | 'personal' | 'unknown';
}

export interface TripDetectHealth {
  activityPermission: boolean;
  backgroundLocation: boolean;
  /** Not "Unrestricted" in battery settings: may miss drives. */
  batteryOptimized: boolean;
  /** Background use restricted by the user / system (Samsung sleeping apps): automatic trips paused. */
  backgroundRestricted: boolean;
  restrictedBucket: boolean;
  /** Android: activity transitions registered with Play services. iOS: significant-change wake-ups on. */
  registered: boolean;
  manufacturer: string;
}

/** Headless JS task the native receivers run (registered in src/features/trips/backgroundTask.ts). */
export const TRIP_DETECT_TASK = 'SundayTripDetect';

interface TripDetectNative {
  /** iOS: the phone has a motion coprocessor (false on the simulator). */
  isActivityAvailable?(): boolean;
  hasActivityPermission(): boolean;
  startTransitions(): Promise<void>;
  stopTransitions(): Promise<void>;
  startSampling(intervalMs: number): Promise<void>;
  stopSampling(): Promise<void>;
  getRecentEvents(sinceMs: number): TripSignal[];
  /** Android: let expo-location start its foreground service while no screen is open (needs background location). */
  allowBackgroundLocationStart?(): boolean;
  /** Android: steps since boot from the phone's step counter; null when there is none (B-88 v2). */
  stepCount?(): Promise<number | null>;
  /** Android: add a diagnostics line to the signal log. */
  log?(kind: string, extra: Record<string, string | number | boolean | null>): void;
  clearEvents(): void;
  /** Dev screen only (B-145: "Start when charging" is gone). */
  isCharging(): boolean;
  getBondedDevices(): BondedDevice[];
  /** S1: state the receivers read while JS is dead (Android; a no-op on iOS). */
  configure?(cfg: { enabled?: boolean; tripActive?: boolean; vanAddress?: string | null; probeAfter?: number }): void;
  /** S1: one pending wake-up (end-of-trip check) that runs the JS task (Android alarm; iOS timer while the app runs). */
  scheduleWake?(atMs: number): void;
  cancelWake?(): void;
  /** iOS only: one-shot wake-up ('wake', reason 'departure') when the phone leaves 150 m around this point. */
  watchDeparture?(lat: number, lng: number): void;
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
