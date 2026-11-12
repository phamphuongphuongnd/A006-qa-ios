import { makeTestDb } from '../testing/testDb';
import {
  acknowledgeInterrupted,
  addManualTrip,
  appendPoints,
  businessTripMiles,
  getTrip,
  lastPoint,
  latestInterrupted,
  markInterrupted,
  recentPurposes,
  startTrip,
  updateManualTrip,
} from '../tripsRepo';
import type { AppDb } from '../types';

let db: AppDb;
beforeEach(() => {
  db = makeTestDb();
});

describe('interrupted trips', () => {
  it('surfaces the latest interrupted trip until acknowledged, keeping its miles', () => {
    const t = startTrip(db, 'work', 1_000);
    appendPoints(db, t.id, [
      { ts: 2_000, lat: 53.8, lng: -1.5, accuracy: 5 },
      { ts: 62_000, lat: 53.805, lng: -1.5, accuracy: 5 },
    ]);
    markInterrupted(db, t.id);
    const it = latestInterrupted(db);
    expect(it?.id).toBe(t.id);
    expect(it?.endedAt).toBe(62_000);
    acknowledgeInterrupted(db, t.id);
    expect(latestInterrupted(db)).toBeUndefined();
    const after = getTrip(db, t.id)!;
    expect(after.status).toBe('done');
    expect(after.distanceM).toBeGreaterThan(500);
    expect(lastPoint(db, t.id)?.ts).toBe(62_000);
  });

  it('acknowledge does nothing to a running trip', () => {
    const t = startTrip(db);
    acknowledgeInterrupted(db, t.id);
    expect(getTrip(db, t.id)?.status).toBe('running');
  });
});

describe('purposes and manual edits', () => {
  it('lists distinct recent purposes, newest first', () => {
    addManualTrip(db, { date: 1, scope: 'work', purpose: 'Saturday round', miles: 5 });
    addManualTrip(db, { date: 2, scope: 'work', purpose: 'DPD multi-drop LS14', miles: 5 });
    addManualTrip(db, { date: 3, scope: 'work', purpose: 'Saturday round', miles: 5 });
    addManualTrip(db, { date: 4, scope: 'work', purpose: '', miles: 5 });
    expect(recentPurposes(db)).toEqual(['Saturday round', 'DPD multi-drop LS14']);
  });

  it('updates a manual trip from odometer readings', () => {
    const t = addManualTrip(db, { date: 10, scope: 'work', purpose: 'x', miles: 10 });
    updateManualTrip(db, t.id, { date: 20, scope: 'personal', purpose: ' y ', odoStart: 48_210, odoEnd: 48_338 });
    const u = getTrip(db, t.id)!;
    expect(u.startedAt).toBe(20);
    expect(u.scope).toBe('personal');
    expect(u.purpose).toBe('y');
    expect(u.odoStart).toBe(48_210);
    expect(Math.round(u.distanceM / 1609.344)).toBe(128);
    expect(() => updateManualTrip(db, t.id, { date: 20, scope: 'work', purpose: '', miles: 0 })).toThrow();
  });

  it('returns business trip miles for the estimate', () => {
    addManualTrip(db, { date: 100, scope: 'work', purpose: '', miles: 10 });
    addManualTrip(db, { date: 200, scope: 'personal', purpose: '', miles: 7 });
    const r = businessTripMiles(db, { start: 0, end: 1_000 });
    expect(r).toHaveLength(1);
    expect(r[0].at).toBe(100);
    expect(r[0].miles).toBeCloseTo(10, 2);
  });
});
