import { categorise, createEntry } from '@/db/entriesRepo';
import { seedCategories, listCategories } from '@/db/categoriesRepo';
import { updateSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { appendPoints, pauseTrip, startTrip } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';

import { widgetSnapshot } from '../data';

let db: AppDb;
const NOW = new Date(2026, 10, 12, 10, 0).getTime(); // Thu 12 Nov 2026
beforeEach(() => {
  db = makeTestDb();
});

describe('widgetSnapshot', () => {
  it('asks to open the app before onboarding', () => {
    const s = widgetSnapshot(db, NOW);
    expect(s.ready).toBe(false);
    expect(s.weekLine).toBe('Open Sunday Sort to set up');
  });

  it('shows this week net, unsorted count and the running trip', () => {
    updateSettings(db, { region: 'UK', onboarded: true });
    seedCategories(db, 'UK');
    createEntry(db, { type: 'income', amountMinor: 124000, currency: 'GBP', occurredAt: NOW - 3_600_000 });
    const fuel = createEntry(db, { type: 'expense', amountMinor: 18640, currency: 'GBP', occurredAt: NOW - 7_200_000 });
    createEntry(db, { type: 'expense', amountMinor: 999, currency: 'GBP', occurredAt: NOW - 8 * 86_400_000 }); // last week
    const cat = listCategories(db).find((c) => c.type === 'expense')!;
    categorise(db, fuel.id, cat.id);

    let s = widgetSnapshot(db, NOW);
    expect(s.ready).toBe(true);
    expect(s.netText).toBe('£1,053.60');
    expect(s.toSort).toBe(1);
    expect(s.weekLine).toBe('This week: Net £1,053.60 · 1 to sort');
    expect(s.rangeText).toBe('9–15 Nov');
    expect(s.detailText).toBe('In £1,240.00 · Out £186.40 · 0 mi');
    expect(s.trip).toBe('none');

    const trip = startTrip(db, 'work', NOW);
    appendPoints(db, trip.id, [
      { ts: NOW + 1000, lat: 53.8, lng: -1.5, accuracy: 5 },
      { ts: NOW + 61_000, lat: 53.81, lng: -1.5, accuracy: 5 },
    ]);
    s = widgetSnapshot(db, NOW);
    expect(s.trip).toBe('running');
    expect(s.tripDistance).toBe('0.7 mi');
    pauseTrip(db, trip.id);
    expect(widgetSnapshot(db, NOW).trip).toBe('paused');
  });

  it('says All sorted when nothing waits', () => {
    updateSettings(db, { region: 'US', onboarded: true });
    expect(widgetSnapshot(db, NOW).weekLine).toBe('This week: Net $0.00 · All sorted');
  });
});
