import { addReceipt, createEntry } from '@/db/entriesRepo';
import { seedCategories, listCategories } from '@/db/categoriesRepo';
import { applyStoreEntitlement, getProState, getProStatus, photosUsedThisMonth, startTrial } from '@/db/proRepo';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip } from '@/db/tripsRepo';
import { changeVehicleCostMethod, hasWorkVehicleDataThisYear } from '@/db/vehicleCostsRepo';
import {
  DAY_MS,
  hasPro,
  photoAllowance,
  proStatus,
  renewalNoticeAt,
  trialEndingNoticeAt,
  trialWindow,
  type ProRow,
} from '@/domain/pro';
import { merchantKey, readingToEntryFields, ruleMatchText, signalsOf } from '@/domain/receiptSignal';
import { businessUse, methodChangeNeedsConfirm, splitCoveredByMileage, vehicleTreatment } from '@/domain/vehicleCosts';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 11, 13);
const row = (p: Partial<ProRow> = {}): ProRow => ({
  trialStartedAt: null,
  trialEndsAt: null,
  entitlement: 'none',
  expiresAt: null,
  autoRenewing: null,
  ...p,
});

describe('Pro status (product.md §6)', () => {
  it('free with a trial available when nothing happened yet', () => {
    expect(proStatus(null, NOW)).toEqual({ kind: 'free', trialAvailable: true });
    expect(hasPro(proStatus(null, NOW))).toBe(false);
  });

  it('7-day trial: days left, ends exactly 7 days later, then expired without a second trial', () => {
    const w = trialWindow(null, NOW)!;
    expect(w.trialEndsAt - w.trialStartedAt).toBe(7 * DAY_MS);
    const r = row(w);
    expect(proStatus(r, NOW)).toEqual({ kind: 'trial', endsAt: w.trialEndsAt, daysLeft: 7 });
    expect(proStatus(r, NOW + 2 * DAY_MS + 1)).toMatchObject({ kind: 'trial', daysLeft: 5 });
    expect(proStatus(r, w.trialEndsAt - 1)).toMatchObject({ kind: 'trial', daysLeft: 1 });
    expect(proStatus(r, w.trialEndsAt)).toEqual({ kind: 'expired', endedAt: w.trialEndsAt, trialAvailable: false });
    expect(trialWindow(r, NOW + 30 * DAY_MS)).toBeNull();
    expect(trialEndingNoticeAt(r)).toBe(w.trialEndsAt - DAY_MS);
  });

  it('clock set back before the trial started does not keep Pro on', () => {
    const r = row(trialWindow(null, NOW)!);
    expect(proStatus(r, NOW - 3 * DAY_MS).kind).toBe('expired');
  });

  it('store subscription wins over the trial; lapses to expired; renewal notice 7 days before', () => {
    const r = row({ ...trialWindow(null, NOW)!, entitlement: 'active', expiresAt: at(2027, 11, 13), autoRenewing: true });
    expect(proStatus(r, NOW)).toEqual({ kind: 'pro', renewsAt: at(2027, 11, 13), autoRenewing: true });
    expect(renewalNoticeAt(r)).toBe(at(2027, 11, 13) - 7 * DAY_MS);
    expect(proStatus(r, at(2027, 11, 14))).toMatchObject({ kind: 'expired', endedAt: at(2027, 11, 13) });
    expect(renewalNoticeAt({ ...r, autoRenewing: false })).toBeNull();
  });

  it('photo allowance: 20 a month for free, unlimited with Pro', () => {
    expect(photoAllowance(18, false)).toEqual({ limit: 20, used: 18, left: 2, blocked: false });
    expect(photoAllowance(25, false)).toMatchObject({ left: 0, blocked: true });
    expect(photoAllowance(25, true)).toEqual({ limit: null, used: 25, left: null, blocked: false });
  });
});

describe('proRepo', () => {
  it('starts the trial once and records store results without losing it', () => {
    const db = makeTestDb();
    expect(startTrial(db, NOW)).toBe(true);
    expect(startTrial(db, NOW + DAY_MS)).toBe(false);
    expect(getProStatus(db, NOW).kind).toBe('trial');
    applyStoreEntitlement(db, { active: true, expiresAt: at(2027, 11, 13), productId: 'sundaysort_pro_annual', autoRenewing: true }, NOW);
    expect(getProStatus(db, NOW).kind).toBe('pro');
    applyStoreEntitlement(db, { active: false, expiresAt: null, productId: null, autoRenewing: null }, at(2027, 12, 1));
    const st = getProState(db)!;
    expect(st).toMatchObject({ entitlement: 'expired', expiresAt: at(2027, 11, 13), productId: 'sundaysort_pro_annual' });
    expect(st.trialStartedAt).toBe(NOW);
    expect(getProStatus(db, at(2027, 12, 1)).kind).toBe('expired');
  });

  it('counts photos of this calendar month; split parts sharing a file count once', () => {
    const db = makeTestDb();
    const e = createEntry(db, { type: 'expense', amountMinor: 100, currency: 'GBP', receiptPaths: ['a.jpg', 'b.jpg'] }, at(2026, 11, 2));
    addReceipt(db, e.id, 'a.jpg', at(2026, 11, 3));
    addReceipt(db, e.id, 'old.jpg', at(2026, 10, 31));
    expect(photosUsedThisMonth(db, at(2026, 11, 20))).toBe(2);
    expect(photosUsedThisMonth(db, at(2026, 12, 1))).toBe(0);
  });
});

