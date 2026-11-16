import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, appendPoints, endTrip, startTrip } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { haversine, metersToMiles } from '@/domain/mileage';

import { estimateGapMiles, fetchGapRoutes, findGaps, GAP_ROAD_FACTOR, gapDistance, gapsToRoute, recentGaps, type TripEnds } from '../check/gaps';
import {
  compareReadings,
  nextPeriodStart,
  odometerDue,
  odometerThreshold,
  periodStart,
  type Reading,
} from '../check/odometer';
import {
  acceptedReadingId,
  acceptReading,
  addReading,
  answerGap,
  gapRoutes,
  loggedMiles,
  missingTrips,
  readingChecks,
  saveGapRoute,
  tripEnds,
  unanswerGap,
} from '../check/repo';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const NOW = new Date(2026, 10, 16, 18, 0).getTime();
/** ~0.009° of latitude ≈ 1 km; 0.02° ≈ 1.38 mi. */
const P = (lat: number, lng = -1.5) => ({ lat, lng });

const ends = (id: string, startedAt: number, first: { lat: number; lng: number }, last: { lat: number; lng: number }): TripEnds => ({
  id,
  startedAt,
  endedAt: startedAt + 30 * MIN,
  first,
  last,
});

/** A finished GPS trip driving north from `lat0` to `lat1`. */
function gpsTrip(db: AppDb, at: number, lat0: number, lat1: number, startedBy: 'user' | 'auto' | 'nfc' = 'user') {
  const trip = startTrip(db, 'work', at, startedBy);
  const steps = 5;
  const pts = Array.from({ length: steps + 1 }, (_, i) => ({
    ts: at + i * MIN,
    lat: lat0 + ((lat1 - lat0) * i) / steps,
    lng: -1.5,
    accuracy: 5,
    speed: 15,
  }));
  appendPoints(db, trip.id, pts);
  endTrip(db, trip.id, at + steps * MIN);
  return trip.id;
}

