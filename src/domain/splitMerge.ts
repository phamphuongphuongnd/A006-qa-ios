import type { EntryType, Minor, Scope } from './types';

export const MAX_SPLIT_PARTS = 10;

/** Equal parts; any leftover pence go to the first part. */
export function defaultSplit(total: Minor, parts = 2): Minor[] {
  const n = Math.max(2, Math.min(MAX_SPLIT_PARTS, parts));
  const base = Math.floor(total / n);
  const out = Array<Minor>(n).fill(base);
  out[0] += total - base * n;
  return out;
}

export interface SplitCheck {
  /** total − sum(parts): positive = left to assign, negative = over. */
  remaining: Minor;
  valid: boolean;
}

export function checkSplit(total: Minor, parts: Minor[]): SplitCheck {
  const sum = parts.reduce((a, b) => a + b, 0);
  const remaining = total - sum;
  const valid =
    parts.length >= 2 && parts.length <= MAX_SPLIT_PARTS && parts.every((p) => Number.isInteger(p) && p > 0) && remaining === 0;
  return { remaining, valid };
}

export interface MergeSource {
  type: EntryType;
  amountMinor: Minor;
  occurredAt: number;
  note: string;
  categoryId: string | null;
  scope: Scope;
}

export type MergePlan =
  | { ok: true; merged: Omit<MergeSource, never> }
  | { ok: false; reason: 'too_few' | 'mixed_types' };

/**
 * Merge ≥2 entries of the same type: amounts add up, date = earliest, notes joined with " · " (blank and
 * duplicate notes dropped), category kept only if all agree (else unsorted), scope kept only if all agree (else work).
 */
export function planMerge(entries: MergeSource[]): MergePlan {
  if (entries.length < 2) return { ok: false, reason: 'too_few' };
  const type = entries[0].type;
  if (entries.some((e) => e.type !== type)) return { ok: false, reason: 'mixed_types' };
  const sorted = [...entries].sort((a, b) => a.occurredAt - b.occurredAt);
  const notes: string[] = [];
  for (const e of sorted) {
    const n = e.note.trim();
    if (n && !notes.some((x) => x.toLowerCase() === n.toLowerCase())) notes.push(n);
  }
  const cat = sorted[0].categoryId;
  const scope = sorted[0].scope;
  return {
    ok: true,
    merged: {
      type,
      amountMinor: sorted.reduce((a, e) => a + e.amountMinor, 0),
      occurredAt: sorted[0].occurredAt,
      note: notes.join(' · '),
      categoryId: sorted.every((e) => e.categoryId === cat) ? cat : null,
      scope: sorted.every((e) => e.scope === scope) ? scope : 'work',
    },
  };
}
