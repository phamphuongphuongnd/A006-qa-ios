import { makeTestDb } from '../testing/testDb';
import { appendPoints, endTrip, lastMoveAt, reopenTrip, resumeTrip, pauseTrip, getTrip, startTrip } from '../tripsRepo';
import type { AppDb } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 10, 19, 10, 0).getTime();
const HOME = { lat: 53.8, lng: -1.5 };
const near = (i: number) => ({ lat: HOME.lat + (i % 3) * 0.0002, lng: HOME.lng, accuracy: 10 });

let db: AppDb;
beforeEach(() => {
  db = makeTestDb();
});

describe('lastMoveAt (CONTEXT: Trip end)', () => {
  it('A13-14: after Continue trip, a fix at the same parking spot does not bring back the old stop', () => {
    const t = startTrip(db, 'work', T0);
    // Drove in, then parked at home from T0+5.
    appendPoints(db, t.id, [
      { ts: T0 + MIN, lat: HOME.lat + 0.05, lng: HOME.lng, accuracy: 5, speed: 15 },
      ...[5, 6, 7].map((m, i) => ({ ts: T0 + m * MIN, ...near(i), speed: 0 })),
    ]);
    expect(lastMoveAt(db, getTrip(db, t.id)!)).toBe(T0 + 5 * MIN);
    endTrip(db, t.id, T0 + 5 * MIN);
    // Continue trip at T0+30, still parked: the next fix lands near home.
    reopenTrip(db, t.id, T0 + 30 * MIN);
    appendPoints(db, t.id, [{ ts: T0 + 30 * MIN + 3_000, lat: HOME.lat + 0.0004, lng: HOME.lng, accuracy: 8, speed: 3 }]);
    expect(lastMoveAt(db, getTrip(db, t.id)!)).toBeGreaterThanOrEqual(T0 + 30 * MIN);
  });

  it('after Resume from a Personal stop, the stop counts from the resume', () => {
    const t = startTrip(db, 'work', T0);
    appendPoints(db, t.id, [...[1, 2].map((m, i) => ({ ts: T0 + m * MIN, ...near(i), speed: 0 }))]);
    pauseTrip(db, t.id);
    resumeTrip(db, t.id, T0 + 40 * MIN);
    expect(lastMoveAt(db, getTrip(db, t.id)!)).toBe(T0 + 40 * MIN);
    appendPoints(db, t.id, [{ ts: T0 + 41 * MIN, lat: HOME.lat + 0.0004, lng: HOME.lng, accuracy: 8, speed: 3 }]);
    expect(lastMoveAt(db, getTrip(db, t.id)!)).toBeGreaterThanOrEqual(T0 + 40 * MIN);
  });
});
