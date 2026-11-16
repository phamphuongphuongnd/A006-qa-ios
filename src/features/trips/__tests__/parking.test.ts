import { seedCategories , listCategories } from '@/db/categoriesRepo';
import { getEntry, listEntries } from '@/db/entriesRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, deleteTrip, getTrip, updateTrip } from '@/db/tripsRepo';
import { buildReport } from '@/domain/report';
import { listTrash, restoreFromTrash, trashTrip, tripTrashId } from '@/features/trash/repo';
import { snapshotTrip } from '@/features/trips/auto/repo';

import { detachParking, parkingByTrip, parkingCategoryId, setTripParking, tripParkingMinor, undoDetach } from '../parking';

const T0 = new Date(2026, 10, 10, 7, 0).getTime();

function setup(scope: 'work' | 'personal' | 'unsorted' = 'work') {
  const db = makeTestDb();
  seedCategories(db, 'UK');
  const trip = addManualTrip(db, { date: T0, endedAt: T0 + 3_600_000, scope, purpose: 'Leeds drops', miles: 42.3 });
  return { db, trip };
}

describe('Parking & tolls on a trip (Q28)', () => {
  it('creates one sorted expense linked to the trip, dated at its end (TC-356)', () => {
    const { db, trip } = setup();
    const id = setTripParking(db, trip, 350, 'GBP', 'Parking · Leeds drops', T0);
    const e = getEntry(db, id!)!;
    expect(e).toMatchObject({
      type: 'expense',
      amountMinor: 350,
      tripId: trip.id,
      scope: 'work',
      categoryId: parkingCategoryId(db),
      occurredAt: T0 + 3_600_000,
      note: 'Parking · Leeds drops',
    });
    expect(e.sortedAt).not.toBeNull();
    expect(parkingByTrip(db, [trip.id]).get(trip.id)).toBe(350);
  });

  it('updates the amount, and clearing it sends the expense to Recently deleted (TC-357)', () => {
    const { db, trip } = setup();
    const id = setTripParking(db, trip, 350, 'GBP', 'P')!;
    expect(setTripParking(db, trip, 420, 'GBP', 'P')).toBe(id);
    expect(tripParkingMinor(db, trip.id)).toBe(420);
    expect(setTripParking(db, trip, null, 'GBP', 'P')).toBeNull();
    expect(getEntry(db, id)).toBeUndefined();
    expect(listTrash(db)).toHaveLength(1);
  });

  it('an Unsorted trip gives an unsorted expense; sorting the trip sorts it (trigger)', () => {
    const { db, trip } = setup('unsorted');
    const id = setTripParking(db, trip, 375, 'GBP', 'P')!;
    expect(getEntry(db, id)).toMatchObject({ categoryId: null, scope: 'work' });
    updateTrip(db, trip.id, { scope: 'personal' });
    expect(getEntry(db, id)).toMatchObject({ categoryId: parkingCategoryId(db), scope: 'personal' });
    updateTrip(db, trip.id, { scope: 'work' });
    expect(getEntry(db, id)?.scope).toBe('work');
  });

  it('delete trip → "Delete both" / "Keep the expense", Undo and restore link it back (TC-358)', () => {
    const { db, trip } = setup();
    const id = setTripParking(db, trip, 350, 'GBP', 'P')!;

    // Delete both, then Undo.
    let snap = snapshotTrip(db, trip.id)!;
    let r = detachParking(db, trip.id, true);
    deleteTrip(db, trip.id);
    trashTrip(db, snap, Date.now(), r.kept);
    expect(getEntry(db, id)).toBeUndefined();
    restoreFromTrash(db, tripTrashId(trip.id));
    undoDetach(db, trip.id, r);
    expect(getEntry(db, id)?.tripId).toBe(trip.id);
    expect(listTrash(db)).toEqual([]);

    // Keep the expense, then restore the trip from Recently deleted.
    snap = snapshotTrip(db, trip.id)!;
    r = detachParking(db, trip.id, false);
    deleteTrip(db, trip.id);
    trashTrip(db, snap, Date.now(), r.kept);
    expect(getEntry(db, id)?.tripId).toBeNull();
    restoreFromTrash(db, tripTrashId(trip.id));
    expect(getTrip(db, trip.id)).toBeDefined();
    expect(getEntry(db, id)?.tripId).toBe(trip.id);
  });

  it('reports count it as parking on top of the mileage rate (TC-359)', () => {
    const { db, trip } = setup();
    setTripParking(db, trip, 350, 'GBP', 'P');
    const report = buildReport(listEntries(db), listCategories(db, { includeHidden: true }), { start: T0 - 1, end: T0 + 86_400_000 }, {
      includePersonal: false,
      vehicle: { method: 'mileage', mileageMinor: 2327, workMiles: 42.3, region: 'UK' },
    });
    const parking = report.byCategory.find((c) => c.categoryId === parkingCategoryId(db));
    expect(parking?.totalMinor).toBe(350);
    expect(report.coveredMinor).toBe(0);
  });
});
