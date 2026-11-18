import { File, Paths } from 'expo-file-system';
import { useEffect } from 'react';

import type { EntryType, Scope } from '@/domain/types';
import { router } from '@/services/router';

/**
 * QA-100 MOD-3 / B-84: on a low-RAM phone Android may kill the app while the camera or a picker is open; coming back
 * started at Home and the typed entry was gone. Quick capture keeps what is typed in a small file until it is saved or
 * discarded; the next start reopens Quick capture with it (and the camera photo Android kept for us).
 */
export interface CaptureDraft {
  type: EntryType;
  expr: string;
  note: string;
  scope: Scope;
  at: number | null;
  photoUris: string[];
  savedAt: number;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const file = () => new File(Paths.document, 'capture-draft.json');

export function saveDraft(d: Omit<CaptureDraft, 'savedAt'>): void {
  try {
    const f = file();
    f.create({ overwrite: true });
    f.write(JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    // Best effort: a draft is a convenience.
  }
}

export function clearDraft(): void {
  try {
    const f = file();
    if (f.exists) f.delete();
  } catch {}
}

export function readDraft(now = Date.now()): CaptureDraft | null {
  try {
    const f = file();
    if (!f.exists) return null;
    const d = JSON.parse(f.textSync()) as CaptureDraft;
    if (!d || typeof d.expr !== 'string' || !(now - d.savedAt < MAX_AGE_MS)) {
      clearDraft();
      return null;
    }
    return { ...d, photoUris: (d.photoUris ?? []).filter((u) => new File(u).exists) };
  } catch {
    return null;
  }
}

let checked = false;

/** Home, once per app start: an unsaved Quick capture from a killed process opens again. */
export function useResumeCaptureDraft(): void {
  useEffect(() => {
    if (checked) return;
    checked = true;
    if (readDraft()) router.push('/capture?restore=1');
  }, []);
}
