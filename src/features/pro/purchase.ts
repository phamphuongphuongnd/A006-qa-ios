import { PRO_FALLBACK_PRICE, renewalNoticeAt, trialEndingNoticeAt, type ProRow } from '@/domain/pro';
import type { Region } from '@/domain/types';

/**
 * Pure rules around the store (F-18): error wording, renewal date estimate, price text, notification plan.
 * The expo-iap calls live in `store.ts`; these stay testable without the native module.
 */

/** What S-19 shows after a failed purchase / restore (product.md F-18 "Lỗi"). */
export type PurchaseProblem =
  /** User closed the store sheet — say nothing. */
  | 'cancelled'
  /** "Couldn't reach Google Play. Check your connection." */
  | 'offline'
  /** The product isn't set up in the store yet (until Phương creates sundaysort_pro_annual). */
  | 'unavailable'
  /** Payment is pending (cash / bank in some countries): Pro turns on when the store confirms. */
  | 'pending'
  /** Already owned: run a restore instead. */
  | 'owned'
  /** "Purchase didn't go through. You haven't been charged." */
  | 'failed';

/** expo-iap ErrorCode values (strings, so this file doesn't import the native module). */
export function purchaseProblem(code: string | null | undefined): PurchaseProblem {
  switch (code) {
    case 'user-cancelled':
      return 'cancelled';
    case 'network-error':
    case 'service-disconnected':
    case 'service-timeout':
    case 'service-error':
    case 'billing-unavailable':
    case 'iap-not-available':
    case 'init-connection':
    case 'connection-closed':
    case 'not-prepared':
    case 'remote-error':
      return 'offline';
    case 'sku-not-found':
    case 'item-unavailable':
    case 'empty-sku-list':
    case 'query-product':
    case 'sku-offer-mismatch':
      return 'unavailable';
    case 'pending':
    case 'deferred-payment':
      return 'pending';
    case 'already-owned':
      return 'owned';
    default:
      return 'failed';
  }
}

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

/**
 * Next renewal of an annual subscription bought at `purchasedAt` (Android doesn't tell the app the expiry; Play renews
 * on the purchase anniversary). Same day and time of year, the first one after `now`.
 */
export function nextAnnualRenewal(purchasedAt: number, now: number): number {
  const p = new Date(purchasedAt);
  const years = Math.max(1, Math.floor((now - purchasedAt) / YEAR_MS));
  for (let n = Math.max(1, years - 1); ; n++) {
    const d = new Date(p);
    d.setFullYear(p.getFullYear() + n);
    // 29 Feb → 28 Feb in a non-leap year (setFullYear would roll to 1 Mar).
    if (d.getMonth() !== p.getMonth()) d.setDate(0);
    if (d.getTime() > now) return d.getTime();
  }
}

/** The store's localised price once loaded, else the placeholder price (PLAN-v2 Q16). */
export const priceText = (storePrice: string | null | undefined, region: Region) => storePrice || PRO_FALLBACK_PRICE[region];

/**
 * "About 48p a week" from a store price like "£24.99" / "$31.99" (null when the price can't be read, e.g. "24,99 €").
 */
export function perWeekText(price: string): string | null {
  const m = price.match(/^([£$])\s?(\d+(?:\.\d{1,2})?)$/);
  if (!m) return null;
  const weekly = Number(m[2]) / 52;
  if (m[1] === '£') return weekly < 1 ? `${Math.round(weekly * 100)}p` : `£${weekly.toFixed(2)}`;
  return weekly < 1 ? `${Math.round(weekly * 100)}¢` : `$${weekly.toFixed(2)}`;
}

// ---------------- Notifications (P1-11, F-17) — for S4's notification code ----------------

export type ProNotificationId = 'pro-renewal' | 'pro-trial-ending';
export interface ProNotification {
  id: ProNotificationId;
  at: number;
  title: string;
  body: string;
  /** Deep link on tap. */
  url: string;
}

/** "6 Apr" */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (at: number) => `${new Date(at).getDate()} ${MON[new Date(at).getMonth()]}`;

/**
 * Pro notifications to have scheduled now (F-17): "Pro renews on 6 Apr for £24.99" 7 days before an auto-renewing
 * subscription renews, and "Your Pro trial ends tomorrow" one day before an in-app trial ends. Only future times;
 * a switch that's off (S-20) drops its notification. Texts come in via `t` so this stays free of i18n imports.
 */
export function proNotificationPlan(
  row: ProRow | null | undefined,
  now: number,
  opts: {
    proRenewal: boolean;
    trialEnding: boolean;
    price: string;
    platform: 'ios' | 'android';
    t: (key: 'renewTitle' | 'renewBodyAndroid' | 'renewBodyIOS' | 'trialEndingTitle' | 'trialEndingBody', vars?: Record<string, string>) => string;
  },
): ProNotification[] {
  const out: ProNotification[] = [];
  const renewAt = renewalNoticeAt(row);
  if (opts.proRenewal && renewAt !== null && renewAt > now && row?.expiresAt) {
    out.push({
      id: 'pro-renewal',
      at: renewAt,
      title: opts.t('renewTitle', { date: shortDate(row.expiresAt), price: opts.price }),
      body: opts.t(opts.platform === 'ios' ? 'renewBodyIOS' : 'renewBodyAndroid'),
      url: '/pro',
    });
  }
  const trialAt = trialEndingNoticeAt(row);
  // Only while the trial is the thing running: a purchase during the trial makes the notice wrong.
  if (opts.trialEnding && trialAt !== null && trialAt > now && row?.entitlement !== 'active') {
    out.push({ id: 'pro-trial-ending', at: trialAt, title: opts.t('trialEndingTitle'), body: opts.t('trialEndingBody'), url: '/pro' });
  }
  return out;
}
