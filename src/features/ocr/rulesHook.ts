import type { AppDb } from '@/db/types';
import type { Scope } from '@/domain/types';
import { applyRulesOnSave, undoAutoSort } from '@/features/rules/applyOnSave';

/**
 * The one place Quick capture / late OCR call the rule engine (F-07 "áp ngay lúc lưu"): S2's `applyRulesOnSave` /
 * `undoAutoSort` (`src/features/rules/applyOnSave.ts`). Kept as a swappable hook so tests can stub it.
 */
export interface AutoSort {
  ruleId: string;
  categoryId: string;
  categoryName: string;
  scope: Scope;
  /** Work / Personal before the rule changed it — Undo puts it back. */
  previousScope?: Scope;
}

export const rulesHook: {
  apply: ((db: AppDb, entryId: string, now?: number) => AutoSort | null) | null;
  undo: ((db: AppDb, entryId: string, previousScope?: Scope) => void) | null;
} = { apply: applyRulesOnSave, undo: undoAutoSort };

/** After createEntry (ocr_* already saved) and again after a late reading filled ocr_*. The rule engine checks Pro itself. */
export function afterSave(db: AppDb, entryId: string): AutoSort | null {
  try {
    return rulesHook.apply?.(db, entryId) ?? null;
  } catch {
    return null;
  }
}

/** "Undo" on "Saved · Fuel (auto-sorted)" — puts the entry back to Unsorted (the entry itself stays). */
export function undoAfterSave(db: AppDb, entryId: string, previousScope?: Scope): void {
  rulesHook.undo?.(db, entryId, previousScope);
}
