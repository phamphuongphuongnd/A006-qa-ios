import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { makeTestDb } from '@/db/testing/testDb';
import { addManualTrip, getTrip, routeTitle, tripRoute, updateManualTrip } from '@/db/tripsRepo';
import { replaceAllData, snapshotTables } from '@/features/backup/dataStore';

import { boundsOf, linesFeatureCollection, padBounds, thin, tripLines } from '../map/geo';
import { drivingRoute, errorKind, OrsError, parsePlaces, parseRoute, reversePlace, suggestPlaces, toPlaceHit } from '../route/ors';
import { listPlaces, placeScore, rankPlaces, rememberPlace, rememberRoute } from '../route/places';
import { checkTripForm, EMPTY_ROUTE, routeMiles, type TripFormValues } from '../tripFormCheck';

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 16, 12, 0).getTime();
const DLS4 = { label: 'Amazon DLS4', lat: 53.7428, lng: -1.5937 };
const TESCO = { label: 'Tesco Leeds', lat: 53.79773, lng: -1.381549 };

/** Fake fetch answering with `status` + JSON `body`; records the calls. */
function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const venue = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-1.381549, 53.79773] },
  properties: { name: 'Tesco Express', label: 'Tesco Express, Leeds, England, United Kingdom', housenumber: '2a', street: 'Water Lane', postalcode: 'LS11 5QS', locality: 'Leeds' },
};

describe('openrouteservice client', () => {
  it('parses Pelias features into short labels + detail line, skipping bad and duplicate ones', () => {
    expect(toPlaceHit(venue)).toEqual({ label: 'Tesco Express', detail: '2a Water Lane, LS11 5QS, Leeds', lat: 53.79773, lng: -1.381549 });
    const address = { geometry: { coordinates: [-1.5, 53.8] }, properties: { housenumber: '24', street: 'George St', locality: 'Leeds' } };
    expect(toPlaceHit(address)).toEqual({ label: '24 George St', detail: 'Leeds', lat: 53.8, lng: -1.5 });
    expect(toPlaceHit({ geometry: { coordinates: [] }, properties: { name: 'x' } })).toBeNull();
    expect(parsePlaces({ features: [venue, venue, { properties: {} }] })).toHaveLength(1);
    expect(parsePlaces(null)).toEqual([]);
  });

  it('asks for suggestions only from 3 letters, in the region, near a point, with the key in a header', async () => {
    const f = fakeFetch(200, { features: [venue] });
    expect(await suggestPlaces('Te', 'UK', null, { fetchFn: f.fn, key: 'k' })).toEqual([]);
    expect(f.calls).toHaveLength(0);
    const hits = await suggestPlaces(' Tesco ', 'UK', { lat: 53.8, lng: -1.55 }, { fetchFn: f.fn, key: 'k' });
    expect(hits[0].label).toBe('Tesco Express');
    const url = new URL(f.calls[0].url);
    expect(url.pathname).toBe('/geocode/autocomplete');
    expect(url.searchParams.get('text')).toBe('Tesco');
    expect(url.searchParams.get('boundary.country')).toBe('GB');
    expect(url.searchParams.get('focus.point.lat')).toBe('53.8000');
    expect(url.searchParams.has('api_key')).toBe(false);
    expect((f.calls[0].init.headers as Record<string, string>).Authorization).toBe('k');
    await suggestPlaces('Walmart', 'US', null, { fetchFn: f.fn, key: 'k' });
    expect(new URL(f.calls[1].url).searchParams.get('boundary.country')).toBe('US');
  });

  it('keeps the phone position for "Current location"', async () => {
    const f = fakeFetch(200, { features: [venue] });
    const hit = await reversePlace({ lat: 53.8008, lng: -1.5491 }, { fetchFn: f.fn, key: 'k' });
    expect(hit).toEqual({ label: 'Tesco Express', detail: '2a Water Lane, LS11 5QS, Leeds', lat: 53.8008, lng: -1.5491 });
    expect(await reversePlace({ lat: 0, lng: 0 }, { fetchFn: fakeFetch(200, { features: [] }).fn, key: 'k' })).toBeNull();
  });

  it('reads the driving distance and line; posts lng,lat pairs', async () => {
    const body = {
      features: [{ properties: { summary: { distance: 21965, duration: 1298 } }, geometry: { type: 'LineString', coordinates: [[-1.5491, 53.8008], [-1.4, 53.7]] } }],
    };
    const f = fakeFetch(200, body);
    const r = await drivingRoute({ lat: 53.8008, lng: -1.5491 }, { lat: 53.7, lng: -1.4 }, { fetchFn: f.fn, key: 'k' });
    expect(r).toEqual({ meters: 21965, line: [[-1.5491, 53.8008], [-1.4, 53.7]] });
    expect(f.calls[0].url).toMatch(/\/v2\/directions\/driving-car\/geojson$/);
    expect(JSON.parse(f.calls[0].init.body as string).coordinates).toEqual([[-1.5491, 53.8008], [-1.4, 53.7]]);
    expect(() => parseRoute({ features: [{ properties: {} }] })).toThrow(OrsError);
  });

  it('maps failures: no key, offline, quota, no route', async () => {
    const kind = (p: Promise<unknown>) => p.then(() => 'ok', (e: OrsError) => e.kind);
    expect(await kind(suggestPlaces('Tesco', 'UK', null, { key: null, fetchFn: fakeFetch(200, {}).fn }))).toBe('no_key');
    const down = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    expect(await kind(drivingRoute(DLS4, TESCO, { key: 'k', fetchFn: down }))).toBe('offline');
    expect(await kind(drivingRoute(DLS4, TESCO, { key: 'k', fetchFn: fakeFetch(429, {}).fn }))).toBe('quota');
    expect(await kind(drivingRoute(DLS4, TESCO, { key: 'k', fetchFn: fakeFetch(404, { error: { code: 2010 } }).fn }))).toBe('no_route');
    expect(errorKind(403, null)).toBe('quota');
    expect(errorKind(400, { error: { code: 2004 } })).toBe('no_route');
    expect(errorKind(500, null)).toBe('failed');
  });
});

