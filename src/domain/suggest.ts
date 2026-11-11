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
}

export interface SuggestInput {
  type: EntryType;
  note: string;
  amountMinor: Minor;
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

/**
 * Ranks categories for one entry, entirely on-device.
 * Signals, strongest first: the user's own past sorting of notes with shared words (newer counts more),
 * matching amount (±10%), built-in keywords, then overall usage frequency as tie-breaker / filler.
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

  const norm = normaliseNote(input.note);
  const words = new Set(tokens(input.note));
  const scopeVotes = { work: 0, personal: 0 };

  history.slice(0, HISTORY_LIMIT).forEach((h, i) => {
    if (h.type !== input.type) return;
    add(h.categoryId, 0.01); // frequency
    if (words.size === 0) return;
    const hw = tokens(h.note);
    if (hw.length === 0) return;
    const shared = hw.filter((w) => words.has(w)).length;
    if (shared === 0) return;
    const overlap = shared / Math.max(words.size, hw.length);
    const recency = 1 + 1 / (1 + i / 10);
    let v = 3 * overlap * recency;
    if (normaliseNote(h.note) === norm) v += 2;
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
