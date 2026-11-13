import { and, countDistinct, gte, lt } from 'drizzle-orm';

import { monthOf, proStatus, trialWindow, type ProStatus } from '@/domain/pro';

import { proState, receipts, type ProStateRow } from './schema';
import type { AppDb } from './types';

const ID = 'pro';

export const getProState = (db: AppDb): ProStateRow | null => db.select().from(proState).get() ?? null;

export const getProStatus = (db: AppDb, now = Date.now()): ProStatus => proStatus(getProState(db), now);

function upsert(db: AppDb, patch: Partial<Omit<ProStateRow, 'id'>>) {
  db.insert(proState)
    .values({ id: ID, entitlement: 'none', ...patch })
    .onConflictDoUpdate({ target: proState.id, set: patch })
    .run();
}

/** "Try Pro free for 7 days". false when a trial was already used on this phone. */
export function startTrial(db: AppDb, now = Date.now()): boolean {
  const w = trialWindow(getProState(db), now);
  if (!w) return false;
  upsert(db, w);
  return true;
}

/**
 * Result of a store check (purchase, restore, startup refresh) from `src/features/pro/` (S5).
 * `active: false` after a successful check that found no live subscription marks it expired (never deletes the trial).
 */
export function applyStoreEntitlement(
  db: AppDb,
  r: { active: boolean; expiresAt: number | null; productId: string | null; autoRenewing: boolean | null },
  now = Date.now(),
): void {
  const cur = getProState(db);
  const entitlement = r.active ? 'active' : cur?.entitlement === 'active' || cur?.entitlement === 'expired' ? 'expired' : 'none';
  upsert(db, {
    entitlement,
    expiresAt: r.expiresAt ?? (r.active ? null : cur?.expiresAt ?? null),
    productId: r.productId ?? cur?.productId ?? null,
    autoRenewing: r.autoRenewing,
    lastVerifiedAt: now,
  });
}

/** Receipt photos attached this calendar month (split parts share one file: counted once). */
export function photosUsedThisMonth(db: AppDb, now = Date.now()): number {
  const m = monthOf(now);
  return (
    db
      .select({ n: countDistinct(receipts.filePath) })
      .from(receipts)
      .where(and(gte(receipts.createdAt, m.start), lt(receipts.createdAt, m.end)))
      .get()?.n ?? 0
  );
}
