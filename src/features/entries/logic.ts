import type { EntryFilter } from '@/db/entriesRepo';
import type { AppSettings } from '@/db/settingsRepo';
import { appendDigit, parseMinor } from '@/domain/money';
import type { EntryType, Minor, Period, Scope } from '@/domain/types';
import { weekOf } from '@/domain/week';

const DAY = 24 * 60 * 60 * 1000;

// ---------- Quick capture keypad ----------

/**
 * The amount is typed on the system number pad into a hidden input. Its text is the digit string; this turns it
 * into minor units the cash-register way ("1250" → 1250 = 12.50). Digits past the 999,999.99 limit are dropped.
 */
export function keypadValue(text: string): Minor {
  let v = 0;
  for (const ch of text.replace(/\D/g, '')) v = appendDigit(v, Number(ch));
  return v;
}

/** Text to put back in the hidden input for a value (empty for 0 so the pad starts clean). */
export const keypadText = (minor: Minor) => (minor > 0 ? String(minor) : '');

// ---------- Entries filters ----------

export type DateRange = 'any' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'taxYear';

export interface EntriesFilterState {
  search: string;
  unsorted: boolean;
  type: EntryType | null;
  scope: Scope | null;
  withReceipt: boolean;
  recurring: boolean;
  autoSorted: boolean;
  date: DateRange;
  /** Explicit period from a deep link (Reports → Entries); overrides `date`. */
  period: Period | null;
  categoryId: string | null;
}

export const EMPTY_FILTER: EntriesFilterState = {
  search: '',
  unsorted: false,
  type: null,
  scope: null,
  withReceipt: false,
  recurring: false,
  autoSorted: false,
  date: 'any',
  period: null,
  categoryId: null,
};

export const hasActiveFilter = (f: EntriesFilterState) =>
  !!f.search.trim() || f.unsorted || !!f.type || !!f.scope || f.withReceipt || f.recurring || f.autoSorted || f.date !== 'any' || !!f.period || !!f.categoryId;

export function datePeriod(range: DateRange, now: number, taxYear: Period): Period | undefined {
  const d = new Date(now);
  switch (range) {
    case 'any':
      return undefined;
    case 'thisWeek':
      return weekOf(now);
    case 'lastWeek':
      return weekOf(weekOf(now).start - DAY);
    case 'thisMonth':
      return { start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() };
    case 'lastMonth':
      return { start: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), end: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
    case 'taxYear':
      return taxYear;
  }
}

export function toRepoFilter(f: EntriesFilterState, now: number, taxYear: Period): EntryFilter {
  return {
    search: f.search.trim() || undefined,
    unsorted: f.unsorted || undefined,
    type: f.type ?? undefined,
    scope: f.scope ?? undefined,
    withReceipt: f.withReceipt || undefined,
    recurring: f.recurring || undefined,
    autoSorted: f.autoSorted || undefined,
    categoryId: f.categoryId ?? undefined,
    period: f.period ?? datePeriod(f.date, now, taxYear),
  };
}

// ---------- Weekly sort queue ----------

/**
 * Card order for one week: unsorted entries oldest first; skipped ones go to the back in the order they were
 * skipped. Entries that got sorted meanwhile drop out.
 */
export function sortQueue<T extends { id: string; occurredAt: number; categoryId: string | null }>(entries: T[], skipped: string[]): T[] {
  const open = entries.filter((e) => e.categoryId === null).sort((a, b) => a.occurredAt - b.occurredAt);
  const skipSet = new Set(skipped);
  const head = open.filter((e) => !skipSet.has(e.id));
  const byId = new Map(open.map((e) => [e.id, e]));
  const tail = skipped.map((id) => byId.get(id)).filter((e): e is T => !!e);
  return [...head, ...tail];
}

/** Week shown on the Sort tab: the user's pick while it still has work, else the newest week with unsorted entries. */
export function pickSortWeek(chosen: number | null, weeksWithWork: { week: Period }[]): Period | null {
  if (chosen !== null) {
    const w = weeksWithWork.find((x) => x.week.start === chosen);
    if (w) return w.week;
  }
  return weeksWithWork[0]?.week ?? null;
}

// ---------- Backup reminder ----------

export const BACKUP_DUE_MS = 30 * DAY;
export const BACKUP_SNOOZE_MS = 7 * DAY;

/** Backup is due: never backed up with ≥ 20 entries, or last backup over 30 days ago. Ignores snooze. */
export function backupDue(s: Pick<AppSettings, 'lastBackupAt'>, entryCount: number, now = Date.now()): boolean {
  if (s.lastBackupAt === null) return entryCount >= 20;
  return now - s.lastBackupAt > BACKUP_DUE_MS;
}

/** Home banner: due, reminders on, and not snoozed. */
export function showBackupBanner(
  s: Pick<AppSettings, 'lastBackupAt' | 'backupReminder' | 'backupBannerSnoozedUntil'>,
  entryCount: number,
  now = Date.now(),
): boolean {
  if (!s.backupReminder) return false;
  if (s.backupBannerSnoozedUntil !== null && now < s.backupBannerSnoozedUntil) return false;
  return backupDue(s, entryCount, now);
}

export const daysSince = (at: number, now = Date.now()) => Math.floor((now - at) / DAY);

// ---------- Split editor ----------

/** Typed part amount ("45", "45.5", "£45.00") → minor units; invalid or negative → 0. */
export function partMinor(text: string): Minor {
  const v = parseMinor(text);
  return v !== null && v > 0 ? v : 0;
}

/** Amount for a newly added part: whatever is still unassigned, else empty. */
export const newPartMinor = (total: Minor, parts: Minor[]) => Math.max(0, total - parts.reduce((a, b) => a + b, 0));

// ---------- Sort card ----------

/**
 * Work/Personal switch on a sort card. An entry already marked Personal stays Personal (the user said so at capture
 * or split); history only nudges entries that are still Work.
 */
export const sortCardScope = (entryScope: Scope, suggested: Scope | null): Scope =>
  entryScope === 'personal' ? 'personal' : (suggested ?? entryScope);

// ---------- Multi-select ----------

/** Work/Personal action on a selection: all work → personal, otherwise everything becomes work. */
export const toggledScope = (scopes: Scope[]): Scope => (scopes.length > 0 && scopes.every((s) => s === 'work') ? 'personal' : 'work');

/** One type shared by every selected entry, or null when mixed / empty. */
export function commonType(types: EntryType[]): EntryType | null {
  if (types.length === 0) return null;
  return types.every((t) => t === types[0]) ? types[0] : null;
}
