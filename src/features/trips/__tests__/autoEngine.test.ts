import { classifyTrip, inWorkHours, type WorkHoursCfg } from '../auto/classify';
import {
  type Activity,
  DRIVING_STALE_MS,
  INITIAL_ENGINE_STATE,
  step,
  type EngineConfig,
  type EngineSignal,
  type EngineTrip,
} from '../auto/engine';
import { noTripsDayKeys, noTripsDays } from '../auto/missed';
import { findStops, segmentForStop, splitMiles } from '../auto/stops';

const MIN = 60_000;
const T0 = new Date(2026, 10, 10, 8, 0).getTime(); // Tue 10 Nov 2026 08:00 local
const cfg: EngineConfig = { enabled: true, vanAddress: 'AA:BB', startOnCharge: false, mergeStopMinutes: 20 };
const act = (activity: Activity, transition: 'enter' | 'exit', at: number): EngineSignal => ({
  kind: 'activity',
  activity,
  transition,
  at,
  eventAt: at,
});
const autoTrip = (over: Partial<EngineTrip> = {}): EngineTrip => ({
  id: 't1',
  status: 'running',
  startedBy: 'auto',
  startedAt: T0,
  lastPointAt: T0,
  ...over,
});

describe('auto trip engine — start', () => {
  it('starts on driving enter, backdated to leaving still (≤ 5 min)', () => {
    const r = step(INITIAL_ENGINE_STATE, [act('still', 'exit', T0), act('driving', 'enter', T0 + 2 * MIN)], cfg, null, T0 + 3 * MIN, false);
    expect(r.actions[0]).toEqual({ type: 'start', at: T0, reason: 'motion' });
    expect(r.actions[1]).toMatchObject({ type: 'wake' });
    expect(r.state.activity).toBe('driving');
  });

  it('does not backdate further than 5 minutes', () => {
    const r = step(INITIAL_ENGINE_STATE, [act('still', 'exit', T0), act('driving', 'enter', T0 + 9 * MIN)], cfg, null, T0 + 10 * MIN, false);
    expect(r.actions[0]).toMatchObject({ type: 'start', at: T0 + 9 * MIN });
  });

  it('starts at once when the van Bluetooth connects; other devices and disconnects do nothing', () => {
    const bt = (kind: 'bt_connected' | 'bt_disconnected', address: string): EngineSignal => ({ kind, address, at: T0 });
    expect(step(INITIAL_ENGINE_STATE, [bt('bt_connected', 'aa:bb')], cfg, null, T0, false).actions[0]).toMatchObject({ type: 'start', reason: 'bluetooth' });
    expect(step(INITIAL_ENGINE_STATE, [bt('bt_connected', 'CC:DD')], cfg, null, T0, false).actions).toEqual([]);
    const running = step(INITIAL_ENGINE_STATE, [bt('bt_disconnected', 'AA:BB')], cfg, autoTrip(), T0 + MIN, false);
    expect(running.actions.some((a) => a.type === 'end')).toBe(false);
  });

  it('start when charging: leaving still while charging', () => {
    const c = { ...cfg, startOnCharge: true };
    expect(step(INITIAL_ENGINE_STATE, [act('still', 'exit', T0)], c, null, T0, true).actions[0]).toMatchObject({ type: 'start', reason: 'charging' });
    expect(step(INITIAL_ENGINE_STATE, [act('still', 'exit', T0)], c, null, T0, false).actions).toEqual([]);
    expect(step(INITIAL_ENGINE_STATE, [act('still', 'exit', T0)], cfg, null, T0, true).actions).toEqual([]);
  });

  it('never starts when disabled (free / Pro ended / switch off), walking or cycling', () => {
    expect(step(INITIAL_ENGINE_STATE, [act('driving', 'enter', T0)], { ...cfg, enabled: false }, null, T0, false).actions).toEqual([]);
    expect(step(INITIAL_ENGINE_STATE, [act('walking', 'enter', T0), act('cycling', 'enter', T0 + MIN)], cfg, null, T0 + MIN, false).actions).toEqual([]);
  });

  it('skips signals already seen', () => {
    const first = step(INITIAL_ENGINE_STATE, [act('driving', 'enter', T0)], cfg, null, T0, false);
    expect(step(first.state, [act('driving', 'enter', T0)], cfg, null, T0 + MIN, false).actions).toEqual([]);
  });

  it('a running manual trip is not replaced by an automatic one', () => {
    const r = step(INITIAL_ENGINE_STATE, [act('driving', 'enter', T0)], cfg, autoTrip({ startedBy: 'user' }), T0, false);
    expect(r.actions.some((a) => a.type === 'start')).toBe(false);
  });

  it('confident raw samples count as driving', () => {
    const s = (confidence: number): EngineSignal => ({ kind: 'sample', activity: 'driving', confidence, at: T0 });
    expect(step(INITIAL_ENGINE_STATE, [s(80)], cfg, null, T0, false).actions[0]).toMatchObject({ type: 'start' });
    expect(step(INITIAL_ENGINE_STATE, [s(40)], cfg, null, T0, false).actions).toEqual([]);
  });
});

