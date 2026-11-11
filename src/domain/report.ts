import { inPeriod } from './taxYear';
import type { EntryType, Minor, Period, Scope } from './types';

export interface ReportEntry {
  type: EntryType;
  amountMinor: Minor;
  occurredAt: number;
  categoryId: string | null;
  scope: Scope;
}

export interface ReportCategory {
  id: string;
  name: string;
  taxLine: string;
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  type: EntryType;
  totalMinor: Minor;
}

export interface Report {
  incomeMinor: Minor;
  expenseMinor: Minor;
  profitMinor: Minor;
  /** Sum of personal entries left out (both types, absolute). */
  personalExcludedMinor: Minor;
  unsortedCount: number;
  byCategory: CategoryTotal[];
  byTaxLine: { taxLine: string; type: EntryType; totalMinor: Minor }[];
}

export const UNSORTED_NAME = 'Unsorted';

/** Totals for a period. Only work entries count unless includePersonal is set. */
export function buildReport(
  entries: ReportEntry[],
  categories: ReportCategory[],
  period: Period,
  opts: { includePersonal?: boolean } = {},
): Report {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const byCat = new Map<string, CategoryTotal>();
  const byLine = new Map<string, { taxLine: string; type: EntryType; totalMinor: Minor }>();
  let income = 0;
  let expense = 0;
  let personal = 0;
  let unsorted = 0;

  for (const e of entries) {
    if (!inPeriod(e.occurredAt, period)) continue;
    if (e.categoryId === null) unsorted++;
    if (e.scope === 'personal' && !opts.includePersonal) {
      personal += e.amountMinor;
      continue;
    }
    if (e.type === 'income') income += e.amountMinor;
    else expense += e.amountMinor;

    const cat = e.categoryId ? catById.get(e.categoryId) : undefined;
    const key = `${e.type}:${cat?.id ?? '-'}`;
    const ct = byCat.get(key) ?? { categoryId: cat?.id ?? null, name: cat?.name ?? UNSORTED_NAME, type: e.type, totalMinor: 0 };
    ct.totalMinor += e.amountMinor;
    byCat.set(key, ct);

    const line = cat?.taxLine ?? UNSORTED_NAME;
    const lk = `${e.type}:${line}`;
    const lt = byLine.get(lk) ?? { taxLine: line, type: e.type, totalMinor: 0 };
    lt.totalMinor += e.amountMinor;
    byLine.set(lk, lt);
  }

  const desc = <T extends { totalMinor: Minor }>(a: T, b: T) => b.totalMinor - a.totalMinor;
  return {
    incomeMinor: income,
    expenseMinor: expense,
    profitMinor: income - expense,
    personalExcludedMinor: personal,
    unsortedCount: unsorted,
    byCategory: [...byCat.values()].sort(desc),
    byTaxLine: [...byLine.values()].sort(desc),
  };
}
