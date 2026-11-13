import { and, eq } from 'drizzle-orm';

import { categories, entries, receipts, recurring, rules } from '@/db/schema';
import type { AppDb } from '@/db/types';
import type { Minor } from '@/domain/types';

/** OCR text kept per photo (product §8 Receipt.ocr_text; "xoá được" = cleared with the photo). Capped so a long till roll can't bloat backups. */
export const OCR_TEXT_MAX = 4000;

/** Stores the recognised text on the receipt row(s) of `entryId` that point at `filePath`. */
export function setReceiptOcrText(db: AppDb, entryId: string, filePath: string, text: string): void {
  const value = text.trim().slice(0, OCR_TEXT_MAX) || null;
  db.update(receipts)
    .set({ ocrText: value })
    .where(and(eq(receipts.entryId, entryId), eq(receipts.filePath, filePath)))
    .run();
}

export interface OcrEntryFields {
  ocrAmountMinor: Minor | null;
  ocrMerchant: string | null;
  ocrDate: number | null;
}

/**
 * Fills the entry's ocr_* columns that are still empty (a reading that finished after Save, or a photo added on S-05).
 * Never overwrites what an earlier photo read. Does not touch updatedAt: reading a photo is not an edit.
 */
export function fillEntryOcr(db: AppDb, entryId: string, f: OcrEntryFields): boolean {
  const cur = db
    .select({ a: entries.ocrAmountMinor, m: entries.ocrMerchant, d: entries.ocrDate })
    .from(entries)
    .where(eq(entries.id, entryId))
    .get();
  if (!cur) return false;
  const set: Partial<{ ocrAmountMinor: Minor; ocrMerchant: string; ocrDate: number }> = {};
  if (cur.a === null && f.ocrAmountMinor !== null) set.ocrAmountMinor = f.ocrAmountMinor;
  if (cur.m === null && f.ocrMerchant !== null) set.ocrMerchant = f.ocrMerchant;
  if (cur.d === null && f.ocrDate !== null) set.ocrDate = f.ocrDate;
  if (Object.keys(set).length === 0) return false;
  db.update(entries).set(set).where(eq(entries.id, entryId)).run();
  return true;
}

/** S-05 "Sorted by rule 'Shell → Fuel'" / "Created by recurring 'Van lease'" (F-05). Null when the rule / template is gone. */
export function entryOrigin(
  db: AppDb,
  e: { ruleId: string | null; recurringId: string | null },
): { rule: { id: string; label: string } | null; recurring: { id: string; name: string } | null } {
  let rule: { id: string; label: string } | null = null;
  if (e.ruleId) {
    const r = db
      .select({ id: rules.id, match: rules.matchText, cat: categories.name })
      .from(rules)
      .leftJoin(categories, eq(categories.id, rules.categoryId))
      .where(eq(rules.id, e.ruleId))
      .get();
    if (r) rule = { id: r.id, label: r.cat ? `${r.match} → ${r.cat}` : r.match };
  }
  let rec: { id: string; name: string } | null = null;
  if (e.recurringId) {
    const r = db.select({ id: recurring.id, note: recurring.note }).from(recurring).where(eq(recurring.id, e.recurringId)).get();
    if (r) rec = { id: r.id, name: r.note };
  }
  return { rule, recurring: rec };
}
