import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';

import { getProStatus } from '@/db/proRepo';
import { categories, entries, ruleOffers, rules, type RuleRow } from '@/db/schema';
import { newId, type AppDb } from '@/db/types';
import { hasPro } from '@/domain/pro';
import { normaliseNote } from '@/domain/suggest';
import type { EntryType, Period, Scope } from '@/domain/types';

import { offerFrom, offerKey, OFFER_SNOOZE_MS, ruleMatches, type RuleDraft, type SortedForOffer } from './match';

// ---------- Rules (S-18) ----------

export interface RuleListItem extends RuleRow {
  categoryName: string | null;
  /** Entries this rule sorted (all time). */
  entryCount: number;
}

export function listRules(db: AppDb): RuleListItem[] {
  return db.all<RuleListItem>(sql`
    SELECT r.id AS id, r.match_text AS matchText, r.type AS type, r.min_minor AS minMinor, r.max_minor AS maxMinor,
      r.category_id AS categoryId, r.scope AS scope, r.enabled AS enabled, r.created_at AS createdAt, r.hits AS hits,
      r.last_hit_at AS lastHitAt, c.name AS categoryName,
      (SELECT COUNT(*) FROM entries e WHERE e.rule_id = r.id) AS entryCount
    FROM rules r LEFT JOIN categories c ON c.id = r.category_id
    ORDER BY r.created_at ASC`).map((r) => ({ ...r, enabled: !!r.enabled }));
}

export const getRule = (db: AppDb, id: string) => db.select().from(rules).where(eq(rules.id, id)).get();

/** Rules that can sort right now: enabled and still pointing at a category. */
export const activeRules = (db: AppDb): RuleRow[] =>
  db.select().from(rules).where(and(eq(rules.enabled, true), isNotNull(rules.categoryId))).orderBy(asc(rules.createdAt)).all();

const clean = (d: RuleDraft) => ({
  matchText: d.matchText.trim().replace(/\s+/g, ' ').slice(0, 60),
  type: d.type,
  minMinor: d.minMinor,
  maxMinor: d.maxMinor,
  categoryId: d.categoryId,
  scope: d.scope,
});

export function createRule(db: AppDb, d: RuleDraft, now = Date.now()): RuleRow {
  const row: RuleRow = { id: newId(), ...clean(d), enabled: true, createdAt: now, hits: 0, lastHitAt: null };
  db.insert(rules).values(row).run();
  return row;
}

export function updateRule(db: AppDb, id: string, d: RuleDraft): void {
  db.update(rules).set(clean(d)).where(eq(rules.id, id)).run();
}

export function setRuleEnabled(db: AppDb, id: string, enabled: boolean): void {
  db.update(rules).set({ enabled }).where(eq(rules.id, id)).run();
}

/** Deletes the rule only; entries it sorted stay sorted (they keep `rule_id` for the "Auto" label). */
export function deleteRule(db: AppDb, id: string): RuleRow | null {
  const row = getRule(db, id) ?? null;
  if (row) db.delete(rules).where(eq(rules.id, id)).run();
  return row;
}

export function restoreRule(db: AppDb, row: RuleRow): void {
  db.insert(rules).values(row).onConflictDoNothing().run();
}

/** Same type and the same words: saving would make a duplicate (the sheet edits that one instead). */
export function findSameRule(db: AppDb, matchText: string, type: EntryType, exceptId?: string): RuleRow | null {
  const m = normaliseNote(matchText);
  return db.select().from(rules).where(eq(rules.type, type)).all().find((r) => r.id !== exceptId && normaliseNote(r.matchText) === m) ?? null;
}

// ---------- "Always sort … as …?" (P1-10) ----------

export interface RuleOffer {
  key: string;
  matchText: string;
  type: EntryType;
  categoryId: string;
  categoryName: string;
  scope: Scope;
}

export function declineOffer(db: AppDb, key: string, now = Date.now()): void {
  const until = now + OFFER_SNOOZE_MS;
  db.insert(ruleOffers).values({ merchantKey: key, declinedUntil: until }).onConflictDoUpdate({ target: ruleOffers.merchantKey, set: { declinedUntil: until } }).run();
}

const offerDeclined = (db: AppDb, key: string, now: number) =>
  (db.select().from(ruleOffers).where(eq(ruleOffers.merchantKey, key)).get()?.declinedUntil ?? 0) > now;

/** How far back to look for the same place (newest sorted entries of that type). */
const OFFER_SCAN = 300;

/**
 * Call right after the driver sorts an entry by hand. Pro only; returns an offer when the last 3 sorts of this place
 * went to the same category, no rule already covers it, and the driver didn't say "Not now" in the last 30 days.
 */
export function ruleOfferAfterSort(db: AppDb, entryId: string, now = Date.now()): RuleOffer | null {
  if (!hasPro(getProStatus(db, now))) return null;
  const e = db.select().from(entries).where(eq(entries.id, entryId)).get();
  if (!e || !e.categoryId) return null;
  const key = offerKey(e.note, e.ocrMerchant);
  if (!key || offerDeclined(db, key, now)) return null;
  const target = { type: e.type, note: e.note, amountMinor: e.amountMinor, ocrMerchant: e.ocrMerchant };
  const all = db.select().from(rules).all();
  if (all.some((r) => ruleMatches(r, target, { ignoreEnabled: true }))) return null;
  const recent = db.all<SortedForOffer & { sortedAt: number }>(sql`
    SELECT note, ocr_merchant AS ocrMerchant, category_id AS categoryId, scope, sorted_at AS sortedAt FROM entries
    WHERE type = ${e.type} AND category_id IS NOT NULL AND sorted_at IS NOT NULL
    ORDER BY sorted_at DESC, updated_at DESC LIMIT ${OFFER_SCAN}`);
  const same = recent.filter((r) => offerKey(r.note, r.ocrMerchant) === key);
  // The entry just sorted must be the newest of its place, or this isn't "in a row".
  if (same[0]?.categoryId !== e.categoryId) return null;
  const o = offerFrom(key, same);
  if (!o) return null;
  if (all.some((r) => r.type === e.type && normaliseNote(r.matchText) === normaliseNote(o.matchText))) return null;
  const cat = db.select().from(categories).where(eq(categories.id, o.categoryId)).get();
  if (!cat) return null;
  return { key, matchText: o.matchText, type: e.type, categoryId: o.categoryId, categoryName: cat.name, scope: o.scope };
}

