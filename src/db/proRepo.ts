import { and, countDistinct, eq, gte, lt } from 'drizzle-orm';

import { effectiveProStatus, monthOf, trialWindow, type ProStatus } from '@/domain/pro';

import { proState, receipts, settings, type ProStateRow } from './schema';
import type { AppDb } from './types';

const ID = 'pro';

/**
 * Dev builds only (P5): pretend Pro without touching the one-time trial on a real phone — toggled from /dev/probe,
 * stored in settings key `dev.fakePro` ('trial' | 'pro' | 'expired'). Read by screens and background code alike.
 * Release builds never read the key.
 */
export const DEV_FAKE_PRO_KEY = 'dev.fakePro';
export type DevFakePro = 'trial' | 'pro' | 'expired';

function devFakePro(db: AppDb, real: ProStateRow | null): ProStateRow | null {
  if (!__DEV__) return real;
  const mode = db.select().from(settings).where(eq(settings.key, DEV_FAKE_PRO_KEY)).get()?.value as DevFakePro | undefined;
  if (!mode) return real;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const base = real ?? ({ id: ID, entitlement: 'none', trialStartedAt: null, trialEndsAt: null, expiresAt: null, autoRenewing: null } as ProStateRow);
  if (mode === 'pro') return { ...base, entitlement: 'active', expiresAt: now + 30 * day, autoRenewing: true };
  if (mode === 'trial') return { ...base, entitlement: 'none', trialStartedAt: now - day, trialEndsAt: now + 6 * day };
  return { ...base, entitlement: 'none', trialStartedAt: now - 8 * day, trialEndsAt: now - day };
}

export const getProState = (db: AppDb): ProStateRow | null => devFakePro(db, db.select().from(proState).get() ?? null);

export function setDevFakePro(db: AppDb, mode: DevFakePro | null) {
  if (!__DEV__) return;
  if (!mode) db.delete(settings).where(eq(settings.key, DEV_FAKE_PRO_KEY)).run();
  else db.insert(settings).values({ key: DEV_FAKE_PRO_KEY, value: mode }).onConflictDoUpdate({ target: settings.key, set: { value: mode } }).run();
}

export const getProStatus = (db: AppDb, now = Date.now()): ProStatus => effectiveProStatus(getProState(db), now);

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
