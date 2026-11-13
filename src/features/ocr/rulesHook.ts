import type { AppDb } from '@/db/types';
import type { Scope } from '@/domain/types';

/**
 * The one place Quick capture / late OCR call S2's rule engine (F-07 "áp ngay lúc lưu").
 * S2 ships `applyRulesOnSave(db, entryId, now?)` + `undoAutoSort(db, entryId)` in `src/features/rules/applyOnSave.ts`
 * (branch s2-sort). That file is not on this branch, so the functions are plugged in here:
 *
 * TODO(merge S2+S3): replace `rulesHook` with
 *   import { applyRulesOnSave, undoAutoSort } from '@/features/rules/applyOnSave';
 * and make `afterSave` / `undoAfterSave` call them directly.
 */
export interface AutoSort {
  ruleId: string;
  categoryId: string;
  categoryName: string;
  scope: Scope;
}

export const rulesHook: {
  apply: ((db: AppDb, entryId: string, now?: number) => AutoSort | null) | null;
  undo: ((db: AppDb, entryId: string) => void) | null;
} = { apply: null, undo: null };

/** After createEntry (ocr_* already saved) and again after a late reading filled ocr_*. The rule engine checks Pro itself. */
export function afterSave(db: AppDb, entryId: string): AutoSort | null {
  try {
    return rulesHook.apply?.(db, entryId) ?? null;
  } catch {
    return null;
  }
}

/** "Undo" on "Saved · Fuel (auto-sorted)" — puts the entry back to Unsorted (the entry itself stays). */
export function undoAfterSave(db: AppDb, entryId: string): void {
  rulesHook.undo?.(db, entryId);
}
