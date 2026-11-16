import { seedCategories } from '@/db/categoriesRepo';
import { createEntry, getEntry, updateEntry } from '@/db/entriesRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, getTrip, updateTrip } from '@/db/tripsRepo';

import { exportChanges, lastExportAt, markExported } from '../exported';

const T0 = new Date(2026, 9, 10, 9, 0).getTime();
const Q = { start: new Date(2026, 9, 6).getTime(), end: new Date(2027, 0, 6).getTime(), fileStem: '2026-27-Q3' };

function setup() {
  const db = makeTestDb();
  seedCategories(db, 'UK');
  const inQ = createEntry(db, { type: 'expense', amountMinor: 7240, currency: 'GBP', note: 'Shell' }, T0);
  const personal = createEntry(db, { type: 'expense', amountMinor: 420, currency: 'GBP', note: 'Greggs', scope: 'personal' }, T0);
  const outside = createEntry(db, { type: 'expense', amountMinor: 999, currency: 'GBP' }, new Date(2026, 6, 1).getTime());
  const trip = addManualTrip(db, { date: T0, scope: 'work', purpose: '', miles: 42.3 });
  return { db, inQ, personal, outside, trip };
}

describe('Exported marker (Q29)', () => {
  it('stamps the period’s work entries and trips, not the rest (TC-363)', () => {
    const { db, inQ, personal, outside, trip } = setup();
    expect(lastExportAt(db, Q.fileStem)).toBeNull();
    markExported(db, Q, false, T0 + 1000);
    expect(getEntry(db, inQ.id)?.exportedAt).toBe(T0 + 1000);
    expect(getTrip(db, trip.id)?.exportedAt).toBe(T0 + 1000);
    expect(getEntry(db, personal.id)?.exportedAt).toBeNull();
    expect(getEntry(db, outside.id)?.exportedAt).toBeNull();
    expect(lastExportAt(db, Q.fileStem)).toBe(T0 + 1000);
    expect(exportChanges(db, Q, false)).toBe(0);
    // With Personal included the Greggs entry was never exported.
    expect(exportChanges(db, Q, true)).toBe(1);
  });

  it('an edit after the export clears the stamp and counts as a change (TC-364)', () => {
    const { db, inQ, trip } = setup();
    markExported(db, Q, false, T0 + 1000);
    updateEntry(db, inQ.id, { note: 'Shell M62' });
    expect(getEntry(db, inQ.id)?.exportedAt).toBeNull();
    updateTrip(db, trip.id, { miles: 43 });
    expect(getTrip(db, trip.id)?.exportedAt).toBeNull();
    createEntry(db, { type: 'income', amountMinor: 62000, currency: 'GBP' }, T0 + 5000);
    expect(exportChanges(db, Q, false)).toBe(3);
  });

  it('writes that change nothing the driver sees keep the stamp', () => {
    const { db, inQ, trip } = setup();
    markExported(db, Q, false, T0 + 1000);
    updateEntry(db, inQ.id, { note: 'Shell' });
    updateTrip(db, trip.id, { scope: 'work' });
    expect(getEntry(db, inQ.id)?.exportedAt).toBe(T0 + 1000);
    expect(getTrip(db, trip.id)?.exportedAt).toBe(T0 + 1000);
  });
});
