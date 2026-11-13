import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { applyStoreEntitlement, getProState } from '@/db/proRepo';
import { PRO_PRODUCT_ID } from '@/domain/pro';

import { syncProNotifications } from './notifications';
import { nextAnnualRenewal, purchaseProblem, type PurchaseProblem } from './purchase';

/**
 * The store side of Pro (F-18), on expo-iap (Play Billing 8 / StoreKit 2, no server). Every result is written with
 * `applyStoreEntitlement` so `usePro()` / `getProStatus()` see it. No receipt server: entitlement is what the store
 * reports on this device. Until Phương creates `sundaysort_pro_annual` in Play Console / App Store Connect, loading
 * the product finds nothing and Subscribe answers "unavailable".
 */

export interface ProProduct {
  /** Localised price from the store, e.g. "£24.99". */
  price: string;
  /** Android: base-plan offer token (required by Play Billing for subscriptions). */
  offerToken: string | null;
}

export type StoreResult = { ok: true } | { ok: false; problem: PurchaseProblem };

let connecting: Promise<boolean> | null = null;
let product: ProProduct | null = null;
let waiting: ((r: StoreResult) => void) | null = null;
let listening = false;

const codeOf = (e: unknown): string | null => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : null);

/** Opens the store connection once per app run. false when the store can't be reached. */
function connect(): Promise<boolean> {
  if (!connecting) {
    connecting = initConnection()
      .then(() => {
        listen();
        return true;
      })
      .catch(() => {
        connecting = null;
        return false;
      });
  }
  return connecting;
}

/** Purchases can arrive any time (pending payments, Ask to Buy): one global listener grants Pro and finishes them. */
function listen() {
  if (listening) return;
  listening = true;
  purchaseUpdatedListener((p) => {
    if (p.productId !== PRO_PRODUCT_ID) return;
    if (p.purchaseState === 'pending') {
      settle({ ok: false, problem: 'pending' });
      return;
    }
    void grant(p).then(
      () => settle({ ok: true }),
      () => settle({ ok: false, problem: 'failed' }),
    );
  });
  purchaseErrorListener((e) => settle({ ok: false, problem: purchaseProblem(e.code) }));
}

function settle(r: StoreResult) {
  const w = waiting;
  waiting = null;
  w?.(r);
}

/** Writes an active subscription and acknowledges it (Play refunds purchases not acknowledged within 3 days). */
async function grant(p: Purchase, now = Date.now()) {
  const ios = 'expirationDateIOS' in p ? p.expirationDateIOS : null;
  const autoRenewing = 'autoRenewingAndroid' in p && p.autoRenewingAndroid != null ? p.autoRenewingAndroid : p.isAutoRenewing;
  applyStoreEntitlement(db, {
    active: true,
    expiresAt: ios ?? nextAnnualRenewal(p.transactionDate, now),
    productId: p.productId,
    autoRenewing,
  });
  await finishTransaction({ purchase: p, isConsumable: false }).catch(() => undefined);
  await syncProNotifications().catch(() => undefined);
}

/** Loads the subscription from the store (price + offer). null when the store has no such product (yet) or is offline. */
export async function loadProProduct(): Promise<ProProduct | null> {
  if (product) return product;
  if (!(await connect())) return null;
  try {
    const list = (await fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'subs' })) as ProductSubscription[] | null;
    const p = list?.find((x) => x.id === PRO_PRODUCT_ID);
    if (!p) return null;
    const offerToken = p.platform === 'android' ? (p.subscriptionOffers?.find((o) => o.offerTokenAndroid)?.offerTokenAndroid ?? null) : null;
    product = { price: p.displayPrice, offerToken };
    return product;
  } catch {
    return null;
  }
}

/** "Subscribe — £24.99/year". Resolves when the store answers (bought, cancelled, failed, pending). */
export async function buyPro(): Promise<StoreResult> {
  if (!(await connect())) return { ok: false, problem: 'offline' };
  const p = await loadProProduct();
  if (!p) return { ok: false, problem: 'unavailable' };
  if (Platform.OS === 'android' && !p.offerToken) return { ok: false, problem: 'unavailable' };
  settle({ ok: false, problem: 'cancelled' }); // a previous tap that never got an answer
  const answer = new Promise<StoreResult>((resolve) => (waiting = resolve));
  try {
    await requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: PRO_PRODUCT_ID },
        google: { skus: [PRO_PRODUCT_ID], subscriptionOffers: p.offerToken ? [{ sku: PRO_PRODUCT_ID, offerToken: p.offerToken }] : null },
      },
    });
  } catch (e) {
    settle({ ok: false, problem: purchaseProblem(codeOf(e)) });
  }
  return answer;
}

/** Reads the store's current subscriptions and writes the result. 'none' = checked, nothing active. */
async function readEntitlement(): Promise<'active' | 'none'> {
  const purchases = await getAvailablePurchases();
  const mine = purchases.filter((x) => x.productId === PRO_PRODUCT_ID && x.purchaseState === 'purchased');
  if (mine.length > 0) {
    await grant(mine.sort((a, b) => b.transactionDate - a.transactionDate)[0]);
    return 'active';
  }
  applyStoreEntitlement(db, { active: false, expiresAt: null, productId: null, autoRenewing: null });
  await syncProNotifications().catch(() => undefined);
  return 'none';
}

/** "Restore purchase": found → Pro on; none → "No purchase found for this account." */
export async function restorePro(): Promise<{ ok: true; found: boolean } | { ok: false; problem: PurchaseProblem }> {
  if (!(await connect())) return { ok: false, problem: 'offline' };
  try {
    await restorePurchases().catch(() => undefined);
    return { ok: true, found: (await readEntitlement()) === 'active' };
  } catch (e) {
    return { ok: false, problem: purchaseProblem(codeOf(e)) };
  }
}

const REFRESH_EVERY_MS = 12 * 60 * 60 * 1000;

/**
 * Re-checks the subscription with the store (renewed, cancelled, refunded). Call on app start / foreground —
 * at most every 12 hours unless `force`. Silent when offline. Only for phones that ever had a store subscription,
 * so a free user's launch never opens a billing connection.
 */
export async function refreshProFromStore(opts: { force?: boolean; now?: number } = {}): Promise<void> {
  const row = getProState(db);
  if (!opts.force && row?.entitlement !== 'active' && row?.entitlement !== 'expired') return;
  const now = opts.now ?? Date.now();
  if (!opts.force && row?.lastVerifiedAt && now - row.lastVerifiedAt < REFRESH_EVERY_MS) return;
  if (!(await connect())) return;
  try {
    await readEntitlement();
  } catch {
    // Offline / store error: keep what we had.
  }
}
