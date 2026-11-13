import { merchantKey, ruleMatchText } from '@/domain/receiptSignal';
import { normaliseNote } from '@/domain/suggest';
import type { EntryType, Minor, Scope } from '@/domain/types';

/**
 * Pure rule logic (F-07 / F-09 / P1-10), no database: which rule sorts an entry, and when to offer a new one.
 * DB access lives in `repo.ts`; the save-time hook in `applyOnSave.ts`.
 */

export interface RuleLike {
  id: string;
  matchText: string;
  type: EntryType;
  minMinor: Minor | null;
  maxMinor: Minor | null;
  categoryId: string | null;
  scope: Scope;
  enabled: boolean;
  hits: number;
  createdAt: number;
}

export interface RuleTarget {
  type: EntryType;
  note: string;
  amountMinor: Minor;
  /** OCR merchant (entries.ocr_merchant). */
  ocrMerchant: string | null;
}

/** Whole-word, case-insensitive containment: "shell" matches "shell m62" but not "shellfish". */
export function textMatches(matchText: string, haystackNormalised: string): boolean {
  const m = normaliseNote(matchText);
  if (!m) return false;
  return ` ${haystackNormalised} `.includes(` ${m} `);
}

/** Rule applies to the entry: same type, text found in note / receipt merchant, amount inside the optional range. */
export function ruleMatches(rule: RuleLike, e: RuleTarget, { ignoreEnabled = false } = {}): boolean {
  if (!ignoreEnabled && (!rule.enabled || !rule.categoryId)) return false;
  if (rule.type !== e.type) return false;
  if (rule.minMinor !== null && e.amountMinor < rule.minMinor) return false;
  if (rule.maxMinor !== null && e.amountMinor > rule.maxMinor) return false;
  return textMatches(rule.matchText, ruleMatchText(e.note, e.ocrMerchant));
}

/**
 * The rule that sorts this entry, or null. Several can match ("Shell" and "Shell Leeds"): the most specific text wins
 * (more words, then longer), then an amount range, then the most used, then the oldest.
 */
export function pickRule<R extends RuleLike>(rules: R[], e: RuleTarget): R | null {
  const hits = rules.filter((r) => ruleMatches(r, e));
  if (hits.length === 0) return null;
  const words = (r: RuleLike) => normaliseNote(r.matchText).split(' ').length;
  const ranged = (r: RuleLike) => (r.minMinor !== null || r.maxMinor !== null ? 1 : 0);
  hits.sort(
    (a, b) =>
      words(b) - words(a) ||
      normaliseNote(b.matchText).length - normaliseNote(a.matchText).length ||
      ranged(b) - ranged(a) ||
      b.hits - a.hits ||
      a.createdAt - b.createdAt,
  );
  return hits[0];
}

// ---------- "Always sort … as …?" offers (P1-10) ----------

/** Sorts in a row needed before offering a rule. */
export const OFFER_AFTER = 3;
/** "Not now" silences a merchant for this long. */
export const OFFER_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Identity of a place for offers: first word of the merchant key (receipt merchant, else the note).
 * "Shell M62" and "Shell Leeds" are both "shell"; "DPD weekly payout" is "dpd". Empty when nothing usable.
 */
export function offerKey(note: string, ocrMerchant: string | null): string {
  const fromMerchant = ocrMerchant ? merchantKey(ocrMerchant) : '';
  const key = fromMerchant || merchantKey(note);
  return key.split(' ')[0] ?? '';
}

/** Words of a note as typed, punctuation trimmed, for display ("Kwik Fit tyres" → ["Kwik", "Fit", "tyres"]). */
const displayWords = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu, ''))
    .filter(Boolean);

/** "SHELL" → "Shell"; mixed case ("RingGo", "DPD" stays as typed unless the whole text is upper case). */
function tidyCase(words: string[], allUpper: boolean): string[] {
  if (!allUpper) return words;
  return words.map((w) => (w.length <= 3 ? w : w[0] + w.slice(1).toLowerCase()));
}

/**
 * Rule text offered for these notes (newest first): the leading words they share, at most two, no numbers.
 * ["Kwik Fit tyres", "Kwik Fit"] → "Kwik Fit"; ["Shell M62", "Shell Leeds"] → "Shell". Falls back to the key.
 */
export function offerLabel(texts: string[], key: string): string {
  const lists = texts.map(displayWords).filter((l) => l.length > 0);
  if (lists.length === 0) return key;
  const first = lists[0];
  const out: string[] = [];
  for (let i = 0; i < Math.min(2, first.length); i++) {
    const w = first[i];
    if (/\d/.test(w) || !merchantKey(w)) break; // numbers, "UK", "Ltd"… end the label
    if (!lists.every((l) => l[i] && l[i].toLowerCase() === w.toLowerCase())) break;
    out.push(w);
  }
  if (out.length === 0 || normaliseNote(out.join(' ')).split(' ')[0] !== key) return key;
  const joined = texts[0];
  return tidyCase(out, joined === joined.toUpperCase() && /[A-Z]/.test(joined)).join(' ');
}

export interface SortedForOffer {
  note: string;
  ocrMerchant: string | null;
  categoryId: string;
  scope: Scope;
}

/**
 * Offer a rule when the last `OFFER_AFTER` sorts of this place (newest first, same type) all went to one category.
 * Returns the rule text + scope to offer, or null.
 */
export function offerFrom(key: string, recentSameKey: SortedForOffer[]): { matchText: string; categoryId: string; scope: Scope } | null {
  if (!key || recentSameKey.length < OFFER_AFTER) return null;
  const last = recentSameKey.slice(0, OFFER_AFTER);
  const cat = last[0].categoryId;
  if (!last.every((s) => s.categoryId === cat)) return null;
  const texts = last.map((s) => (s.ocrMerchant && !normaliseNote(s.note) ? s.ocrMerchant : s.note || s.ocrMerchant || ''));
  return { matchText: offerLabel(texts, key), categoryId: cat, scope: last[0].scope };
}

// ---------- Rule sheet ----------

export interface RuleDraft {
  matchText: string;
  type: EntryType;
  minMinor: Minor | null;
  maxMinor: Minor | null;
  categoryId: string | null;
  scope: Scope;
}

export type RuleError = 'empty_text' | 'no_category' | 'bad_range';

export function checkRule(d: RuleDraft): RuleError | null {
  if (!normaliseNote(d.matchText)) return 'empty_text';
  if (!d.categoryId) return 'no_category';
  if (d.minMinor !== null && d.maxMinor !== null && d.minMinor > d.maxMinor) return 'bad_range';
  return null;
}
