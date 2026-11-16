import { eq, sql } from 'drizzle-orm';

import { getProStatus } from '@/db/proRepo';
import { categories, entries, rules } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { hasPro } from '@/domain/pro';
import type { Scope } from '@/domain/types';

import { pickRule } from './match';
import { activeRules } from './repo';

/** What `applyRulesOnSave` did, for the "Saved · auto-sorted as Fuel" snackbar and its Undo. */
export interface AutoSortResult {
  entryId: string;
  ruleId: string;
  categoryId: string;
  categoryName: string;
  scope: Scope;
  /** Scope before the rule, for `undoAutoSort`. */
  previousScope: Scope;
}

/**
 * Save-time auto-sort (F-07 "Áp ngay lúc lưu khoản", P1-10). Call right after the entry is written (quick capture,
 * and again if OCR fields arrive later). Only for Pro (trial counts) and only for an entry that is still unsorted.
 * The matching rule's category / scope / `rule_id` are written in one transaction and the rule's `hits` go up.
 * An entry marked Personal at capture stays Personal (same as the Sort card).
 * Returns null when nothing applied — the entry then waits for Sunday as usual.
 */
export function applyRulesOnSave(db: AppDb, entryId: string, now = Date.now()): AutoSortResult | null {
  if (!hasPro(getProStatus(db, now))) return null;
  const e = db.select().from(entries).where(eq(entries.id, entryId)).get();
  if (!e || e.categoryId !== null) return null;
  const rule = pickRule(activeRules(db), { type: e.type, note: e.note, amountMinor: e.amountMinor, ocrMerchant: e.ocrMerchant });
  if (!rule || !rule.categoryId) return null;
  const cat = db.select().from(categories).where(eq(categories.id, rule.categoryId)).get();
  if (!cat) return null;
  const scope: Scope = e.scope === 'personal' ? 'personal' : rule.scope;
  db.transaction((tx) => {
    tx.update(entries)
      .set({ categoryId: cat.id, scope, ruleId: rule.id, sortedAt: now, autoReviewedAt: null, updatedAt: now })
      .where(eq(entries.id, e.id))
      .run();
    tx.update(rules)
      .set({ hits: sql`${rules.hits} + 1`, lastHitAt: now })
      .where(eq(rules.id, rule.id))
      .run();
  });
  return { entryId: e.id, ruleId: rule.id, categoryId: cat.id, categoryName: cat.name, scope, previousScope: e.scope };
}

/** Undo from the save snackbar: the entry goes back to the Sort queue, unlabelled. */
export function undoAutoSort(db: AppDb, entryId: string, previousScope?: Scope, now = Date.now()): void {
  const e = db.select().from(entries).where(eq(entries.id, entryId)).get();
  if (!e || !e.ruleId) return;
  db.transaction((tx) => {
    tx.update(entries)
      .set({ categoryId: null, sortedAt: null, ruleId: null, autoReviewedAt: null, scope: previousScope ?? e.scope, updatedAt: now })
      .where(eq(entries.id, entryId))
      .run();
    tx.update(rules)
      .set({ hits: sql`MAX(0, ${rules.hits} - 1)` })
      .where(eq(rules.id, e.ruleId!))
      .run();
  });
}