describe('A → B form (route mode)', () => {
  const base: TripFormValues = { mode: 'route', start: '', end: '', distance: '', date: NOW, scope: 'work', purpose: '', route: EMPTY_ROUTE };

  it('doubles a round trip and rounds to 0.1 mi', () => {
    expect(routeMiles(21965, false)).toBe(13.6);
    expect(routeMiles(21965, true)).toBe(27.3);
  });

  it('waits for both ends and the route, rejects the same place', () => {
    expect(checkTripForm(base, 'mi')).toEqual({ ok: false, error: null });
    expect(checkTripForm({ ...base, route: { ...EMPTY_ROUTE, from: DLS4, to: TESCO } }, 'mi')).toEqual({ ok: false, error: null });
    const near = { label: 'DLS4 car park', lat: DLS4.lat + 0.0005, lng: DLS4.lng };
    expect(checkTripForm({ ...base, route: { ...EMPTY_ROUTE, from: DLS4, to: near, meters: 100 } }, 'mi')).toEqual({
      ok: false,
      error: 'From and To are the same place',
    });
    const r = checkTripForm({ ...base, route: { from: DLS4, to: TESCO, roundTrip: true, meters: 21965 } }, 'mi');
    expect(r).toEqual({ ok: true, miles: 27.3, route: { from: DLS4, to: TESCO, roundTrip: true } });
  });
});

describe('frequent places', () => {
  it('ranks by uses with a boost for recent ones', () => {
    expect(placeScore({ useCount: 2, lastUsedAt: NOW - DAY }, NOW)).toBe(5);
    expect(placeScore({ useCount: 2, lastUsedAt: NOW - 20 * DAY }, NOW)).toBe(3);
    expect(placeScore({ useCount: 2, lastUsedAt: NOW - 90 * DAY }, NOW)).toBe(2);
    const rows = [
      { id: 'old-often', useCount: 6, lastUsedAt: NOW - 200 * DAY },
      { id: 'new-once', useCount: 1, lastUsedAt: NOW - DAY },
      { id: 'mid', useCount: 3, lastUsedAt: NOW - 3 * DAY },
    ];
    expect(rankPlaces(rows, NOW).map((r) => r.id)).toEqual(['mid', 'old-often', 'new-once']);
    expect(rankPlaces(rows, NOW, 1)).toHaveLength(1);
  });

  it('counts the same place again (same name or within 150 m) instead of adding it twice', () => {
    const db = makeTestDb();
    rememberRoute(db, { from: DLS4, to: TESCO }, NOW - 10 * DAY);
    rememberPlace(db, { label: 'amazon dls4', lat: 0, lng: 0 }, NOW - DAY);
    rememberPlace(db, { label: 'Tesco petrol', lat: TESCO.lat + 0.0003, lng: TESCO.lng }, NOW);
    rememberPlace(db, { label: 'Home', lat: 53.9, lng: -1.6 }, NOW);
    const list = listPlaces(db, NOW);
    expect(list.map((p) => [p.label, p.useCount])).toEqual([
      ['Tesco Leeds', 2],
      ['Amazon DLS4', 2],
      ['Home', 1],
    ]);
  });
});

