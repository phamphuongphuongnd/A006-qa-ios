import { eq } from 'drizzle-orm';

import { DEFAULT_RATES, LEGACY_UK_RATES, type RateTier } from '@/domain/mileage';
import type { Region, Scope, VehicleCostMethod } from '@/domain/types';

import { settings } from './schema';
import type { AppDb } from './types';

export interface AppSettings {
  /** null until onboarding picks a region. */
  region: Region | null;
  onboarded: boolean;
  mileageRates: Record<Region, RateTier[]>;
  defaultScope: Scope;
  keepAdding: boolean;
  distanceUnit: 'mi' | 'km';
  reminder: { on: boolean; weekday: number; hour: number; minute: number };
  appLock: boolean;
  lockAfterMs: 0 | 60_000 | 300_000;
  theme: 'system' | 'light' | 'dark';
  lastBackupAt: number | null;
  backupReminder: boolean;
  /** Home backup banner dismissed until this time. */
  backupBannerSnoozedUntil: number | null;

  // ---- Bản 2 (product.md §8). UI comes with the v2 mockups; S1–S5 read / write these keys. ----
  /** X2 / Q24: asked in onboarding; 'unsure' counts like mileage and Reports nudges. See domain/vehicleCosts.ts. */
  vehicleCostMethod: VehicleCostMethod;
  /** P1-1: stops shorter than this stay in one shift trip; end of trip after this long not driving. */
  mergeStopMinutes: MergeStopMinutes;
  /** P1-3: trips outside these hours are recorded as Personal. days: 0 = Sunday … 6; minutes after midnight. */
  workHours: WorkHours;
  /** Pro: record trips automatically (S-07d). */
  autoTrips: boolean;
  /** Android: van Bluetooth device that starts a trip at once (S-07d "Start faster"). */
  vanBtDevice: { address: string; name: string | null } | null;
  /** Android: start when charging + moving. */
  startOnCharge: boolean;
  /**
   * Q10: folder picked once for nightly backups. Android: SAF tree URI (permission persisted). iOS: `bookmark` from
   * modules/backup-folder (the URI alone dies with the process). `label`: "Google Drive / Sunday Sort".
   */
  backupFolder: { uri: string; label: string; bookmark: string | null } | null;
  /** P1-7: nightly backup when something changed, keeps 7 files. */
  backupNightly: boolean;
  /** Consecutive failed nightly backups (3 → Home card). */
  backupFailCount: number;
  lastAutoBackupAt: number | null;
  /** Q22: one notification after the shift if nothing was logged that day; off by default. */
  dailyNudge: { on: boolean; hour: number; minute: number; days: number[] };
  /** S-20 switches for the notifications that are not reminders. */
  notify: { tripAuto: boolean; missedTrip: boolean; proRenewal: boolean; trialEnding: boolean };
  /** FreeAgent mileage CSV "Claimant" column. */
  freeagentClaimant: string;
  /** X3: MTD quarters by standard (6 Apr) or calendar (1 Apr) periods. */
  mtdPeriod: 'standard' | 'calendar';
  /** S-07g: an NFC tag was written on this phone. */
  nfcTagWritten: boolean;
}

export type MergeStopMinutes = 10 | 20 | 45;

export interface WorkHours {
  on: boolean;
  days: number[];
  startMin: number;
  endMin: number;
}

/** weekday: 0 = Sunday … 6 = Saturday (JS Date convention). */
export const DEFAULT_SETTINGS: AppSettings = {
  region: null,
  onboarded: false,
  mileageRates: DEFAULT_RATES,
  defaultScope: 'work',
  keepAdding: false,
  distanceUnit: 'mi',
  reminder: { on: false, weekday: 0, hour: 18, minute: 0 },
  appLock: false,
  lockAfterMs: 60_000,
  theme: 'system',
  lastBackupAt: null,
  backupReminder: true,
  backupBannerSnoozedUntil: null,
  vehicleCostMethod: 'unsure',
  mergeStopMinutes: 20,
  workHours: { on: false, days: [1, 2, 3, 4, 5], startMin: 7 * 60, endMin: 19 * 60 },
  autoTrips: false,
  vanBtDevice: null,
  startOnCharge: false,
  backupFolder: null,
  backupNightly: false,
  backupFailCount: 0,
  lastAutoBackupAt: null,
  dailyNudge: { on: false, hour: 19, minute: 0, days: [1, 2, 3, 4, 5, 6] },
  notify: { tripAuto: true, missedTrip: true, proRenewal: true, trialEnding: true },
  freeagentClaimant: '',
  mtdPeriod: 'standard',
  nfcTagWritten: false,
};

export function getSettings(db: AppDb): AppSettings {
  const rows = db.select().from(settings).all();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      // Corrupt value: keep the default.
    }
  }
  const result = out as unknown as AppSettings;
  const uk = result.mileageRates?.UK;
  // Rates saved before the 2026/27 change (55p from 6 Apr 2026) still hold the old untouched default: read them as the
  // new default. Rates the user edited are kept as they are. Restored backups pass through here too.
  if (uk && sameRates(uk, LEGACY_UK_RATES)) result.mileageRates = { ...result.mileageRates, UK: DEFAULT_RATES.UK };
  return result;
}

const sameRates = (a: RateTier[], b: RateTier[]) =>
  Array.isArray(a) &&
  a.length === b.length &&
  a.every((t, i) => t.upToMiles === b[i].upToMiles && t.minorPerMile === b[i].minorPerMile && (t.from ?? null) === (b[i].from ?? null));

export function updateSettings(db: AppDb, patch: Partial<AppSettings>): AppSettings {
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      const json = JSON.stringify(value);
      tx.insert(settings).values({ key, value: json }).onConflictDoUpdate({ target: settings.key, set: { value: json } }).run();
    }
  });
  return getSettings(db);
}

export function clearSettings(db: AppDb) {
  db.delete(settings).run();
}

export const settingKeyExists = (db: AppDb, key: keyof AppSettings) =>
  db.select().from(settings).where(eq(settings.key, key)).get() !== undefined;