describe('Missing trip (Q26)', () => {
  it('needs ≥ 1 mi straight line between one trip end and the next start', () => {
    const a = ends('a', NOW - 3 * DAY, P(53.8), P(53.81));
    const close = ends('b', NOW - 2 * DAY, P(53.81 + 0.013), P(53.9)); // ≈ 0.9 mi
    expect(findGaps([a, close], new Set(), NOW)).toHaveLength(0);
    const far = ends('b', NOW - 2 * DAY, P(53.81 + 0.016), P(53.9)); // ≈ 1.1 mi
    const gaps = findGaps([far, a], new Set(), NOW);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ prevId: 'a', nextId: 'b', from: a.endedAt, to: far.startedAt });
    expect(metersToMiles(gaps[0].straightM)).toBeGreaterThanOrEqual(1);
  });

  it('estimates straight line × 1.25 to 0.1 mi', () => {
    const straight = haversine(P(53.8), P(53.9)); // ≈ 6.9 mi
    expect(GAP_ROAD_FACTOR).toBe(1.25);
    expect(estimateGapMiles(straight)).toBeCloseTo(Math.round(metersToMiles(straight) * 1.25 * 10) / 10, 5);
    const g = findGaps([ends('a', NOW - DAY, P(53.7), P(53.8)), ends('b', NOW - DAY + 2 * 60 * MIN, P(53.9), P(54))], new Set(), NOW)[0];
    expect(metersToMiles(g.estimateM)).toBeCloseTo(estimateGapMiles(straight), 2);
  });

  it('skips answered gaps and trips older than 30 days; newest first', () => {
    const trips = [
      ends('old', NOW - 40 * DAY, P(53.0), P(53.1)),
      ends('a', NOW - 10 * DAY, P(53.2), P(53.3)),
      ends('b', NOW - 5 * DAY, P(53.4), P(53.5)),
      ends('c', NOW - 1 * DAY, P(53.6), P(53.7)),
    ];
    const all = findGaps(trips, new Set(), NOW);
    expect(all.map((g) => g.key)).toEqual(['b>c', 'a>b']);
    expect(findGaps(trips, new Set(['a>b']), NOW).map((g) => g.key)).toEqual(['b>c']);
    expect(recentGaps(all, NOW).map((g) => g.key)).toEqual(['b>c', 'a>b']);
    expect(recentGaps(all, NOW, 3).map((g) => g.key)).toEqual(['b>c']);
  });

  it('reads trip ends from the DB: GPS / Auto / NFC only, manual trips skipped; Not a trip sticks', () => {
    const db = makeTestDb();
    const a = gpsTrip(db, NOW - 2 * DAY, 53.8, 53.85, 'auto');
    addManualTrip(db, { date: NOW - 2 * DAY + 60 * MIN, scope: 'work', purpose: '', miles: 4 });
    const b = gpsTrip(db, NOW - 2 * DAY + 120 * MIN, 53.9, 53.95, 'nfc');
    const c = gpsTrip(db, NOW - DAY, 53.95, 54.0); // starts where b ended: no gap
    expect(tripEnds(db, NOW - 30 * DAY)).toHaveLength(3);
    const gaps = missingTrips(db, NOW);
    expect(gaps.map((g) => [g.prevId, g.nextId])).toEqual([[a, b]]);
    expect(c).toBeTruthy();

    answerGap(db, a, b, 'dismissed', NOW);
    expect(missingTrips(db, NOW)).toHaveLength(0);
    unanswerGap(db, b);
    expect(missingTrips(db, NOW)).toHaveLength(1);
    answerGap(db, a, b, 'added', NOW);
    expect(missingTrips(db, NOW)).toHaveLength(0);
  });

  it('a running trip is not compared yet', () => {
    const db = makeTestDb();
    gpsTrip(db, NOW - 3 * 60 * MIN, 53.8, 53.85);
    const running = startTrip(db, 'work', NOW - 30 * MIN);
    appendPoints(db, running.id, [{ ts: NOW - 29 * MIN, lat: 54.2, lng: -1.5, accuracy: 5, speed: 15 }]);
    expect(missingTrips(db, NOW)).toHaveLength(0);
  });

  it('keeps fetched Pro driving distances per gap (no second call)', () => {
    const db = makeTestDb();
    saveGapRoute(db, 'a>b', 10_000);
    saveGapRoute(db, 'b>c', 12_000);
    saveGapRoute(db, 'a>b', 11_000);
    expect(gapRoutes(db)).toEqual({ 'b>c': 12_000, 'a>b': 11_000 });
  });
});

const R = (value: number, readAt = 0, unit: 'mi' | 'km' = 'mi'): Reading => ({ id: String(value), readAt, value, unit });

