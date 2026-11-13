import { and, asc, count, eq, max } from 'drizzle-orm';

import { DEFAULT_CATEGORIES, mapTaxLine } from '@/domain/categories';
import type { EntryType, Region } from '@/domain/types';

import { categories, entries, type CategoryRow } from './schema';
import { newId, type AppDb } from './types';

/** Inserts the region's default set once (no-op if any category exists). */
export function seedCategories(db: AppDb, region: Region): void {
  const existing = db.select({ n: count() }).from(categories).get();
  if ((existing?.n ?? 0) > 0) return;
  db.insert(categories)
    .values(
      DEFAULT_CATEGORIES[region].map((c, i) => ({
        id: newId() + i,
        type: c.type,
        key: c.key,
        name: c.name,
        icon: c.icon,
        color: c.color,
        taxLine: c.taxLine,
        sortOrder: i,
        hidden: false,
      })),
    )
    .run();
}

export function listCategories(db: AppDb, opts: { type?: EntryType; includeHidden?: boolean } = {}): CategoryRow[] {
  const where = [];
  if (opts.type) where.push(eq(categories.type, opts.type));
  if (!opts.includeHidden) where.push(eq(categories.hidden, false));
  return db
    .select()
    .from(categories)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(categories.sortOrder))
    .all();
}

export type CategoryError = 'empty_name' | 'duplicate_name';

function checkName(db: AppDb, type: EntryType, name: string, exceptId?: string): CategoryError | null {
  const n = name.trim();
  if (!n) return 'empty_name';
  const same = db
    .select()
    .from(categories)
    .where(eq(categories.type, type))
    .all()
    .some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === n.toLowerCase());
  return same ? 'duplicate_name' : null;
}

export function createCategory(
  db: AppDb,
  input: { type: EntryType; name: string; icon: string; color: string; taxLine: string },
): { ok: true; id: string } | { ok: false; error: CategoryError } {
  const error = checkName(db, input.type, input.name);
  if (error) return { ok: false, error };
  const top = db.select({ m: max(categories.sortOrder) }).from(categories).get();
  const id = newId();
  db.insert(categories)
    .values({ id, ...input, name: input.name.trim(), key: null, sortOrder: (top?.m ?? -1) + 1, hidden: false })
    .run();
  return { ok: true, id };
}

export function updateCategory(
  db: AppDb,
  id: string,
  patch: Partial<Pick<CategoryRow, 'name' | 'icon' | 'color' | 'taxLine' | 'hidden'>>,
): { ok: true } | { ok: false; error: CategoryError } {
  const cur = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cur) return { ok: true };
  if (patch.name !== undefined) {
    const error = checkName(db, cur.type, patch.name, id);
    if (error) return { ok: false, error };
    patch = { ...patch, name: patch.name.trim() };
  }
  db.update(categories).set(patch).where(eq(categories.id, id)).run();
  return { ok: true };
}

export function reorderCategories(db: AppDb, orderedIds: string[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, i) => tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, id)).run());
  });
}

export function categoryUsage(db: AppDb, id: string): number {
  return db.select({ n: count() }).from(entries).where(eq(entries.categoryId, id)).get()?.n ?? 0;
}

/** Only unused categories can be deleted; used ones are hidden instead. */
export function deleteCategory(db: AppDb, id: string): { ok: true } | { ok: false; error: 'in_use' } {
  if (categoryUsage(db, id) > 0) return { ok: false, error: 'in_use' };
  db.delete(categories).where(eq(categories.id, id)).run();
  return { ok: true };
}

/**
 * Region change: built-in categories take the new region's tax line, and its name too unless the user renamed it.
 * Custom categories and all entries stay as they are.
 */
export function applyRegionToCategories(db: AppDb, from: Region, to: Region): void {
  if (from === to) return;
  const fromByKey = new Map(DEFAULT_CATEGORIES[from].map((c) => [c.key, c]));
  const toByKey = new Map(DEFAULT_CATEGORIES[to].map((c) => [c.key, c]));
  db.transaction((tx) => {
    for (const c of tx.select().from(categories).all()) {
      const target = c.key ? toByKey.get(c.key) : undefined;
      if (!target) {
        // Custom category: move to the new form's equivalent line (B-33).
        const taxLine = mapTaxLine(c.taxLine, c.type, from, to);
        if (taxLine !== c.taxLine) tx.update(categories).set({ taxLine }).where(eq(categories.id, c.id)).run();
        continue;
      }
      const renamed = c.name !== fromByKey.get(target.key)?.name;
      tx.update(categories)
        .set({ taxLine: target.taxLine, name: renamed ? c.name : target.name })
        .where(eq(categories.id, c.id))
        .run();
    }
  });
}
