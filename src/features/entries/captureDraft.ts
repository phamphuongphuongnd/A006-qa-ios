import { Directory, File, Paths } from 'expo-file-system';
import { useEffect } from 'react';

import type { EntryType, Scope } from '@/domain/types';
import { legacyToPlain } from '@/features/ocr/calc';
import { router } from '@/services/router';

/**
 * QA-100 MOD-3 / B-84: on a low-RAM phone Android may kill the app while the camera or a picker is open; coming back
 * started at Home and the typed entry was gone. Quick capture keeps what is typed in a small file until it is saved or
 * discarded; the next start reopens Quick capture with it (and the camera photo Android kept for us).
 */
export interface CaptureDraft {
  type: EntryType;
  expr: string;
  /** 2 = amounts written as typed ("1" = 1.00, Phương 18/11); missing = the old cash-register form. */
  exprV?: number;
  note: string;
  scope: Scope;
  at: number | null;
  photoUris: string[];
  /** Set just before the camera opens (B-89): a photo taken while the app was dead is found by its time. */
  cameraStartedAt?: number | null;
  savedAt: number;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const file = () => new File(Paths.document, 'capture-draft.json');

export function saveDraft(d: Omit<CaptureDraft, 'savedAt'>): void {
  try {
    const f = file();
    f.create({ overwrite: true });
    f.write(JSON.stringify({ ...d, exprV: 2, savedAt: Date.now() }));
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
    // A draft saved before 18/11 holds the amount cash-register style ("1250" = 12.50): same value in today's form.
    const expr = d.exprV === 2 ? d.expr : legacyToPlain(d.expr);
    return { ...d, expr, exprV: 2, photoUris: (d.photoUris ?? []).filter((u) => new File(u).exists) };
  } catch {
    return null;
  }
}

/**
 * QA-100 B-89: when Android recreates the app while the camera is open, React Native drops the camera result
 * ("Tried to access onActivityResult while context is not ready"), so expo-image-picker never hands it back. The
 * camera still wrote the photo into cache/ImagePicker/ — pick up non-empty files written after the camera opened.
 */
export function cameraPhotosSince(since: number, known: string[]): string[] {
  try {
    const dir = new Directory(Paths.cache, 'ImagePicker');
    if (!dir.exists) return [];
    const seen = new Set(known);
    return dir
      .list()
      .filter((f): f is File => f instanceof File)
      .filter((f) => (f.size ?? 0) > 0 && (f.modificationTime ?? 0) >= since - 2000 && !seen.has(f.uri))
      .sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0))
      .map((f) => f.uri);
  } catch {
    return [];
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
