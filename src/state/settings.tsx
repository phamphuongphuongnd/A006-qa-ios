import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { applyRegionToCategories, seedCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { getSettings, updateSettings, type AppSettings } from '@/db/settingsRepo';
import type { Region } from '@/domain/types';

import { useTablesVersion } from './useLive';

interface Ctx {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  /** First pick seeds categories; later changes re-label built-in categories. */
  setRegion: (region: Region) => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings(db));
  // Background work (nightly backup, recurring entries, trip checks) writes settings straight to the DB: re-read on
  // any write so screens never show a stale state (B-46). Adjusting state during render is React's sanctioned pattern.
  const version = useTablesVersion(['settings']);
  const [seen, setSeen] = useState(version);
  if (seen !== version) {
    setSeen(version);
    setSettings(getSettings(db));
  }

  const update = useCallback((patch: Partial<AppSettings>) => setSettings(updateSettings(db, patch)), []);

  const setRegion = useCallback((region: Region) => {
    const prev = getSettings(db).region;
    if (prev && prev !== region) applyRegionToCategories(db, prev, region);
    seedCategories(db, region);
    setSettings(updateSettings(db, { region }));
  }, []);

  return <SettingsCtx.Provider value={{ settings, update, setRegion }}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error('useSettings outside SettingsProvider');
  return c;
}