describe('A → B trips in the database', () => {
  it('stores, shows, keeps and clears From / To', () => {
    const db = makeTestDb();
    const row = addManualTrip(db, { date: NOW, scope: 'work', purpose: '', miles: 27.3, route: { from: DLS4, to: TESCO, roundTrip: true } });
    const t = getTrip(db, row.id)!;
    expect(routeTitle(t)).toBe('Amazon DLS4 → Tesco Leeds');
    expect(tripRoute(t)).toEqual({ from: DLS4, to: TESCO, roundTrip: true });

    updateManualTrip(db, row.id, { date: NOW, scope: 'personal', purpose: 'x', miles: 13.6 });
    expect(tripRoute(getTrip(db, row.id)!)?.to.label).toBe('Tesco Leeds');
    updateManualTrip(db, row.id, { date: NOW, scope: 'personal', purpose: 'x', miles: 13.6, route: null });
    const cleared = getTrip(db, row.id)!;
    expect(tripRoute(cleared)).toBeNull();
    expect(cleared.roundTrip).toBe(false);
    expect(routeTitle(addManualTrip(db, { date: NOW, scope: 'work', purpose: '', miles: 3 }))).toBeNull();
  });

  it('0002 migration adds empty From / To to old trips and the places table', () => {
    const DRIZZLE = path.join(__dirname, '../../../../drizzle');
    const run = (sqlite: Database.Database, file: string) =>
      fs
        .readFileSync(path.join(DRIZZLE, file), 'utf8')
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => sqlite.exec(s));
    const sqlite = new Database(':memory:');
    run(sqlite, '0000_init.sql');
    run(sqlite, '0001_v2_automation_pro.sql');
    sqlite.prepare('INSERT INTO trips (id, source, status, started_at) VALUES (?, ?, ?, ?)').run('t1', 'manual', 'done', 1);
    const file = fs.readdirSync(DRIZZLE).find((f) => f.startsWith('0002_'))!;
    run(sqlite, file);
    expect(sqlite.prepare('SELECT from_label, to_lat, round_trip FROM trips').get()).toEqual({ from_label: null, to_lat: null, round_trip: 0 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM places').get()).toEqual({ n: 0 });
  });

  it('backup carries places; an older backup without them restores', () => {
    const src = makeTestDb();
    addManualTrip(src, { date: NOW, scope: 'work', purpose: '', miles: 13.6, route: { from: DLS4, to: TESCO, roundTrip: false } });
    rememberRoute(src, { from: DLS4, to: TESCO }, NOW);
    const tables = snapshotTables(src);
    expect(tables.places).toHaveLength(2);
    const dst = makeTestDb();
    replaceAllData(dst, tables);
    expect(snapshotTables(dst).places).toEqual(tables.places);
    expect(tripRoute(snapshotTables(dst).trips[0])?.from.label).toBe('Amazon DLS4');
    const { places: _drop, ...older } = tables;
    const dst2 = makeTestDb();
    replaceAllData(dst2, older as typeof tables);
    expect(snapshotTables(dst2).places).toEqual([]);
  });
});

describe('map geometry', () => {
  const pt = (i: number, extra: object = {}) => ({ lat: 53.7 + i * 0.01, lng: -1.5, accuracy: 5, ts: NOW + i * 60_000, ...extra });

  it('splits Work / Personal runs and dashes the paused gap; bounds include the stops', () => {
    const pts = [pt(0), pt(1), pt(2), pt(3), pt(4, { segmentStart: true }), pt(5)];
    const l = tripLines(pts, [{ fromTs: NOW + 60_000, toTs: NOW + 2 * 60_000 }], false, [{ lat: 54, lng: -1.4 }]);
    expect(l.work).toEqual([
      [[-1.5, 53.7], [-1.5, 53.71]],
      [[-1.5, 53.72], [-1.5, 53.73]],
      [[-1.5, 53.74], [-1.5, 53.75]],
    ]);
    expect(l.personal).toEqual([[[-1.5, 53.71], [-1.5, 53.72]]]);
    expect(l.gaps).toEqual([[[-1.5, 53.73], [-1.5, 53.74]]]);
    expect(l.start).toEqual([-1.5, 53.7]);
    expect(l.end).toEqual([-1.5, 53.75]);
    expect(l.bounds).toEqual([-1.5, 53.7, -1.4, 54]);
    expect(tripLines(pts, [], true).work).toEqual([]);
    const fc = linesFeatureCollection(l);
    expect(fc.features.map((f) => f.properties?.kind)).toEqual(['work', 'personal', 'gap']);
  });

  it('drops poor fixes; one point still gets a small box; thins long tracks', () => {
    expect(tripLines([{ ...pt(0), accuracy: 500 }]).bounds).toBeNull();
    const b = boundsOf([[-1.5, 53.7]])!;
    expect(b[2] - b[0]).toBeCloseTo(0.003);
    expect(padBounds([0, 0, 10, 10], 0.1)).toEqual([-1, -1, 11, 11]);
    const long = Array.from({ length: 1000 }, (_, i) => i);
    const th = thin(long, 300);
    expect(th.length).toBeLessThanOrEqual(300);
    expect(th[th.length - 1]).toBe(999);
  });
});
