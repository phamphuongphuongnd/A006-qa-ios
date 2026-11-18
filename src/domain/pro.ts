import type { ProEntitlement } from './types';

/**
 * Pro + in-app trial rules (product.md §6, F-18; fact in-app-trial-no-card). Pure: every screen and feature asks
 * `proStatus(row, now)` / `hasPro(...)`. Purchases themselves (expo-iap) live in `src/features/pro/` (S5), which
 * writes the store result through `applyStoreEntitlement` (db/proRepo.ts).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_DAYS = 7;
/** Trial-ending notice on day 6 ("Your Pro trial ends tomorrow"). */
export const TRIAL_ENDING_NOTICE_MS = DAY_MS;
/** Renewal notice + Home card 7 days before (P1-11). */
export const RENEWAL_NOTICE_MS = 7 * DAY_MS;
/** Free photo allowance per calendar month (P1-4). */
export const FREE_PHOTOS_PER_MONTH = 20;
/**
 * Store product id of the annual subscription. Placeholder until Phương creates the product in Play Console /
 * App Store Connect — both stores must use this exact id (or change it here).
 */
export const PRO_PRODUCT_ID = 'sundaysort_pro_annual';
/**
 * Price shown before the store has answered (onboarding S-01e, offline). Placeholder price (PLAN-v2 Q16) — the
 * purchase screen (S5) shows the store's localised price once expo-iap has loaded the product.
 */
export const PRO_FALLBACK_PRICE: Record<'UK' | 'US', string> = { UK: '£24.99', US: '$31.99' };

/** What a "PRO" lock / S-19 sheet is about (sheet subtitle). */
export type ProFeature = 'auto_trips' | 'rules' | 'recurring' | 'ocr' | 'suggestions' | 'tax_files' | 'photos' | 'route_miles';

export type ProStatus =
  | { kind: 'free'; trialAvailable: boolean }
  | { kind: 'trial'; endsAt: number; daysLeft: number }
  | { kind: 'pro'; renewsAt: number | null; autoRenewing: boolean }
  /** Trial or subscription ended; `endedAt` for "Pro ended on 6 Apr". */
  | { kind: 'expired'; endedAt: number; trialAvailable: boolean };

/** The ProState columns these rules read (db/schema.ts `pro_state`). */
export interface ProRow {
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  entitlement: ProEntitlement;
  expiresAt: number | null;
  autoRenewing: boolean | null;
}
type Row = ProRow;

export const trialUsed = (row: Row | null | undefined) => !!row?.trialStartedAt;

export function proStatus(row: Row | null | undefined, now: number): ProStatus {
  const storeActive = row?.entitlement === 'active' && (row.expiresAt === null || row.expiresAt > now);
  if (storeActive) return { kind: 'pro', renewsAt: row!.expiresAt, autoRenewing: !!row!.autoRenewing };

  const trialAvailable = !trialUsed(row);
  if (row?.trialStartedAt && row.trialEndsAt) {
    // Clock set back before the trial started: treat the trial as over rather than restarting the count.
    const tampered = now < row.trialStartedAt - DAY_MS;
    if (!tampered && now < row.trialEndsAt) {
      return { kind: 'trial', endsAt: row.trialEndsAt, daysLeft: Math.max(1, Math.ceil((row.trialEndsAt - now) / DAY_MS)) };
    }
  }

  const storeEnded = row?.entitlement === 'active' || row?.entitlement === 'expired' ? row.expiresAt : null;
  const trialEnded = row?.trialEndsAt ?? null;
  const endedAt = Math.max(storeEnded ?? 0, trialEnded ?? 0);
  if (endedAt > 0) return { kind: 'expired', endedAt: Math.min(endedAt, now), trialAvailable };
  return { kind: 'free', trialAvailable };
}

export const hasPro = (s: ProStatus) => s.kind === 'trial' || s.kind === 'pro';

/** New trial window, started by the driver ("Try Pro free for 7 days"). null if a trial was already used. */
export function trialWindow(row: Row | null | undefined, now: number): { trialStartedAt: number; trialEndsAt: number } | null {
  if (trialUsed(row)) return null;
  return { trialStartedAt: now, trialEndsAt: now + TRIAL_DAYS * DAY_MS };
}

/** When to show "Your Pro trial ends tomorrow" (null when no trial runs). */
export const trialEndingNoticeAt = (row: Row | null | undefined): number | null =>
  row?.trialEndsAt ? row.trialEndsAt - TRIAL_ENDING_NOTICE_MS : null;

/** When to show "Pro renews on …" (null unless an auto-renewing subscription has a known date). */
export const renewalNoticeAt = (row: Row | null | undefined): number | null =>
  row?.entitlement === 'active' && row.autoRenewing && row.expiresAt ? row.expiresAt - RENEWAL_NOTICE_MS : null;

/** Free photo allowance (P1-4). Pro = no limit. Photos already attached are never locked. */
export function photoAllowance(usedThisMonth: number, pro: boolean): { limit: number | null; used: number; left: number | null; blocked: boolean } {
  if (pro) return { limit: null, used: usedThisMonth, left: null, blocked: false };
  const left = Math.max(0, FREE_PHOTOS_PER_MONTH - usedThisMonth);
  return { limit: FREE_PHOTOS_PER_MONTH, used: usedThisMonth, left, blocked: left === 0 };
}

/** [start, end) of the calendar month containing `now` (local time) — the allowance resets on the 1st. */
export function monthOf(now: number): { start: number; end: number } {
  const d = new Date(now);
  return { start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() };
}

/** The `pro_state` columns a backup file carries (any of them may have been edited by hand). */
export interface RestoredProRow extends ProRow {
  id: string;
  productId?: string | null;
  lastVerifiedAt?: number | null;
}

/**
 * QA-100 SPE-2: a phone with no Pro state takes the backup's — but a hand-edited file ("trialEndsAt": year 2100,
 * "entitlement": "active") unlocked Pro for ever. Keep only what can't hand out more than the rules allow:
 * a trial lasts at most 7 days from a start that is not in the future; a store subscription is never trusted from a
 * file — it comes back as 'expired' so the store check on start (refreshProFromStore) confirms it or "Restore purchase".
 */
export function sanitizeRestoredPro<T extends RestoredProRow>(row: T, now: number): T {
  const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);
  let start = int(row.trialStartedAt);
  if (start !== null && start > now) start = now;
  const maxEnd = start !== null ? start + TRIAL_DAYS * DAY_MS : null;
  const fileEnd = int(row.trialEndsAt);
  const trialEndsAt = maxEnd === null ? null : fileEnd === null ? maxEnd : Math.min(fileEnd, maxEnd);
  const entitlement: ProEntitlement = row.entitlement === 'active' || row.entitlement === 'expired' ? 'expired' : 'none';
  return {
    ...row,
    trialStartedAt: start,
    trialEndsAt,
    entitlement,
    expiresAt: entitlement === 'expired' ? int(row.expiresAt) : null,
    autoRenewing: false,
    lastVerifiedAt: null,
  };
}
