import { seedCategories } from '@/db/categoriesRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, getTrip } from '@/db/tripsRepo';
import { milesToMeters } from '@/domain/mileage';
import { replaceAllData, snapshotTables } from '@/features/backup/dataStore';

import {
  deleteSavedTrip,
  listSavedTrips,
  markSavedTripUsed,
  renameSavedTrip,
  restoreSavedTrip,
  savedMiles,
  savedRoute,
  saveTripAsRegular,
} from '../repo';

const T0 = new Date(2026, 10, 10, 7, 0).getTime();
const route = { from: { label: 'DLS4', lat: 53.79, lng: -1.6 }, to: { label: 'Tesco Leeds', lat: 53.8, lng: -1.54 }, roundTrip: true };

function setup() {
  const db = makeTestDb();
  seedCategories(db, 'UK');
  return db;
}

describe('Regular trips (Q31)', () => {
  it('saves one way, adds back × 2 for a round trip, keeps the A → B ends (TC-360, TC-361)', () => {
    const db = setup();
    const trip = addManualTrip(db, { date: T0, scope: 'work', purpose: 'Depot run', miles: 24.8, route });
    const s = saveTripAsRegular(db, trip, '  Depot → Leeds  ', T0);
    expect(s).toMatchObject({ label: 'Depot → Leeds', roundTrip: true, scope: 'work', purpose: 'Depot run', useCount: 0 });
    expect(savedMiles(s, false)).toBeCloseTo(12.4, 3);
    expect(savedMiles(s, true)).toBeCloseTo(24.8, 3);
    expect(savedRoute(s, false)).toEqual({ ...route, roundTrip: false });

    const added = addManualTrip(db, { date: T0 + 86_400_000, scope: s.scope, purpose: s.purpose, miles: savedMiles(s, true), route: savedRoute(s, true)! });
    markSavedTripUsed(db, s.id, T0 + 86_400_000);
    expect(getTrip(db, added.id)).toMatchObject({ fromLabel: 'DLS4', toLabel: 'Tesco Leeds', roundTrip: true });
    expect(getTrip(db, added.id)!.distanceM).toBeCloseTo(milesToMeters(24.8), 3);
    expect(listSavedTrips(db)[0]).toMatchObject({ useCount: 1, lastUsedAt: T0 + 86_400_000 });
  });

  it('a typed-distance trip has no route; most used comes first; rename / remove / undo', () => {
    const db = setup();
    const a = saveTripAsRegular(db, addManualTrip(db, { date: T0, scope: 'personal', purpose: '', miles: 5 }), 'Gym', T0);
    const b = saveTripAsRegular(db, addManualTrip(db, { date: T0, scope: 'work', purpose: '', miles: 9 }), 'Depot', T0 + 1);
    expect(savedRoute(a, false)).toBeNull();
    markSavedTripUsed(db, a.id);
    expect(listSavedTrips(db).map((x) => x.label)).toEqual(['Gym', 'Depot']);
    renameSavedTrip(db, b.id, 'Main depot');
    const gone = deleteSavedTrip(db, a.id)!;
    expect(listSavedTrips(db).map((x) => x.label)).toEqual(['Main depot']);
    restoreSavedTrip(db, gone);
    expect(listSavedTrips(db)).toHaveLength(2);
  });

  it('is part of backups', () => {
    const db = setup();
    saveTripAsRegular(db, addManualTrip(db, { date: T0, scope: 'work', purpose: '', miles: 9 }), 'Depot', T0);
    const tables = snapshotTables(db);
    expect(tables.savedTrips).toHaveLength(1);
    const other = setup();
    replaceAllData(other, tables);
    expect(listSavedTrips(other).map((x) => x.label)).toEqual(['Depot']);
  });
});
