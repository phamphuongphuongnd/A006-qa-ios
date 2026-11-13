import { getSettings } from '@/db/settingsRepo';
import { makeTestDb } from '@/db/testing/testDb';
import { appendPoints, deleteTrip, endTrip, getTrip, startTrip, tripPointsOf } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { metersToMiles } from '@/domain/mileage';

import {
  editGpsTrip,
  finishAutoTrip,
  getKV,
  listSegments,
  listStops,
  restoreTrip,
  restoreTripScope,
  revertTripRow,
  setKV,
  setTripScope,
  snapshotTrip,
  splitTripAt,
  toggleSegment,
  unsplitTrip,
} from '../auto/repo';

const MIN = 60_000;
const T0 = new Date(2026, 10, 10, 8, 0).getTime();

/** A done GPS trip: drive north 5 min, stop 12 min, drive on. Points every minute, moving fast. */
function seedTrip(db: AppDb, lng = -0.1) {
  const trip = startTrip(db, 'work', T0, 'auto');
  const pts = [];
  for (let i = 0; i <= 5; i++) pts.push({ ts: T0 + i * MIN, lat: 51.5 + i * 0.01, lng, accuracy: 5, speed: 15 });
  for (let i = 0; i <= 5; i++) pts.push({ ts: T0 + (17 + i) * MIN, lat: 51.5501 + i * 0.01, lng, accuracy: 5, speed: 15 });
  appendPoints(db, trip.id, pts);
  endTrip(db, trip.id, T0 + 22 * MIN);
  finishAutoTrip(db, trip.id, 'unsorted', null);
  return getTrip(db, trip.id)!;
}

describe('auto trip repository', () => {
  it('key-value store does not leak into typed settings', () => {
    const db = makeTestDb();
    expect(getKV(db, 'x', 1)).toBe(1);
    setKV(db, 'x', { a: 2 });
    expect(getKV(db, 'x', null)).toEqual({ a: 2 });
    expect(getSettings(db)).not.toHaveProperty('s1.x');
  });

  it('finds the stop, toggles a personal segment and splits the trip there', () => {
    const db = makeTestDb();
    const trip = seedTrip(db);
    const stops = listStops(db, trip.id);
    expect(stops).toHaveLength(1);
    expect(stops[0].startedAt).toBe(T0 + 5 * MIN);

    const seg = toggleSegment(db, trip.id, { fromTs: T0, toTs: stops[0].startedAt });
    expect(seg?.distanceM).toBeGreaterThan(4000);
    expect(listSegments(db, trip.id)).toHaveLength(1);
    expect(toggleSegment(db, trip.id, { fromTs: T0, toTs: stops[0].startedAt })).toBeNull();
    expect(listSegments(db, trip.id)).toHaveLength(0);

    const newId = splitTripAt(db, trip.id, stops[0].endedAt);
    expect(newId).toBeTruthy();
    const a = getTrip(db, trip.id)!;
    const b = getTrip(db, newId!)!;
    expect(a.endedAt).toBe(T0 + 5 * MIN);
    expect(b.startedAt).toBe(T0 + 17 * MIN);
    expect(Math.round(a.distanceM + b.distanceM)).toBeLessThanOrEqual(Math.round(trip.distanceM));
    expect(listStops(db, a.id)).toHaveLength(0);
  });

  it('hand edit keeps the recorded values once and marks Edited', () => {
    const db = makeTestDb();
    const trip = seedTrip(db);
    editGpsTrip(db, trip.id, { startedAt: T0 + 17 * MIN });
    let t = getTrip(db, trip.id)!;
    expect(t.edited).toBe(true);
    expect(t.originalStartedAt).toBe(T0);
    expect(t.originalDistanceM).toBe(trip.distanceM);
    expect(t.distanceM).toBeLessThan(trip.distanceM); // only the track inside the new times
    editGpsTrip(db, trip.id, { miles: 3 });
    t = getTrip(db, trip.id)!;
    expect(metersToMiles(t.distanceM)).toBeCloseTo(3);
    expect(t.originalStartedAt).toBe(T0);
    expect(() => editGpsTrip(db, trip.id, { endedAt: T0 })).toThrow();
  });

  it('sorting by hand marks the driver choice; Undo restores the scope', () => {
    const db = makeTestDb();
    const trip = seedTrip(db);
    const prev = setTripScope(db, trip.id, 'personal')!;
    expect(prev.scope).toBe('unsorted');
    expect(getTrip(db, trip.id)).toMatchObject({ scope: 'personal', classifiedBy: 'user' });
    restoreTripScope(db, trip.id, prev);
    expect(getTrip(db, trip.id)?.scope).toBe('unsorted');
  });

  it('Undo of a split puts the trip back as one, segments and stop included', () => {
    const db = makeTestDb();
    const trip = seedTrip(db);
    const stop = listStops(db, trip.id)[0];
    const seg = toggleSegment(db, trip.id, { fromTs: stop.endedAt, toTs: trip.endedAt! })!;
    const before = getTrip(db, trip.id)!;
    const second = splitTripAt(db, trip.id, stop.endedAt)!;
    expect(listSegments(db, second)).toHaveLength(1);
    unsplitTrip(db, before, second);
    expect(getTrip(db, second)).toBeUndefined();
    expect(getTrip(db, trip.id)).toEqual(before);
    expect(tripPointsOf(db, trip.id)).toHaveLength(12);
    expect(listSegments(db, trip.id).map((s) => s.id)).toEqual([seg.id]);
    expect(listStops(db, trip.id)).toHaveLength(1);
  });

  it('Undo of a delete restores the trip with its points, stops and segments', () => {
    const db = makeTestDb();
    const trip = seedTrip(db);
    const stop = listStops(db, trip.id)[0];
    toggleSegment(db, trip.id, { fromTs: T0, toTs: stop.startedAt });
    const snap = snapshotTrip(db, trip.id)!;
    deleteTrip(db, trip.id);
    expect(getTrip(db, trip.id)).toBeUndefined();
    expect(tripPointsOf(db, trip.id)).toHaveLength(0);
    restoreTrip(db, snap);
    expect(getTrip(db, trip.id)).toEqual(snap.trip);
    expect(tripPointsOf(db, trip.id)).toEqual(snap.points);
    expect(listStops(db, trip.id)).toEqual(snap.stops);
    expect(listSegments(db, trip.id)).toEqual(snap.segments);
    expect(snapshotTrip(db, 'nope')).toBeNull();
  });

  it('Undo of a hand edit brings back the recorded values and drops Edited', () => {
    const db = makeTestDb();
    const trip = seedTrip(db);
    editGpsTrip(db, trip.id, { miles: 9 });
    expect(getTrip(db, trip.id)?.edited).toBe(true);
    revertTripRow(db, trip);
    expect(getTrip(db, trip.id)).toEqual(trip);
  });
});