describe('vehicle cost method (X2, Q24)', () => {
  it('mileage / unsure leave running costs out; actual counts everything and shows business use', () => {
    expect(vehicleTreatment('mileage')).toEqual({ claimsMileage: true, excludesRunningCosts: true, showsBusinessUse: false, nudgeToChoose: false });
    expect(vehicleTreatment('unsure')).toEqual({ claimsMileage: true, excludesRunningCosts: true, showsBusinessUse: false, nudgeToChoose: true });
    expect(vehicleTreatment('actual')).toEqual({ claimsMileage: false, excludesRunningCosts: false, showsBusinessUse: true, nudgeToChoose: false });
    const rows = [
      { amountMinor: 6000, vehicleRunningCost: true },
      { amountMinor: 800, vehicleRunningCost: false },
      { amountMinor: 30000, vehicleRunningCost: true },
    ];
    expect(splitCoveredByMileage(rows, 'mileage')).toMatchObject({ coveredMinor: 36000, counted: [rows[1]] });
    expect(splitCoveredByMileage(rows, 'actual')).toMatchObject({ coveredMinor: 0, counted: rows });
    expect(businessUse(30450, 35000)).toEqual({ share: 30450 / 35000, percent: 87 });
    expect(businessUse(0, 0)).toBeNull();
  });

  it('asks before switching between real methods only when this tax year has work vehicle data', () => {
    expect(methodChangeNeedsConfirm('unsure', 'actual', true)).toBe(false);
    expect(methodChangeNeedsConfirm('mileage', 'unsure', true)).toBe(false);
    expect(methodChangeNeedsConfirm('mileage', 'actual', false)).toBe(false);
    expect(methodChangeNeedsConfirm('mileage', 'actual', true)).toBe(true);

    const db = makeTestDb();
    updateSettings(db, { region: 'UK' });
    seedCategories(db, 'UK');
    expect(getSettings(db).vehicleCostMethod).toBe('unsure');
    expect(changeVehicleCostMethod(db, 'mileage', { now: NOW }).status).toBe('saved');
    expect(changeVehicleCostMethod(db, 'mileage', { now: NOW }).status).toBe('unchanged');
    // Nothing logged this tax year (6 Apr 2026 – 5 Apr 2027) yet → no question.
    const fuel = listCategories(db).find((c) => c.key === 'fuel')!.id;
    createEntry(db, { type: 'expense', amountMinor: 4000, currency: 'GBP', categoryId: fuel, occurredAt: at(2026, 3, 1) });
    expect(hasWorkVehicleDataThisYear(db, NOW)).toBe(false);
    createEntry(db, { type: 'expense', amountMinor: 4000, currency: 'GBP', categoryId: fuel, occurredAt: at(2026, 5, 1) });
    expect(hasWorkVehicleDataThisYear(db, NOW)).toBe(true);
    expect(changeVehicleCostMethod(db, 'actual', { now: NOW }).status).toBe('needs_confirm');
    expect(getSettings(db).vehicleCostMethod).toBe('mileage');
    expect(changeVehicleCostMethod(db, 'actual', { now: NOW, confirmed: true }).status).toBe('saved');
    expect(getSettings(db).vehicleCostMethod).toBe('actual');
  });

  it('a work trip this tax year also counts as vehicle data', () => {
    const db = makeTestDb();
    updateSettings(db, { region: 'UK' });
    addManualTrip(db, { date: at(2026, 6, 1), scope: 'personal', purpose: '', miles: 10 });
    expect(hasWorkVehicleDataThisYear(db, NOW)).toBe(false);
    addManualTrip(db, { date: at(2026, 6, 2), scope: 'work', purpose: '', miles: 10 });
    expect(hasWorkVehicleDataThisYear(db, NOW)).toBe(true);
  });
});

describe('settings defaults for bản 2', () => {
  it('existing installs read the new keys with their defaults', () => {
    const s = getSettings(makeTestDb());
    expect(s).toMatchObject({
      vehicleCostMethod: 'unsure',
      mergeStopMinutes: 20,
      autoTrips: false,
      backupNightly: false,
      backupFolder: null,
      mtdPeriod: 'standard',
    });
    expect(s.workHours.on).toBe(false);
    expect(s.dailyNudge.on).toBe(false);
  });
});

describe('receipt signal contract (S3 → S2)', () => {
  it('keeps only confident OCR fields', () => {
    const f = readingToEntryFields({
      amountMinor: 4520,
      merchant: '  SHELL UK OIL PRODUCTS LTD ',
      date: at(2026, 11, 3, 0),
      confidence: { amount: 0.9, merchant: 0.8, date: 0.3 },
    });
    expect(f).toEqual({ ocrAmountMinor: 4520, ocrMerchant: 'SHELL UK OIL PRODUCTS LTD', ocrDate: null });
    expect(signalsOf(f)).toEqual({ merchant: 'SHELL UK OIL PRODUCTS LTD', merchantKey: 'shell oil', ocrAmountMinor: 4520, ocrDate: null });
  });

  it('merchant keys drop store numbers and company suffixes', () => {
    expect(merchantKey('SHELL UK OIL PRODUCTS LTD #4521')).toBe('shell oil');
    expect(merchantKey('Tesco Express')).toBe('tesco express');
    expect(merchantKey('BP')).toBe('bp');
    expect(merchantKey('1234')).toBe('');
    expect(ruleMatchText('fuel M62', 'Shell')).toBe('fuel m62 shell');
  });
});
