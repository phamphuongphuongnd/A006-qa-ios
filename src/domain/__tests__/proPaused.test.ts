import { listCategories, seedCategories } from '@/db/categoriesRepo';
import { createEntry } from '@/db/entriesRepo';
import { applyStoreEntitlement, getProStatus, startTrial } from '@/db/proRepo';
import { updateSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { DAY_MS, effectiveProStatus, FREE_PHOTOS_PER_MONTH, hasPro, photoAllowance, PRO_PAUSED, proStatus } from '@/domain/pro';
import { applyRulesOnSave } from '@/features/rules/applyOnSave';
import { createRule } from '@/features/rules/repo';
import { widgetSnapshot } from '@/features/widgets/data';

/**
 * First store release (product.md "★ Bản đầu", 2026-11-19): Pro is paused, every feature is open to everyone.
 * The Pro rules themselves keep their own tests (run with PRO_PAUSED = false).
 */
const NOW = new Date(2026, 10, 19, 12, 0).getTime();

describe('Pro paused (first release)', () => {
  it('is switched on for this release', () => {
    expect(PRO_PAUSED).toBe(true);
  });

  it('answers all_free whatever is stored, and all_free counts as having every feature', () => {
    const expiredTrial = { trialStartedAt: NOW - 10 * DAY_MS, trialEndsAt: NOW - 3 * DAY_MS, entitlement: 'none' as const, expiresAt: null, autoRenewing: null };
    expect(effectiveProStatus(null, NOW)).toEqual({ kind: 'all_free' });
    expect(effectiveProStatus(expiredTrial, NOW)).toEqual({ kind: 'all_free' });
    expect(hasPro({ kind: 'all_free' })).toBe(true);
    // Switched off again, the stored rules decide as before.
    expect(effectiveProStatus(expiredTrial, NOW, false)).toEqual(proStatus(expiredTrial, NOW));
  });

  it('ignores an ended trial or subscription on the phone', () => {
    const db = makeTestDb();
    expect(getProStatus(db, NOW)).toEqual({ kind: 'all_free' });
    startTrial(db, NOW - 10 * DAY_MS);
    expect(getProStatus(db, NOW)).toEqual({ kind: 'all_free' });
    applyStoreEntitlement(db, { active: false, expiresAt: NOW - DAY_MS, autoRenewing: false, productId: 'x' }, NOW);
    expect(getProStatus(db, NOW)).toEqual({ kind: 'all_free' });
  });

  it('has no photo limit', () => {
    const a = photoAllowance(FREE_PHOTOS_PER_MONTH + 5, hasPro(effectiveProStatus(null, NOW)));
    expect(a).toMatchObject({ limit: null, blocked: false });
  });

  it('applies auto-sort rules without a trial', () => {
    const db = makeTestDb();
    seedCategories(db, 'UK');
    const fuel = listCategories(db).find((c) => c.key === 'fuel')!;
    createRule(db, { matchText: 'Shell', type: 'expense', minMinor: null, maxMinor: null, categoryId: fuel.id, scope: 'work' }, NOW);
    const e = createEntry(db, { type: 'expense', amountMinor: 5000, currency: 'GBP', note: 'Shell M62', occurredAt: NOW - 3600_000 }, NOW - 3600_000);
    expect(applyRulesOnSave(db, e.id, NOW)?.categoryName).toBe('Fuel');
  });

  it('runs automatic trips without a trial', () => {
    const db = makeTestDb();
    updateSettings(db, { region: 'UK', onboarded: true, autoTrips: true });
    expect(widgetSnapshot(db, NOW).auto).toBe('on');
  });
});