/** "Always": creates the rule (future entries only — the queue isn't touched). */
export function acceptOffer(db: AppDb, o: RuleOffer, now = Date.now()): RuleRow {
  return createRule(db, { matchText: o.matchText, type: o.type, minMinor: null, maxMinor: null, categoryId: o.categoryId, scope: o.scope }, now);
}

// ---------- Auto-sorted review (S-06d) ----------

export interface AutoSortedItem {
  id: string;
  type: EntryType;
  amountMinor: number;
  currency: 'GBP' | 'USD';
  occurredAt: number;
  note: string;
  categoryId: string | null;
  scope: Scope;
  ruleId: string | null;
  recurringId: string | null;
  autoReviewedAt: number | null;
}

/** Entries a rule or a recurring template sorted in the period, oldest first. */
export function autoSortedIn(db: AppDb, period: Period): AutoSortedItem[] {
  return db.all<AutoSortedItem>(sql`
    SELECT id, type, amount_minor AS amountMinor, currency, occurred_at AS occurredAt, note, category_id AS categoryId,
      scope, rule_id AS ruleId, recurring_id AS recurringId, auto_reviewed_at AS autoReviewedAt
    FROM entries WHERE (rule_id IS NOT NULL OR recurring_id IS NOT NULL)
      AND occurred_at >= ${period.start} AND occurred_at < ${period.end}
    ORDER BY occurred_at ASC, created_at ASC`);
}

/** Rule-sorted entries of the period leave the "N auto-sorted" count once the driver opened Review. */
export function markAutoReviewed(db: AppDb, period: Period, now = Date.now()): number {
  const where = and(isNotNull(entries.ruleId), isNull(entries.autoReviewedAt), gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end));
  const n = db.select({ id: entries.id }).from(entries).where(where).all().length;
  if (n > 0) db.update(entries).set({ autoReviewedAt: now }).where(where).run();
  return n;
}

export interface AutoUndo {
  rows: { id: string; categoryId: string | null; scope: Scope; ruleId: string | null; sortedAt: number | null; autoReviewedAt: number | null }[];
  ruleId: string;
}

/** "Undo all from this rule": its entries in the period go back to the Sort queue (no longer "Auto"). */
export function unsortRuleEntries(db: AppDb, ruleId: string, period: Period, now = Date.now()): AutoUndo {
  const where = and(eq(entries.ruleId, ruleId), gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end));
  const rows = db
    .select({ id: entries.id, categoryId: entries.categoryId, scope: entries.scope, ruleId: entries.ruleId, sortedAt: entries.sortedAt, autoReviewedAt: entries.autoReviewedAt })
    .from(entries)
    .where(where)
    .all();
  db.transaction((tx) => {
    tx.update(entries).set({ categoryId: null, sortedAt: null, ruleId: null, autoReviewedAt: null, updatedAt: now }).where(where).run();
    if (rows.length) tx.update(rules).set({ hits: sql`MAX(0, ${rules.hits} - ${rows.length})` }).where(eq(rules.id, ruleId)).run();
  });
  return { rows, ruleId };
}

export function restoreRuleEntries(db: AppDb, u: AutoUndo, now = Date.now()): void {
  db.transaction((tx) => {
    for (const r of u.rows) {
      tx.update(entries)
        .set({ categoryId: r.categoryId, scope: r.scope, ruleId: r.ruleId, sortedAt: r.sortedAt, autoReviewedAt: r.autoReviewedAt, updatedAt: now })
        .where(eq(entries.id, r.id))
        .run();
    }
    if (u.rows.length) tx.update(rules).set({ hits: sql`${rules.hits} + ${u.rows.length}` }).where(eq(rules.id, u.ruleId)).run();
  });
}

/** Counts for "9 auto-sorted · 2 recurring entries added" on Week sorted. */
export function autoCounts(db: AppDb, period: Period): { auto: number; recurring: number } {
  const inP = and(gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end));
  const auto = db.select({ n: sql<number>`COUNT(*)` }).from(entries).where(and(inP, isNotNull(entries.ruleId))).get()?.n ?? 0;
  const recurring = db.select({ n: sql<number>`COUNT(*)` }).from(entries).where(and(inP, isNotNull(entries.recurringId))).get()?.n ?? 0;
  return { auto: Number(auto), recurring: Number(recurring) };
}

/** Unreviewed rule-sorted entries in the period (Sort header "9 auto-sorted · Review"). */
export function unreviewedAutoCount(db: AppDb, period: Period): number {
  const n = db
    .select({ n: sql<number>`COUNT(*)` })
    .from(entries)
    .where(and(isNotNull(entries.ruleId), isNull(entries.autoReviewedAt), gte(entries.occurredAt, period.start), lt(entries.occurredAt, period.end)))
    .get()?.n;
  return Number(n ?? 0);
}

/** Rule ids → label pieces for review groups (deleted rules come back missing). */
export function rulesByIds(db: AppDb, ids: string[]): RuleRow[] {
  if (ids.length === 0) return [];
  return db.select().from(rules).where(inArray(rules.id, ids)).orderBy(desc(rules.hits)).all();
}
