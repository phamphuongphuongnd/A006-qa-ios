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
  /**
   * P1-1: stops shorter than this stay in one shift trip; end of trip after this long not driving.
   * B-149 (Phương 20/11): the driver's choice, whole minutes MERGE_STOP_MIN–MERGE_STOP_MAX (quick picks 5 · 10 · 20 + Custom).
   */
  mergeStopMinutes: MergeStopMinutes;
  /** P1-3: trips outside these hours are recorded as Personal. days: 0 = Sunday … 6; minutes after midnight. */
  workHours: WorkHours;
  /** Pro: record trips automatically (S-07d). */
  autoTrips: boolean;
  /** Android: van Bluetooth device that starts a trip at once (S-07d "Start faster"). */
  vanBtDevice: { address: string; name: string | null } | null;
  // B-145 (Phương 20/11): "Start when charging" is gone — a value still stored is ignored (not in DEFAULT_SETTINGS).
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
  /** S4 nightly bookkeeping: data fingerprint of the last nightly file, last try (retry next night), last error. */
  backupRun: { fingerprint: string | null; lastTryAt: number | null; lastError: 'folder' | 'space' | 'other' | null } | null;
  /** Q22: one notification after the shift if nothing was logged that day; off by default. */
  dailyNudge: { on: boolean; hour: number; minute: number; days: number[] };
  /** S-20 switches for the notifications that are not reminders. */
  notify: { tripAuto: boolean; missedTrip: boolean; proRenewal: boolean; trialEnding: boolean; backupTap: boolean };
  /** FreeAgent mileage CSV "Claimant" column. */
  freeagentClaimant: string;
  /** FreeAgent mileage CSV engine_type / engine_size (required for "Car"); asked with the claimant name. S5. */
  freeagentVehicle: { engineType: string; engineSize: string } | null;
  /** X3: MTD quarters by standard (6 Apr) or calendar (1 Apr) periods. */
  mtdPeriod: 'standard' | 'calendar';
  /** S-07g: an NFC tag was written on this phone. */
  nfcTagWritten: boolean;
  /** Q27 Odometer check reminder: off / every Monday / the 1st of the month (UK: + 6 April). */
  odometerCheck: 'off' | 'weekly' | 'monthly';
  /** Home alert cards hidden with ✕ until this time (7 days), by alert id (features/home/alerts.ts). */
  alertSnoozedUntil: Partial<Record<string, number>>;
  /** Q29: when the files of a period were last made in S-10, by the period's file stem ("2026-27-Q3"). */
  exportLog: Partial<Record<string, number>>;
}

/** Whole minutes, MERGE_STOP_MIN–MERGE_STOP_MAX. Values saved before B-149 (10 / 20 / 45) are inside the range and kept. */
export type MergeStopMinutes = number;
export const MERGE_STOP_MIN = 3;
export const MERGE_STOP_MAX = 60;
export const isMergeStopMinutes = (v: unknown): v is MergeStopMinutes =>
  typeof v === 'number' && Number.isInteger(v) && v >= MERGE_STOP_MIN && v <= MERGE_STOP_MAX;
/** What the driver typed in Custom: "7" → 7; anything else ("", "7.5", "2", "61", "1e1") → null. */
export function parseMergeStopMinutes(text: string): MergeStopMinutes | null {
  const s = text.trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  return isMergeStopMinutes(n) ? n : null;
}

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
  mergeStopMinutes: 10,
  workHours: { on: false, days: [1, 2, 3, 4, 5], startMin: 7 * 60, endMin: 19 * 60 },
  autoTrips: false,
  vanBtDevice: null,
  backupFolder: null,
  backupNightly: false,
  backupFailCount: 0,
  lastAutoBackupAt: null,
  backupRun: null,
  dailyNudge: { on: false, hour: 19, minute: 0, days: [1, 2, 3, 4, 5, 6] },
  notify: { tripAuto: true, missedTrip: true, proRenewal: true, trialEnding: true, backupTap: true },
  freeagentClaimant: '',
  freeagentVehicle: null,
  mtdPeriod: 'standard',
  nfcTagWritten: false,
  odometerCheck: 'monthly',
  alertSnoozedUntil: {},
  exportLog: {},
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ENUMS: Partial<Record<keyof AppSettings, readonly unknown[]>> = {
  region: ['UK', 'US', null],
  defaultScope: ['work', 'personal'],
  distanceUnit: ['mi', 'km'],
  lockAfterMs: [0, 60_000, 300_000],
  theme: ['system', 'light', 'dark'],
  vehicleCostMethod: ['mileage', 'actual', 'unsure'],
  mtdPeriod: ['standard', 'calendar'],
  odometerCheck: ['off', 'weekly', 'monthly'],
};
const NULLABLE_NUM = new Set<keyof AppSettings>(['lastBackupAt', 'backupBannerSnoozedUntil', 'lastAutoBackupAt']);
const NULLABLE_OBJ = new Set<keyof AppSettings>(['vanBtDevice', 'backupFolder', 'backupRun', 'freeagentVehicle']);
const ratesOk = (v: unknown) =>
  Array.isArray(v) && v.length > 0 && v.every((t) => isObj(t) && isNum(t.minorPerMile) && (t.upToMiles === null || isNum(t.upToMiles)));

/**
 * QA-100 SPE-4: a backup file with a wrong-typed setting (`region: "ZZ"`, `mileageRates: "x"`, `notify: null`) crashed
 * Miles / Reports / Settings on every open. A value that doesn't fit its setting is dropped (the default is used);
 * objects keep the default's fields the stored one lacks.
 */
export function saneSetting(key: keyof AppSettings, v: unknown): unknown {
  const def = DEFAULT_SETTINGS[key] as unknown;
  const allowed = ENUMS[key];
  if (allowed) return allowed.includes(v) ? v : undefined;
  if (key === 'mergeStopMinutes') return isMergeStopMinutes(v) ? v : undefined;
  if (NULLABLE_NUM.has(key)) return v === null || isNum(v) ? v : undefined;
  if (NULLABLE_OBJ.has(key)) return v === null || isObj(v) ? v : undefined;
  if (key === 'mileageRates') return isObj(v) && ratesOk(v.UK) && ratesOk(v.US) ? v : undefined;
  if (Array.isArray(def)) return Array.isArray(v) ? v : undefined;
  if (isObj(def)) {
    if (!isObj(v)) return undefined;
    // Fields of the wrong type fall back one by one (e.g. notify.tripAuto: "yes").
    const merged: Record<string, unknown> = { ...def };
    for (const [k, x] of Object.entries(v)) {
      const d = (def as Record<string, unknown>)[k];
      if (d === undefined || typeof x === typeof d || (Array.isArray(d) && Array.isArray(x))) merged[k] = x;
    }
    return merged;
  }
  if (typeof def === 'number') return isNum(v) ? v : undefined;
  return typeof v === typeof def ? v : undefined;
}

export function getSettings(db: AppDb): AppSettings {
  const rows = db.select().from(settings).all();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    try {
      const v = saneSetting(r.key as keyof AppSettings, JSON.parse(r.value));
      if (v !== undefined) out[r.key] = v;
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
