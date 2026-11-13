import { CATEGORY_KEYWORDS, type CategoryKey } from './categories';
import type { EntryType, Minor, Scope } from './types';

export interface SuggestCategory {
  id: string;
  type: EntryType;
  key: CategoryKey | null;
  hidden: boolean;
  order: number;
}

/** A previously sorted entry. Pass newest first. */
export interface SortedEntry {
  type: EntryType;
  note: string;
  amountMinor: Minor;
  categoryId: string;
  scope: Scope;
  /** Merchant OCR read from its receipt, if any (F-07 (2)). */
  merchant?: string | null;
}

export interface SuggestInput {
  type: EntryType;
  note: string;
  amountMinor: Minor;
  /** Receipt merchant from OCR (`signalsOf(entry).merchant`); its words count like note words. */
  merchant?: string | null;
  /** Total OCR read; used as a second amount signal when it differs from the typed amount. */
  ocrAmountMinor?: Minor | null;
}

export interface Suggestion {
  /** Up to 3 category ids, best first. */
  categoryIds: string[];
  /** Work/personal suggestion from history, or null when there is no signal. */
  scope: Scope | null;
}

/** Lower-case, strip punctuation (keeps & and -), collapse spaces. */
export function normaliseNote(note: string): string {
  return note
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&\- ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(note: string): string[] {
  return normaliseNote(note)
    .split(' ')
    .filter((t) => t.length > 1 || /\d/.test(t));
}

function keywordHit(normalised: string, words: Set<string>, keyword: string): boolean {
  return keyword.includes(' ') ? ` ${normalised} `.includes(` ${keyword} `) : words.has(keyword);
}

const HISTORY_LIMIT = 500;
/** F-07 (3): the amount alone is a signal when it is within ±2% of a recently sorted entry. */
export const AMOUNT_MATCH = 0.02;
/** Only this many newest sorted entries feed the amount-only signal (older prices drift). */
const AMOUNT_HISTORY = 150;

/** Same amount within ±2% (at least 1 minor unit of slack for small amounts). */
export function amountClose(a: Minor, b: Minor): boolean {
  if (a <= 0 || b <= 0) return false;
  return Math.abs(a - b) <= Math.max(1, Math.round(a * AMOUNT_MATCH));
}

/** Words of the note plus the receipt merchant (OCR), for matching against history. */
function wordsOf(note: string, merchant?: string | null): string[] {
  const w = tokens(note);
  if (merchant) for (const x of tokens(merchant)) if (!w.includes(x)) w.push(x);
  return w;
}

/**
 * Ranks categories for one entry, entirely on-device (Pro "Suggested", F-07).
 * Signals, strongest first: the user's own past sorting of notes / receipt merchants with shared words (newer counts
 * more), the amount on its own (±2% of a recent sorted entry, even with a different note), built-in keywords, then
 * overall usage frequency as tie-breaker / filler.
 */
export function suggest(
  input: SuggestInput,
  categories: SuggestCategory[],
  history: SortedEntry[],
): Suggestion {
  const candidates = categories.filter((c) => c.type === input.type && !c.hidden);
  const score = new Map<string, number>(candidates.map((c) => [c.id, 0]));
  const add = (id: string, v: number) => {
    if (score.has(id)) score.set(id, (score.get(id) ?? 0) + v);
  };

  const norm = normaliseNote(input.merchant ? `${input.note} ${input.merchant}` : input.note);
  const words = new Set(wordsOf(input.note, input.merchant));
  const scopeVotes = { work: 0, personal: 0 };
  const amounts = [input.amountMinor, input.ocrAmountMinor ?? 0].filter((a) => a > 0);

  history.slice(0, HISTORY_LIMIT).forEach((h, i) => {
    if (h.type !== input.type) return;
    add(h.categoryId, 0.01); // frequency
    const recency = 1 + 1 / (1 + i / 10);
    const hw = words.size === 0 ? [] : wordsOf(h.note, h.merchant);
    const shared = hw.filter((w) => words.has(w)).length;
    if (shared === 0) {
      // (3) Amount on its own: same price as something sorted recently ("£3.50" parking, "£620" weekly payout).
      if (i < AMOUNT_HISTORY && amounts.some((a) => amountClose(a, h.amountMinor))) {
        add(h.categoryId, 0.8 * recency); // category only: a shared price says nothing about Work / Personal
      }
      return;
    }
    const overlap = shared / Math.max(words.size, hw.length);
    let v = 3 * overlap * recency;
    if (normaliseNote(h.merchant ? `${h.note} ${h.merchant}` : h.note) === norm) v += 2;
    if (input.amountMinor > 0 && Math.abs(h.amountMinor - input.amountMinor) <= input.amountMinor * 0.1) v += 1;
    add(h.categoryId, v);
    scopeVotes[h.scope] += v;
  });

  if (norm) {
    for (const c of candidates) {
      if (!c.key) continue;
      if (CATEGORY_KEYWORDS[c.key].some((k) => keywordHit(norm, words, k))) add(c.id, 2);
    }
  }

  const ranked = [...candidates].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || a.order - b.order);

  const scope: Scope | null =
    scopeVotes.work === scopeVotes.personal ? null : scopeVotes.work > scopeVotes.personal ? 'work' : 'personal';

  return { categoryIds: ranked.slice(0, 3).map((c) => c.id), scope };
}

/** Free "Most used" (F-07): category ids by how often they were used in the last 90 days, ties by category order. */
export function mostUsed(
  type: EntryType,
  categories: SuggestCategory[],
  usage: { categoryId: string; count: number }[],
  n = 3,
): string[] {
  const count = new Map(usage.map((u) => [u.categoryId, u.count]));
  return categories
    .filter((c) => c.type === type && !c.hidden)
    .sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0) || a.order - b.order)
    .slice(0, n)
    .map((c) => c.id);
}
