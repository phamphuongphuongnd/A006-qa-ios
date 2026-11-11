import { eq } from 'drizzle-orm';

import { DEFAULT_RATES, type RateTier } from '@/domain/mileage';
import type { Region, Scope } from '@/domain/types';

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
  return out as unknown as AppSettings;
}

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
