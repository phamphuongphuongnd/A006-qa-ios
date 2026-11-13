import { normaliseNote } from './suggest';
import type { Minor } from './types';

/**
 * Shared contract between receipt OCR (S3) and suggestions / rules (S2), so S3 never edits `suggest.ts`:
 *
 *   S3: image → `modules/receipt-ocr` raw lines → parser → `ReceiptReading`
 *       → saved on the entry (`entries.ocr_amount_minor / ocr_merchant / ocr_date`) via `readingToEntryFields`.
 *   S2: entry row → `signalsOf(entry)` → `SuggestSignals` → suggest() / rule matching (`ruleMatchText`).
 */

/** What the OCR parser read from one receipt. Any field may be missing ("không đọc được thì im lặng"). */
export interface ReceiptReading {
  /** Total paid, in minor units. */
  amountMinor: Minor | null;
  /** Merchant as printed, e.g. "SHELL UK OIL PRODUCTS LTD". */
  merchant: string | null;
  /** Receipt date, epoch ms at local midnight. */
  date: number | null;
  /** 0..1 per field; the capture screen auto-fills only fields at or above `OCR_FILL_CONFIDENCE`. */
  confidence: { amount: number; merchant: number; date: number };
}

/** Below this, a field is not auto-filled (P1-12 shows nothing rather than a wrong value). */
export const OCR_FILL_CONFIDENCE = 0.6;

/** Extra signals suggestions and rules read besides note / amount / type (F-07 (2)). */
export interface SuggestSignals {
  merchant: string | null;
  /** Normalised merchant (rules, RuleOffer key); null without a merchant. */
  merchantKey: string | null;
  ocrAmountMinor: Minor | null;
  ocrDate: number | null;
}

/** Columns S3 writes on the entry (NewEntry / updateEntry fields with the same names). */
export function readingToEntryFields(r: ReceiptReading): { ocrAmountMinor: Minor | null; ocrMerchant: string | null; ocrDate: number | null } {
  const ok = (c: number) => c >= OCR_FILL_CONFIDENCE;
  return {
    ocrAmountMinor: r.amountMinor !== null && ok(r.confidence.amount) ? r.amountMinor : null,
    ocrMerchant: r.merchant !== null && ok(r.confidence.merchant) ? r.merchant.trim().slice(0, 80) || null : null,
    ocrDate: r.date !== null && ok(r.confidence.date) ? r.date : null,
  };
}

export function signalsOf(e: { ocrMerchant: string | null; ocrAmountMinor: Minor | null; ocrDate: number | null }): SuggestSignals {
  return { merchant: e.ocrMerchant, merchantKey: e.ocrMerchant ? merchantKey(e.ocrMerchant) || null : null, ocrAmountMinor: e.ocrAmountMinor, ocrDate: e.ocrDate };
}

const NOISE = new Set(['ltd', 'limited', 'plc', 'llc', 'inc', 'co', 'uk', 'gb', 'usa', 'us', 'the', 'store', 'stores', 'station', 'services', 'service', 'branch']);

/**
 * Merchant identity for rules and "Always sort … as …?" offers: lower case, no punctuation, no store numbers or
 * company suffixes, first two words. "SHELL UK OIL PRODUCTS LTD #4521" → "shell oil"; "Tesco Express" → "tesco express".
 */
export function merchantKey(s: string): string {
  return normaliseNote(s)
    .split(' ')
    .filter((w) => w && !NOISE.has(w) && !/\d/.test(w))
    .slice(0, 2)
    .join(' ');
}

/** Text a Rule's `matchText` is searched in: the note plus the receipt merchant (case-insensitive, normalised). */
export const ruleMatchText = (note: string, merchant: string | null) => normaliseNote(merchant ? `${note} ${merchant}` : note);
