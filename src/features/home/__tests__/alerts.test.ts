import { eq } from 'drizzle-orm';

import { autoSortedCount, createEntry, listEntries } from '@/db/entriesRepo';
import { entries } from '@/db/schema';
import { DEFAULT_SETTINGS, updateSettings } from '@/db/settingsRepo';
import { startTrial } from '@/db/proRepo';
import { makeTestDb } from '@/db/testing/testDb';
import type { AppDb } from '@/db/types';
import { weekOf } from '@/domain/week';
import { backupAlertSignals } from '@/features/backup/homeAlerts';
import { autoTripState } from '@/features/trips/autoState';
import { widgetSnapshot } from '@/features/widgets/data';

import { ALERT_SNOOZE_MS, joinDays, pickHomeAlert } from '../alerts';

const NOW = new Date(2026, 10, 12, 10, 0).getTime(); // Thu 12 Nov 2026
const DAY = 86_400_000;

describe('pickHomeAlert', () => {
  it('shows only the highest-priority due card', () => {
    expect(pickHomeAlert({ oldBackup: true, proRenews: true, backupFailing: true }, {}, NOW)).toBe('backupFailing');
    expect(pickHomeAlert({ noTrips: true, autoPaused: true }, {}, NOW)).toBe('autoPaused');
    expect(pickHomeAlert({}, {}, NOW)).toBeNull();
  });

  it('skips a hidden card for 7 days, then shows it again', () => {
    const snoozed = { autoPaused: NOW + ALERT_SNOOZE_MS };
    expect(pickHomeAlert({ autoPaused: true, proRenews: true }, snoozed, NOW)).toBe('proRenews');
    expect(pickHomeAlert({ autoPaused: true, proRenews: true }, snoozed, NOW + ALERT_SNOOZE_MS)).toBe('autoPaused');
  });

  it('never hides "trip stopped recording"', () => {
    expect(pickHomeAlert({ tripStopped: true, autoPaused: true }, { tripStopped: NOW + DAY }, NOW)).toBe('tripStopped');
  });

  it('joins day names for the no-trips card', () => {
    expect(joinDays(['Tue'])).toBe('Tue');
    expect(joinDays(['Tue', 'Wed'])).toBe('Tue or Wed');
    expect(joinDays(['Mon', 'Tue', 'Wed'])).toBe('Mon, Tue or Wed');
  });
});

describe('backupAlertSignals', () => {
  const base = { ...DEFAULT_SETTINGS, lastBackupAt: NOW - 40 * DAY };

  it('fails after 3 nightly errors, only while nightly backup is on', () => {
    expect(backupAlertSignals({ ...base, backupNightly: true, backupFailCount: 3 }, 50, NOW).failing).toBe(true);
    expect(backupAlertSignals({ ...base, backupNightly: true, backupFailCount: 2 }, 50, NOW).failing).toBe(false);
    expect(backupAlertSignals({ ...base, backupNightly: false, backupFailCount: 3 }, 50, NOW).failing).toBe(false);
  });

  it('keeps the old "last backup" banner only while nightly backup is off', () => {
    expect(backupAlertSignals({ ...base, backupNightly: false }, 50, NOW).old).toBe(true);
    expect(backupAlertSignals({ ...base, backupNightly: true }, 50, NOW).old).toBe(false);
  });
});

describe('auto-sorted / recurring entries', () => {
  let db: AppDb;
  beforeEach(() => {
    db = makeTestDb();
  });

  it('counts unreviewed rule-sorted entries this week and filters Entries by source', () => {
    const a = createEntry(db, { type: 'expense', amountMinor: 1000, currency: 'GBP', occurredAt: NOW - DAY });
    const b = createEntry(db, { type: 'expense', amountMinor: 2000, currency: 'GBP', occurredAt: NOW - DAY });
    const c = createEntry(db, { type: 'expense', amountMinor: 3000, currency: 'GBP', occurredAt: NOW - DAY });
    createEntry(db, { type: 'expense', amountMinor: 4000, currency: 'GBP', occurredAt: NOW - DAY });
    db.update(entries).set({ ruleId: 'r1' }).where(eq(entries.id, a.id)).run();
    db.update(entries).set({ ruleId: 'r1', autoReviewedAt: NOW }).where(eq(entries.id, b.id)).run();
    db.update(entries).set({ recurringId: 'rec1', source: 'recurring' }).where(eq(entries.id, c.id)).run();

    expect(autoSortedCount(db, weekOf(NOW))).toBe(1);
    expect(autoSortedCount(db, weekOf(NOW - 7 * DAY))).toBe(0);
    expect(listEntries(db, { autoSorted: true }).map((e) => e.id).sort()).toEqual([a.id, b.id].sort());
    expect(listEntries(db, { recurring: true }).map((e) => e.id)).toEqual([c.id]);
  });
});

describe('automatic trips state (widget / Home)', () => {
  it('is on only with the setting and Pro', () => {
    expect(autoTripState({ autoTrips: true }, true)).toBe('on');
    expect(autoTripState({ autoTrips: true }, false)).toBe('off');
    expect(autoTripState({ autoTrips: false }, true)).toBe('off');
  });

  it('adds the "Auto trips on" line to the widget during a trial', () => {
    const db = makeTestDb();
    updateSettings(db, { region: 'UK', onboarded: true, autoTrips: true });
    expect(widgetSnapshot(db, NOW).auto).toBe('off');
    startTrial(db, NOW - DAY);
    const s = widgetSnapshot(db, NOW);
    expect(s.auto).toBe('on');
    expect(s.autoText).toBe('Auto trips on');
  });
});