describe('auto trip engine — shift trip and end', () => {
  const driving = step(INITIAL_ENGINE_STATE, [act('driving', 'enter', T0)], cfg, null, T0, false).state;

  it('a stop shorter than the merge threshold keeps the trip', () => {
    const s = step(driving, [act('still', 'enter', T0 + 30 * MIN)], cfg, autoTrip({ lastPointAt: T0 + 30 * MIN }), T0 + 45 * MIN, false);
    expect(s.actions).toEqual([{ type: 'wake', at: T0 + 30 * MIN + 20 * MIN + 30_000 }]);
  });

  it('ends after ≥ merge minutes not driving, end time = last move', () => {
    const s1 = step(driving, [act('walking', 'enter', T0 + 30 * MIN)], cfg, autoTrip({ lastPointAt: T0 + 30 * MIN }), T0 + 31 * MIN, false);
    const s2 = step(s1.state, [{ kind: 'wake', at: T0 + 51 * MIN }], cfg, autoTrip({ lastPointAt: T0 + 30 * MIN }), T0 + 51 * MIN, false);
    expect(s2.actions).toEqual([{ type: 'end', tripId: 't1', at: T0 + 30 * MIN, startedBy: 'auto' }]);
  });

  it('merge threshold follows the setting (10 / 45)', () => {
    const tr = autoTrip({ lastPointAt: T0 });
    const st = { ...driving, activity: 'still' as const, activityAt: T0 + MIN };
    expect(step(st, [], { ...cfg, mergeStopMinutes: 10 }, tr, T0 + 11 * MIN, false).actions[0]).toMatchObject({ type: 'end' });
    expect(step(st, [], { ...cfg, mergeStopMinutes: 45 }, tr, T0 + 30 * MIN, false).actions[0]).toMatchObject({ type: 'wake' });
  });

  it('still "driving" without GPS (tunnel) is not a stop, but says the trip is not recording', () => {
    const r = step(driving, [], cfg, autoTrip({ lastPointAt: T0 }), T0 + 25 * MIN, false);
    expect(r.actions.find((a) => a.type === 'end')).toBeUndefined();
    expect(r.actions).toContainEqual({ type: 'notifySilent', tripId: 't1', since: T0 });
    // Once only per last fix.
    expect(step(r.state, [], cfg, autoTrip({ lastPointAt: T0 }), T0 + 26 * MIN, false).actions.find((a) => a.type === 'notifySilent')).toBeUndefined();
  });

  it('a stale driving state no longer keeps the trip open', () => {
    const r = step(driving, [], cfg, autoTrip({ lastPointAt: T0 }), T0 + DRIVING_STALE_MS + MIN, false);
    expect(r.actions[0]).toMatchObject({ type: 'end', at: T0 });
  });

  it('paused (Personal stop) trips are left alone', () => {
    expect(step(driving, [], cfg, autoTrip({ status: 'paused' }), T0 + 5 * 60 * MIN, false).actions).toEqual([]);
  });

  it('a Trip the driver started also ends after the merge threshold without moving (Phương 19/11)', () => {
    const tr = autoTrip({ startedBy: 'user', lastPointAt: T0 });
    const st = { ...driving, activity: 'still' as const, activityAt: T0 + MIN };
    expect(step(st, [], cfg, tr, T0 + 10 * MIN, false).actions).toEqual([{ type: 'wake', at: T0 + cfg.mergeStopMinutes * MIN + 30_000 }]);
    expect(step(st, [], cfg, tr, T0 + 21 * MIN, false).actions).toEqual([{ type: 'end', tripId: 't1', at: T0, startedBy: 'user' }]);
  });

  it('GPS wander at home is not moving: the end counts from when it parked (lastMoveAt), not the last fix', () => {
    // Fixes keep arriving (lastPointAt T0+40) but the vehicle parked at T0+5 (lastMoveAt).
    const tr = autoTrip({ startedBy: 'auto', lastPointAt: T0 + 40 * MIN, lastMoveAt: T0 + 5 * MIN });
    const st = { ...driving, activity: 'still' as const, activityAt: T0 + 6 * MIN };
    expect(step(st, [], cfg, tr, T0 + 41 * MIN, false).actions).toEqual([{ type: 'end', tripId: 't1', at: T0 + 5 * MIN, startedBy: 'auto' }]);
  });

  it('Van Bluetooth reconnecting starts a new automatic Trip whenever none is running (Phương 19/11)', () => {
    const van = { ...cfg, vanAddress: 'AA:BB' };
    const bt = (at: number) => ({ kind: 'bt_connected' as const, address: 'aa:bb', at });
    const first = step(INITIAL_ENGINE_STATE, [bt(T0)], van, null, T0, false);
    expect(first.actions[0]).toMatchObject({ type: 'start', reason: 'bluetooth' });
    // The first trip ended (on its own, or the driver ended it): the next connection starts another one.
    const again = step({ ...first.state }, [bt(T0 + 90 * MIN)], van, null, T0 + 90 * MIN, false);
    expect(again.actions[0]).toMatchObject({ type: 'start', reason: 'bluetooth', at: T0 + 90 * MIN });
    // While a trip is running a reconnection doesn't start a second one.
    const running = step({ ...again.state }, [bt(T0 + 95 * MIN)], van, autoTrip({ lastPointAt: T0 + 95 * MIN }), T0 + 95 * MIN, false);
    expect(running.actions.some((a) => a.type === 'start')).toBe(false);
  });
});