describe('Odometer check (Q27)', () => {
  it('threshold is max(10 mi, 5 % of the odometer rise)', () => {
    expect(odometerThreshold(100)).toBe(10);
    expect(odometerThreshold(200)).toBe(10);
    expect(odometerThreshold(520)).toBeCloseTo(26);
  });

  it('first reading is a starting point; a lower reading starts again', () => {
    expect(compareReadings(null, R(48_210), 0).kind).toBe('start');
    expect(compareReadings(R(48_210), R(1_000), 0).kind).toBe('start');
  });

  it('missing / over / match', () => {
    // Odometer +520, app 406 → 114 not logged (≥ 26).
    expect(compareReadings(R(48_210), R(48_730), 406)).toEqual({ kind: 'missing', odoMiles: 520, appMiles: 406, diffMiles: 114 });
    // 25 short of 520 → under 26 → match.
    expect(compareReadings(R(48_210), R(48_730), 495).kind).toBe('match');
    // Small rise: 10 mi floor. +60 vs 49 → 11 missing; vs 51 → match.
    expect(compareReadings(R(0), R(60), 49).kind).toBe('missing');
    expect(compareReadings(R(0), R(60), 51).kind).toBe('match');
    expect(compareReadings(R(0), R(60), 75)).toMatchObject({ kind: 'over', diffMiles: 15 });
  });

  it('compares km readings in miles', () => {
    const r = compareReadings(R(10_000, 0, 'km'), R(10_160.9344, 0, 'km'), 100);
    expect(r.kind).toBe('match');
  });

  it('periods: weekly from Monday, monthly from the 1st, UK also 6 April', () => {
    const wed = new Date(2026, 10, 18, 12).getTime(); // Wed 18 Nov 2026
    expect(new Date(periodStart('weekly', 'US', wed)!)).toEqual(new Date(2026, 10, 16));
    expect(new Date(periodStart('monthly', 'US', wed)!)).toEqual(new Date(2026, 10, 1));
    expect(periodStart('off', 'UK', wed)).toBeNull();
    const apr10 = new Date(2027, 3, 10, 12).getTime();
    expect(new Date(periodStart('monthly', 'UK', apr10)!)).toEqual(new Date(2027, 3, 6));
    expect(new Date(periodStart('monthly', 'US', apr10)!)).toEqual(new Date(2027, 3, 1));
    expect(new Date(nextPeriodStart('monthly', 'UK', new Date(2027, 3, 2).getTime())!)).toEqual(new Date(2027, 3, 6));
    expect(new Date(nextPeriodStart('monthly', 'UK', apr10)!)).toEqual(new Date(2027, 4, 1));
    expect(new Date(nextPeriodStart('weekly', 'US', wed)!)).toEqual(new Date(2026, 10, 23));
    // A Monday itself: the next one is a week on.
    expect(new Date(nextPeriodStart('weekly', 'US', new Date(2026, 10, 16, 8).getTime())!)).toEqual(new Date(2026, 10, 23));
  });

  it('due when a period started with no reading since; new drivers wait for one period', () => {
    const now = new Date(2026, 10, 18, 12).getTime();
    const base = { cadence: 'monthly' as const, region: 'US' as const, now };
    expect(odometerDue({ ...base, lastReadingAt: new Date(2026, 9, 20).getTime(), firstTripAt: 0 })).toBe(true);
    expect(odometerDue({ ...base, lastReadingAt: new Date(2026, 10, 2).getTime(), firstTripAt: 0 })).toBe(false);
    expect(odometerDue({ ...base, lastReadingAt: null, firstTripAt: new Date(2026, 10, 10).getTime() })).toBe(false);
    expect(odometerDue({ ...base, lastReadingAt: null, firstTripAt: new Date(2026, 9, 10).getTime() })).toBe(true);
    expect(odometerDue({ ...base, lastReadingAt: null, firstTripAt: null })).toBe(false);
    expect(odometerDue({ ...base, cadence: 'off', lastReadingAt: null, firstTripAt: 0 })).toBe(false);
  });

  it('compares each reading with all miles logged in between (every scope and source)', () => {
    const db = makeTestDb();
    const t0 = NOW - 20 * DAY;
    addReading(db, { value: 48_210, unit: 'mi', readAt: t0 });
    addManualTrip(db, { date: t0 + DAY, scope: 'work', purpose: '', miles: 300 });
    addManualTrip(db, { date: t0 + 2 * DAY, scope: 'personal', purpose: '', miles: 100 });
    addManualTrip(db, { date: t0 + 3 * DAY, scope: 'unsorted', purpose: '', miles: 6, source: 'gap' });
    addManualTrip(db, { date: NOW + DAY, scope: 'work', purpose: '', miles: 999 }); // after the reading
    const second = addReading(db, { value: 48_730, unit: 'mi', readAt: NOW });
    expect(loggedMiles(db, t0, NOW)).toBeCloseTo(406, 1);
    const checks = readingChecks(db);
    expect(checks.map((c) => c.result.kind)).toEqual(['start', 'missing']);
    expect(checks[1].result).toMatchObject({ diffMiles: expect.closeTo(114, 1) });

    // "Add missing miles" just before the reading → matches.
    addManualTrip(db, { date: NOW - MIN, scope: 'unsorted', purpose: '', miles: 114, source: 'gap' });
    expect(readingChecks(db)[1].result.kind).toBe('match');

    acceptReading(db, second.id);
    expect(acceptedReadingId(db)).toBe(second.id);
  });
});

