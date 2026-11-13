import { DAY_MS, proStatus, type ProRow } from '@/domain/pro';

import { nextAnnualRenewal, perWeekText, priceText, proNotificationPlan, purchaseProblem, shortDate } from '../purchase';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

const TEXT = {
  renewTitle: 'Pro renews on {date} for {price}',
  renewBodyAndroid: 'Manage or cancel in Google Play.',
  renewBodyIOS: 'Manage or cancel in the App Store.',
  trialEndingTitle: 'Your Pro trial ends tomorrow',
  trialEndingBody: 'Automatic trips and rules will pause. Your data stays.',
} as const;
const tt = (k: keyof typeof TEXT, vars?: Record<string, string>) =>
  Object.entries(vars ?? {}).reduce((s, [a, b]) => s.replace(`{${a}}`, b), TEXT[k] as string);
const opts = { proRenewal: true, trialEnding: true, price: '£24.99', platform: 'android' as const, t: tt };

const row = (p: Partial<ProRow>): ProRow => ({ trialStartedAt: null, trialEndsAt: null, entitlement: 'none', expiresAt: null, autoRenewing: null, ...p });

describe('purchase errors (F-18)', () => {
  it('maps store error codes to what S-19 says', () => {
    expect(purchaseProblem('user-cancelled')).toBe('cancelled');
    expect(purchaseProblem('network-error')).toBe('offline');
    expect(purchaseProblem('billing-unavailable')).toBe('offline');
    // Until Phương creates sundaysort_pro_annual in the stores.
    expect(purchaseProblem('sku-not-found')).toBe('unavailable');
    expect(purchaseProblem('item-unavailable')).toBe('unavailable');
    expect(purchaseProblem('deferred-payment')).toBe('pending');
    expect(purchaseProblem('already-owned')).toBe('owned');
    expect(purchaseProblem('developer-error')).toBe('failed');
    expect(purchaseProblem(null)).toBe('failed');
  });
});

describe('renewal date (Android gives no expiry)', () => {
  it('is the next purchase anniversary after now', () => {
    expect(nextAnnualRenewal(at(2026, 4, 6), at(2026, 11, 13))).toBe(at(2027, 4, 6));
    expect(nextAnnualRenewal(at(2026, 4, 6), at(2027, 4, 7))).toBe(at(2028, 4, 6));
    expect(nextAnnualRenewal(at(2020, 4, 6), at(2026, 11, 13))).toBe(at(2027, 4, 6));
  });
  it('29 February renews on 28 February', () => {
    expect(nextAnnualRenewal(at(2028, 2, 29), at(2028, 3, 1))).toBe(at(2029, 2, 28));
  });
});

describe('price text', () => {
  it('uses the store price, falls back to the placeholder', () => {
    expect(priceText('£19.99', 'UK')).toBe('£19.99');
    expect(priceText(null, 'UK')).toBe('£24.99');
    expect(priceText('', 'US')).toBe('$31.99');
  });
  it('"About 48p a week"', () => {
    expect(perWeekText('£24.99')).toBe('48p');
    expect(perWeekText('$31.99')).toBe('62¢');
    expect(perWeekText('£99.99')).toBe('£1.92');
    expect(perWeekText('24,99 €')).toBeNull();
  });
});

describe('Pro notification plan (P1-11, F-17) — for S4', () => {
  const now = at(2027, 3, 1);
  it('renewal notice 7 days before an auto-renewing subscription renews', () => {
    const r = row({ entitlement: 'active', expiresAt: at(2027, 4, 6), autoRenewing: true });
    const plan = proNotificationPlan(r, now, opts);
    expect(plan).toEqual([
      { id: 'pro-renewal', at: at(2027, 4, 6) - 7 * DAY_MS, title: 'Pro renews on 6 Apr for £24.99', body: 'Manage or cancel in Google Play.', url: '/pro' },
    ]);
    expect(proNotificationPlan(r, now, { ...opts, platform: 'ios' })[0].body).toBe('Manage or cancel in the App Store.');
  });
  it('no renewal notice when it will not renew, when switched off, or when the time has passed', () => {
    expect(proNotificationPlan(row({ entitlement: 'active', expiresAt: at(2027, 4, 6), autoRenewing: false }), now, opts)).toEqual([]);
    expect(proNotificationPlan(row({ entitlement: 'active', expiresAt: at(2027, 4, 6), autoRenewing: true }), now, { ...opts, proRenewal: false })).toEqual([]);
    expect(proNotificationPlan(row({ entitlement: 'active', expiresAt: at(2027, 4, 6), autoRenewing: true }), at(2027, 4, 1), opts)).toEqual([]);
  });
  it('trial-ending notice on day 6, not after buying', () => {
    const start = at(2026, 11, 13);
    const trial = row({ trialStartedAt: start, trialEndsAt: start + 7 * DAY_MS });
    const [n] = proNotificationPlan(trial, start, opts);
    expect(n).toMatchObject({ id: 'pro-trial-ending', at: start + 6 * DAY_MS, title: 'Your Pro trial ends tomorrow' });
    expect(proNotificationPlan({ ...trial, entitlement: 'active', expiresAt: at(2027, 11, 15), autoRenewing: true }, start, opts).map((x) => x.id)).toEqual([
      'pro-renewal',
    ]);
    expect(proNotificationPlan(trial, start, { ...opts, trialEnding: false })).toEqual([]);
  });
  it('S-19 states follow the rows the store writes', () => {
    expect(proStatus(row({ entitlement: 'active', expiresAt: at(2027, 4, 6), autoRenewing: true }), now).kind).toBe('pro');
    expect(proStatus(row({ entitlement: 'expired', expiresAt: at(2027, 1, 6) }), now)).toMatchObject({ kind: 'expired', trialAvailable: true });
    expect(shortDate(at(2026, 11, 20))).toBe('20 Nov');
  });
});