describe('classify automatic trips', () => {
  const wh: WorkHoursCfg = { on: true, days: [1, 2, 3, 4, 5], startMin: 7 * 60, endMin: 19 * 60 };
  const base = { startedAt: T0, endedAt: T0 + 60 * MIN, routeScope: null, vanConnected: false, workHours: { ...wh, on: false } };

  it('work hours: inside, outside, weekend, overnight', () => {
    expect(inWorkHours(wh, T0)).toBe(true);
    expect(inWorkHours(wh, new Date(2026, 10, 10, 6, 59).getTime())).toBe(false);
    expect(inWorkHours(wh, new Date(2026, 10, 14, 9, 0).getTime())).toBe(false); // Sat
    const night = { on: true, days: [1], startMin: 22 * 60, endMin: 6 * 60 };
    expect(inWorkHours(night, new Date(2026, 10, 9, 23, 0).getTime())).toBe(true); // Mon 23:00
    expect(inWorkHours(night, new Date(2026, 10, 10, 5, 0).getTime())).toBe(true); // Tue 05:00 = Mon shift
    expect(inWorkHours(night, new Date(2026, 10, 10, 23, 0).getTime())).toBe(false);
  });

  it('not sure → unsorted; van Bluetooth → Work; in hours → Work; outside → Personal', () => {
    expect(classifyTrip(base)).toEqual({ scope: 'unsorted', by: null });
    expect(classifyTrip({ ...base, vanConnected: true })).toEqual({ scope: 'work', by: 'bluetooth' });
    expect(classifyTrip({ ...base, workHours: wh })).toEqual({ scope: 'work', by: 'work_hours' });
    const sat = new Date(2026, 10, 14, 9, 0).getTime();
    expect(classifyTrip({ ...base, workHours: wh, vanConnected: true, startedAt: sat })).toEqual({ scope: 'personal', by: 'work_hours' });
  });

  it('a known route (S2) wins over van Bluetooth, but not over work hours', () => {
    expect(classifyTrip({ ...base, routeScope: 'personal', vanConnected: true })).toEqual({ scope: 'personal', by: 'route' });
    const sat = new Date(2026, 10, 14, 9, 0).getTime();
    expect(classifyTrip({ ...base, routeScope: 'work', workHours: wh, startedAt: sat })).toEqual({ scope: 'personal', by: 'work_hours' });
  });
});