describe('Missing trip distance (Pro + network)', () => {
  const gaps = findGaps(
    [ends('a', NOW - 3 * DAY, P(53.7), P(53.8)), ends('b', NOW - 2 * DAY, P(53.9), P(54)), ends('c', NOW - DAY, P(54.1), P(54.2))],
    new Set(),
    NOW,
  );

  it('free users and builds without the service keep the estimate (no calls)', () => {
    expect(gapsToRoute(gaps, {}, false, true)).toEqual([]);
    expect(gapsToRoute(gaps, {}, true, false)).toEqual([]);
    expect(gapsToRoute(gaps, { [gaps[0].key]: 9000 }, true, true).map((g) => g.key)).toEqual([gaps[1].key]);
    expect(gapDistance(gaps[0], {})).toEqual({ meters: gaps[0].estimateM, routed: false });
  });

  it('Pro: the driving route replaces the estimate; offline stops, no road keeps the estimate', async () => {
    const saved: Record<string, number> = {};
    const save = (k: string, m: number) => (saved[k] = m);
    await fetchGapRoutes(gaps, async () => ({ meters: 12_345 }), save);
    expect(gapDistance(gaps[0], saved)).toEqual({ meters: 12_345, routed: true });

    const offline: Record<string, number> = {};
    let calls = 0;
    await fetchGapRoutes(
      gaps,
      async () => {
        calls++;
        throw Object.assign(new Error('offline'), { kind: 'offline' });
      },
      (k, m) => (offline[k] = m),
    );
    expect(calls).toBe(1);
    expect(offline).toEqual({});
    expect(gapDistance(gaps[0], offline).routed).toBe(false);

    const noRoad: Record<string, number> = {};
    await fetchGapRoutes(
      gaps,
      async () => {
        throw Object.assign(new Error('no route'), { kind: 'no_route' });
      },
      (k, m) => (noRoad[k] = m),
    );
    expect(Object.values(noRoad)).toEqual([-1, -1]);
    expect(gapDistance(gaps[0], noRoad)).toEqual({ meters: gaps[0].estimateM, routed: false });
    expect(gapsToRoute(gaps, noRoad, true, true)).toEqual([]);
  });
});

describe('Missing trip sanity', () => {
  it('skips gaps nobody could have driven in the time between the trips (> 100 mph straight line)', () => {
    const a = ends('a', NOW - DAY, P(53.8), P(53.81));
    // ~5,700 mi away 28 min later (mock location / GPS jump).
    const far = { ...ends('b', a.endedAt + 28 * MIN, { lat: 21.03, lng: 105.85 }, { lat: 21.04, lng: 105.85 }) };
    expect(findGaps([a, far], new Set(), NOW)).toHaveLength(0);
    // 7 mi in 30 min is fine.
    const near = ends('c', a.endedAt + 30 * MIN, P(53.91), P(53.95));
    expect(findGaps([a, near], new Set(), NOW)).toHaveLength(1);
  });
});

describe('Missing trip sanity (distance)', () => {
  it('skips straight lines over 500 mi even days apart', () => {
    const a = ends('a', NOW - 10 * DAY, P(53.8), P(53.81));
    const far = ends('b', NOW - 3 * DAY, { lat: 21.03, lng: 105.85 }, { lat: 21.04, lng: 105.85 });
    expect(findGaps([a, far], new Set(), NOW)).toHaveLength(0);
  });
});
