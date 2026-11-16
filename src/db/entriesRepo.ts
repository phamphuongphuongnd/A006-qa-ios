import { and, count, desc, eq, exists, gte, inArray, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm';

import { convertMinor, parseMinor } from '@/domain/money';
import { checkSplit, planMerge } from '@/domain/splitMerge';
import type { SortedEntry } from '@/domain/suggest';
import type { Currency, EntrySource, EntryType, Minor, Period, Scope } from '@/domain/types';
import { weekOf } from '@/domain/week';

import { entries, receipts, type EntryRow, type ReceiptRow } from './schema';
import { newId, type AppDb } from './types';

export interface NewEntry {
  type: EntryType;
  amountMinor: Minor;
  currency: Currency;
  occurredAt?: number;
  note?: string;
  scope?: Scope;
  categoryId?: string | null;
  /** Paths (relative to the receipts dir) of photos already saved to disk. */
  receiptPaths?: string[];
  /** Bản 2: set by the recurring generator / rule engine / OCR (S2–S4). */
  source?: EntrySource;
  recurringId?: string | null;
  ruleId?: string | null;
  ocrAmountMinor?: Minor | null;
  ocrMerchant?: string | null;
  ocrDate?: number | null;
  /** Q28: Parking & tolls typed on this trip. */
  tripId?: string | null;
}

export function createEntry(db: AppDb, input: NewEntry, now = Date.now()): EntryRow {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('amount must be a positive integer');
  const id = newId();
  const categoryId = input.categoryId ?? null;
  const row = {
    id,
    type: input.type,
    amountMinor: input.amountMinor,
    currency: input.currency,
    occurredAt: input.occurredAt ?? now,
    note: (input.note ?? '').trim().slice(0, 120),
    categoryId,
    scope: input.scope ?? 'work',
    sortedAt: categoryId ? now : null,
    splitGroupId: null,
    splitFromMinor: null,
    createdAt: now,
    updatedAt: now,
    source: input.source ?? 'manual',
    ruleId: input.ruleId ?? null,
    recurringId: input.recurringId ?? null,
    autoReviewedAt: null,
    ocrAmountMinor: input.ocrAmountMinor ?? null,
    ocrMerchant: input.ocrMerchant ?? null,
    ocrDate: input.ocrDate ?? null,
    tripId: input.tripId ?? null,
    exportedAt: null,
  } satisfies EntryRow;
  db.transaction((tx) => {
    tx.insert(entries).values(row).run();
    for (const p of input.receiptPaths ?? []) {
      tx.insert(receipts).values({ id: newId(), entryId: id, filePath: p, createdAt: now }).run();
    }
  });
  return row;
}

export const getEntry = (db: AppDb, id: string) => db.select().from(entries).where(eq(entries.id, id)).get();

export type EntryPatch = Partial<Pick<EntryRow, 'type' | 'amountMinor' | 'occurredAt' | 'note' | 'categoryId' | 'scope'>>;

export function updateEntry(db: AppDb, id: string, patch: EntryPatch, now = Date.now()): void {
  const set: Partial<EntryRow> = { ...patch, updatedAt: now };
  if (patch.note !== undefined) set.note = patch.note.trim().slice(0, 120);
  if (patch.amountMinor !== undefined && (!Number.isInteger(patch.amountMinor) || patch.amountMinor <= 0)) {
    throw new Error('amount must be a positive integer');
  }
  if (patch.categoryId !== undefined) set.sortedAt = patch.categoryId ? now : null;
  // Switching income/expense invalidates the category.
  if (patch.type !== undefined && patch.categoryId === undefined) {
    const cur = getEntry(db, id);
    if (cur && cur.type !== patch.type) {
      set.categoryId = null;
      set.sortedAt = null;
    }
  }
  db.update(entries).set(set).where(eq(entries.id, id)).run();
}

/** Sort one entry (the Sunday action). */
export function categorise(db: AppDb, id: string, categoryId: string, scope?: Scope, now = Date.now()) {
  updateEntry(db, id, scope ? { categoryId, scope } : { categoryId }, now);
}

export function categoriseMany(db: AppDb, items: { id: string; categoryId: string }[], now = Date.now()) {
  db.transaction((tx) => {
    for (const it of items) {
      tx.update(entries).set({ categoryId: it.categoryId, sortedAt: now, updatedAt: now }).where(eq(entries.id, it.id)).run();
    }
  });
}

export const listReceipts = (db: AppDb, entryId: string): ReceiptRow[] =>
  db.select().from(receipts).where(eq(receipts.entryId, entryId)).all();

export function addReceipt(db: AppDb, entryId: string, filePath: string, now = Date.now()): ReceiptRow {
  const row: ReceiptRow = { id: newId(), entryId, filePath, createdAt: now, ocrText: null };
  db.insert(receipts).values(row).run();
  return row;
}

/** Removes one receipt row; returns its path if no other entry still uses the file (caller deletes it). */
export function removeReceipt(db: AppDb, receiptId: string): string | null {
  const r = db.select().from(receipts).where(eq(receipts.id, receiptId)).get();
  if (!r) return null;
  db.delete(receipts).where(eq(receipts.id, receiptId)).run();
  return orphanedFiles(db, [r.filePath])[0] ?? null;
}

/** Paths in `paths` no longer referenced by any receipt row. */
export function orphanedFiles(db: AppDb, paths: string[]): string[] {
  if (paths.length === 0) return [];
  const used = new Set(
    db.select({ p: receipts.filePath }).from(receipts).where(inArray(receipts.filePath, paths)).all().map((r) => r.p),
  );
  return [...new Set(paths)].filter((p) => !used.has(p));
}

// ---------- Undo snapshots ----------

export interface Snapshot {
  entries: EntryRow[];
  receipts: ReceiptRow[];
  /** Entries created by the operation, removed again on undo. */
  createdIds: string[];
}

function snapshotOf(db: AppDb, ids: string[]): Omit<Snapshot, 'createdIds'> {
  if (ids.length === 0) return { entries: [], receipts: [] };
  return {
    entries: db.select().from(entries).where(inArray(entries.id, ids)).all(),
    receipts: db.select().from(receipts).where(inArray(receipts.entryId, ids)).all(),
  };
}

/** Deletes entries; returns a snapshot for Undo and the files that became unused. */
export function deleteEntries(db: AppDb, ids: string[]): { snapshot: Snapshot; orphaned: string[] } {
  const snap = snapshotOf(db, ids);
  db.delete(entries).where(inArray(entries.id, ids)).run();
  return { snapshot: { ...snap, createdIds: [] }, orphaned: orphanedFiles(db, snap.receipts.map((r) => r.filePath)) };
}

/**
 * Undo for delete / merge / split. Only call while the snapshot's files still exist
 * (the UI defers deleting orphaned files until the Undo snackbar is gone).
 */
export function restoreSnapshot(db: AppDb, snap: Snapshot): void {
  db.transaction((tx) => {
    if (snap.createdIds.length) tx.delete(entries).where(inArray(entries.id, snap.createdIds)).run();
    if (snap.entries.length) tx.insert(entries).values(snap.entries).onConflictDoNothing().run();
    if (snap.receipts.length) tx.insert(receipts).values(snap.receipts).onConflictDoNothing().run();
  });
}

// ---------- Merge & split ----------

export type MergeResult = { ok: true; id: string; snapshot: Snapshot } | { ok: false; reason: 'too_few' | 'mixed_types' };

export function mergeEntries(db: AppDb, ids: string[], now = Date.now()): MergeResult {
  const snap = snapshotOf(db, ids);
  const plan = planMerge(snap.entries);
  if (!plan.ok) return plan;
  const id = newId();
  const m = plan.merged;
  db.transaction((tx) => {
    tx.insert(entries)
      .values({
        id,
        ...m,
        currency: snap.entries[0].currency,
        sortedAt: m.categoryId ? now : null,
        splitGroupId: null,
        splitFromMinor: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    for (const r of snap.receipts) tx.insert(receipts).values({ id: newId(), entryId: id, filePath: r.filePath, createdAt: r.createdAt }).run();
    tx.delete(entries).where(inArray(entries.id, ids)).run();
  });
  return { ok: true, id, snapshot: { ...snap, createdIds: [id] } };
}

export interface SplitPart {
  amountMinor: Minor;
  categoryId: string | null;
  scope: Scope;
  note: string;
}

export type SplitResult = { ok: true; ids: string[]; snapshot: Snapshot } | { ok: false; reason: 'not_found' | 'invalid' };

/** Replaces one entry with N parts that add up to it. Every part keeps all receipt photos. */
export function splitEntry(db: AppDb, id: string, parts: SplitPart[], now = Date.now()): SplitResult {
  const snap = snapshotOf(db, [id]);
  const src = snap.entries[0];
  if (!src) return { ok: false, reason: 'not_found' };
  if (!checkSplit(src.amountMinor, parts.map((p) => p.amountMinor)).valid) return { ok: false, reason: 'invalid' };
  const group = src.splitGroupId ?? newId();
  const ids: string[] = [];
  db.transaction((tx) => {
    for (const p of parts) {
      const pid = newId();
      ids.push(pid);
      tx.insert(entries)
        .values({
          id: pid,
          type: src.type,
          amountMinor: p.amountMinor,
          currency: src.currency,
          occurredAt: src.occurredAt,
          note: p.note.trim().slice(0, 120),
          categoryId: p.categoryId,
          scope: p.scope,
          sortedAt: p.categoryId ? now : null,
          splitGroupId: group,
          splitFromMinor: src.splitFromMinor ?? src.amountMinor,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      for (const r of snap.receipts) tx.insert(receipts).values({ id: newId(), entryId: pid, filePath: r.filePath, createdAt: r.createdAt }).run();
    }
    tx.delete(entries).where(eq(entries.id, id)).run();
  });
  return { ok: true, ids, snapshot: { ...snap, createdIds: ids } };
}

export const splitSiblings = (db: AppDb, groupId: string) =>
  db.select().from(entries).where(eq(entries.splitGroupId, groupId)).orderBy(desc(entries.amountMinor)).all();

// ---------- Queries ----------

export interface EntryFilter {
  search?: string;
  type?: EntryType;
  scope?: Scope;
  unsorted?: boolean;
  withReceipt?: boolean;
  /** Bản 2 chips: made by a Recurring template / sorted by a Rule. */
  recurring?: boolean;
  autoSorted?: boolean;
  categoryId?: string;
  period?: Period;
  limit?: number;
  /** Default newest first. */
  oldestFirst?: boolean;
  /** Only entries on or after (newest-first) / before (oldest-first) this instant — used to finish a page's last day. */
  boundary?: number;
}

export interface EntryListItem extends EntryRow {
  receiptCount: number;
}

// Raw SELECT with camelCase aliases: rows come back as plain objects, skipping drizzle's per-row result mapping
// (measured on a Galaxy A13 with 1,515 entries: 475 ms through the query builder vs 165 ms raw).
const LIST_COLUMNS = sql.raw(
  `"entries"."id" AS id, "entries"."type" AS type, "entries"."amount_minor" AS amountMinor, "entries"."currency" AS currency,
  "entries"."occurred_at" AS occurredAt, "entries"."note" AS note, "entries"."category_id" AS categoryId,
  "entries"."scope" AS scope, "entries"."sorted_at" AS sortedAt, "entries"."split_group_id" AS splitGroupId,
  "entries"."split_from_minor" AS splitFromMinor, "entries"."created_at" AS createdAt, "entries"."updated_at" AS updatedAt,
  "entries"."source" AS source, "entries"."rule_id" AS ruleId, "entries"."recurring_id" AS recurringId,
  "entries"."auto_reviewed_at" AS autoReviewedAt, "entries"."ocr_amount_minor" AS ocrAmountMinor,
  "entries"."ocr_merchant" AS ocrMerchant, "entries"."ocr_date" AS ocrDate,
  "entries"."trip_id" AS tripId, "entries"."exported_at" AS exportedAt,
  (SELECT COUNT(*) FROM "receipts" WHERE "receipts"."entry_id" = "entries"."id") AS receiptCount`,
);

export function listEntries(db: AppDb, f: EntryFilter = {}): EntryListItem[] {
  const where = entryWhere(db, f);
  if (f.boundary !== undefined) where.push(f.oldestFirst ? lt(entries.occurredAt, f.boundary) : gte(entries.occurredAt, f.boundary));
  const dir = sql.raw(f.oldestFirst ? 'ASC' : 'DESC');
  return db.all<EntryListItem>(
    sql`SELECT ${LIST_COLUMNS} FROM "entries" ${where.length ? sql`WHERE ${and(...where)}` : sql``}
      ORDER BY "entries"."occurred_at" ${dir}, "entries"."created_at" ${dir} LIMIT ${f.limit ?? -1}`,
  );
}

/**
 * One page for the Entries list: at least `limit` entries, extended so the last day is complete (day headers show
 * that day's totals). `more` = there may be older (newer when oldest-first) entries past this page.
 */
export function listEntriesPage(db: AppDb, f: EntryFilter, limit: number): { rows: EntryListItem[]; more: boolean } {
  const rows = listEntries(db, { ...f, limit });
  if (rows.length < limit) return { rows, more: false };
  const last = new Date(rows[rows.length - 1].occurredAt);
  last.setHours(0, 0, 0, 0);
  if (f.oldestFirst) last.setDate(last.getDate() + 1);
  return { rows: listEntries(db, { ...f, limit: undefined, boundary: last.getTime() }), more: true };
}

function entryWhere(db: AppDb, f: EntryFilter): SQL[] {
  const where: SQL[] = [];
  if (f.type) where.push(eq(entries.type, f.type));
  if (f.scope) where.push(eq(entries.scope, f.scope));
  if (f.unsorted) where.push(isNull(entries.categoryId));
  if (f.categoryId) where.push(eq(entries.categoryId, f.categoryId));
  if (f.recurring) where.push(isNotNull(entries.recurringId));
  if (f.autoSorted) where.push(isNotNull(entries.ruleId));
  if (f.period) where.push(gte(entries.occurredAt, f.period.start), lt(entries.occurredAt, f.period.end));
  if (f.withReceipt) where.push(exists(db.select().from(receipts).where(eq(receipts.entryId, entries.id))));
  const q = f.search?.trim();
  if (q) {
    const minor = parseMinor(q);
    const esc = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    const byNote = sql`${entries.note} LIKE ${`%${esc}%`} ESCAPE '\\'`;
    where.push(minor !== null && minor > 0 ? (or(byNote, eq(entries.amountMinor, minor)) as SQL) : byNote);
  }
  return where;
}

export function unsortedCount(db: AppDb, period?: Period): number {
  const where: SQL[] = [isNull(entries.categoryId)];
  if (period) where.push(gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end));
  return db.select({ n: count() }).from(entries).where(and(...where)).get()?.n ?? 0;
}

/** Pro "N auto-sorted this week": entries a Rule sorted in the period that the driver hasn't reviewed yet. */
export function autoSortedCount(db: AppDb, period: Period): number {
  return (
    db
      .select({ n: count() })
      .from(entries)
      .where(and(isNotNull(entries.ruleId), isNull(entries.autoReviewedAt), gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end)))
      .get()?.n ?? 0
  );
}

/** Weeks (newest first) that still have unsorted entries, with counts — for the Sort week picker. */
export function unsortedWeeks(db: AppDb): { week: Period; count: number }[] {
  const rows = db.select({ at: entries.occurredAt }).from(entries).where(isNull(entries.categoryId)).all();
  const map = new Map<number, { week: Period; count: number }>();
  for (const r of rows) {
    const w = weekOf(r.at);
    const cur = map.get(w.start) ?? { week: w, count: 0 };
    cur.count++;
    map.set(w.start, cur);
  }
  return [...map.values()].sort((a, b) => b.week.start - a.week.start);
}

/** Sorted entries for the suggester, newest first. */
export function sortHistory(db: AppDb, limit = 500): SortedEntry[] {
  // Raw rows (no per-row drizzle mapping): this runs on every Sort screen refresh.
  return db.all<SortedEntry>(
    sql`SELECT type, note, amount_minor AS amountMinor, category_id AS categoryId, scope FROM "entries"
      WHERE category_id IS NOT NULL ORDER BY sorted_at DESC LIMIT ${limit}`,
  );
}

/** Most used notes (case-insensitive), for the quick-capture chips. */
export function topNotes(db: AppDb, type: EntryType, limit = 5): string[] {
  const rows = db
    .select({ note: entries.note, n: count() })
    .from(entries)
    .where(and(eq(entries.type, type), sql`${entries.note} <> ''`))
    .groupBy(sql`lower(${entries.note})`)
    .orderBy(desc(count()), desc(sql`max(${entries.occurredAt})`))
    .limit(limit)
    .all();
  return rows.map((r) => r.note);
}

export function totalsFor(db: AppDb, period: Period, scope: Scope | 'all' = 'work') {
  const where: SQL[] = [gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end)];
  if (scope !== 'all') where.push(eq(entries.scope, scope));
  const rows = db
    .select({ type: entries.type, total: sql<number>`COALESCE(SUM(${entries.amountMinor}), 0)` })
    .from(entries)
    .where(and(...where))
    .groupBy(entries.type)
    .all();
  const income = Number(rows.find((r) => r.type === 'income')?.total ?? 0);
  const expense = Number(rows.find((r) => r.type === 'expense')?.total ?? 0);
  return { incomeMinor: income, expenseMinor: expense, netMinor: income - expense };
}

export const entryCount = (db: AppDb) => db.select({ n: count() }).from(entries).get()?.n ?? 0;

export function deleteAllEntries(db: AppDb): string[] {
  const paths = db.select({ p: receipts.filePath }).from(receipts).all().map((r) => r.p);
  db.delete(entries).run();
  return [...new Set(paths)];
}


/** Entries kept in a currency other than `currency` (region change, B-14). */
export function countNotIn(db: AppDb, currency: Currency): number {
  return db.select({ n: count() }).from(entries).where(sql`${entries.currency} <> ${currency}`).get()?.n ?? 0;
}

/**
 * Region change (B-14): every entry not in `to` is converted at `rateMicro` (millionths of `to` per 1 unit of the
 * old currency) and relabelled, in one transaction. Amounts stay positive integers (at least 1 minor unit).
 */
export function convertAllTo(db: AppDb, to: Currency, rateMicro: number, now = Date.now()): number {
  const rows = db
    .select({ id: entries.id, amountMinor: entries.amountMinor, splitFromMinor: entries.splitFromMinor })
    .from(entries)
    .where(sql`${entries.currency} <> ${to}`)
    .all();
  db.transaction((tx) => {
    for (const r of rows) {
      tx.update(entries)
        .set({
          currency: to,
          amountMinor: Math.max(1, convertMinor(r.amountMinor, rateMicro)),
          splitFromMinor: r.splitFromMinor === null ? null : Math.max(1, convertMinor(r.splitFromMinor, rateMicro)),
          updatedAt: now,
        })
        .where(eq(entries.id, r.id))
        .run();
    }
  });
  return rows.length;
}