describe('stops and personal segments', () => {
  const p = (min: number, lat: number, segmentStart = false) => ({ ts: T0 + min * MIN, lat, lng: -0.1, accuracy: 5, segmentStart });
  const track = [p(0, 51.5), p(5, 51.51), p(6, 51.52), p(18, 51.5201), p(25, 51.53), p(26, 51.54), p(27, 51.5401)];

  it('a long gap in about the same place is a Stop; short gaps and moves are not', () => {
    const stops = findStops(track);
    expect(stops).toEqual([{ startedAt: T0 + 6 * MIN, endedAt: T0 + 18 * MIN, lat: 51.52, lng: -0.1 }]);
    expect(findStops([p(0, 51.5), p(10, 51.6)])).toEqual([]); // moved far: GPS gap, not a stop
    expect(findStops([p(0, 51.5), p(10, 51.5, true)])).toEqual([]); // resume after Personal stop
  });

  it('segment to / from a stop', () => {
    const stops = findStops(track);
    const trip = { startedAt: T0, endedAt: T0 + 27 * MIN };
    expect(segmentForStop(stops, 0, 'to', trip)).toEqual({ fromTs: T0, toTs: T0 + 6 * MIN });
    expect(segmentForStop(stops, 0, 'from', trip)).toEqual({ fromTs: T0 + 18 * MIN, toTs: T0 + 27 * MIN });
  });

  it('work / personal split', () => {
    expect(splitMiles(1000, 'work', [{ distanceM: 300, scope: 'personal' }])).toEqual({ workM: 700, personalM: 300 });
    expect(splitMiles(1000, 'personal', [{ distanceM: 300, scope: 'personal' }])).toEqual({ workM: 0, personalM: 1000 });
    expect(splitMiles(100, 'work', [{ distanceM: 300, scope: 'personal' }])).toEqual({ workM: 0, personalM: 100 });
  });
});

describe('no trips on work days', () => {
  const now = new Date(2026, 10, 13, 10, 0).getTime(); // Fri
  const at = (d: number, h = 9) => new Date(2026, 10, d, h).getTime();
  const off = { on: false, days: [], startMin: 0, endMin: 0 };

  it('2+ days with entries but no trips → day names; 1 day → nothing', () => {
    expect(noTripsDays({ now, entryTimes: [at(10), at(11), at(12)], tripTimes: [at(12)], workHours: off, dismissed: [] })).toEqual(['Tue', 'Wed']);
    expect(noTripsDays({ now, entryTimes: [at(10)], tripTimes: [], workHours: off, dismissed: [] })).toEqual([]);
  });

  it('today does not count; dismissed days and non-work days are skipped', () => {
    const input = { now, entryTimes: [at(8), at(10), at(11), at(13)], tripTimes: [], workHours: off, dismissed: [] as string[] };
    expect(noTripsDays(input)).toEqual(['Sun', 'Tue', 'Wed']);
    expect(noTripsDays({ ...input, dismissed: noTripsDayKeys(input) })).toEqual([]);
    expect(noTripsDays({ ...input, workHours: { on: true, days: [1, 2, 3, 4, 5], startMin: 0, endMin: 1439 } })).toEqual(['Tue', 'Wed']);
  });
});
