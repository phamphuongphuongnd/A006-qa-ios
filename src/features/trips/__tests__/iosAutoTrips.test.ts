// B-95: iOS automatic trips — CoreMotion snapshots → engine transitions, back-dated start, end, departure seed.
import type { TripSignal } from '../../../../modules/trip-detect';
import { makeTestDb } from '@/db/testing/testDb';
import { appendPoints, endTrip, getTrip, startTrip, tripPointsOf } from '@/db/tripsRepo';

import { INITIAL_ENGINE_STATE, step, type EngineConfig, type EngineSignal, type EngineState, type EngineTrip } from '../auto/engine';
import { MOTION_LOOKBACK_MS, motionToSignals, STALE_DRIVE_MS } from '../auto/motion';
import { lastParkedPoint, seedStartPoint } from '../auto/repo';

const MIN = 60_000;
const T0 = new Date(2026, 10, 18, 8, 0).getTime(); // Wed 18 Nov 2026 08:00 local
const cfg: EngineConfig = { enabled: true, vanAddress: null, startOnCharge: false, mergeStopMinutes: 20 };

type Snap = Extract<TripSignal, { kind: 'motion' }>;
const snap = (activity: Snap['activity'], eventAt: number, at: number, confidence = 2): Snap => ({ kind: 'motion', activity, confidence, eventAt, at });
type Act = Extract<TripSignal, { kind: 'activity' | 'sample' }>;
const transitions = (s: TripSignal[]) =>
  s.filter((x): x is Act => x.kind === 'activity').map((x) => `${x.transition} ${x.activity} @${(x.eventAt - T0) / MIN}`);

/** What runner.runOnce does on iOS: read the log since the last pass (plus look-back), convert, step. */
function pass(log: TripSignal[], state0: EngineState, trip: EngineTrip | null, now: number) {
  const since = state0.seenUntil || now - 60_000;
  const read = log.filter((e) => e.at >= since + 1 - MOTION_LOOKBACK_MS && e.at <= now);
  return step({ ...state0, seenUntil: since }, motionToSignals(read, since + 1) as EngineSignal[], cfg, trip, now, false);
}

describe('iOS motion snapshots → transitions', () => {
  it('turns each change of activity into exit + enter at the real start time, logged time kept', () => {
    const log = [snap('still', T0 - 30 * MIN, T0 + 6 * MIN), snap('driving', T0, T0 + 6 * MIN)];
    const out = motionToSignals(log, 0);
    expect(transitions(out)).toEqual(['enter still @-30', 'exit still @0', 'enter driving @0']);
    expect(out.every((s) => s.at === T0 + 6 * MIN)).toBe(true);
  });

  it('ignores low confidence, but a low-confidence drive start right before a confident one starts the run', () => {
    const log = [
      snap('still', T0 - 30 * MIN, T0 - 20 * MIN),
      snap('driving', T0, T0 + 6 * MIN, 0),
      snap('driving', T0 + 2 * MIN, T0 + 6 * MIN, 1),
      snap('walking', T0 + 30 * MIN, T0 + 31 * MIN, 0),
    ];
    expect(transitions(motionToSignals(log, 0))).toEqual(['enter still @-30', 'exit still @0', 'enter driving @0']);
  });

  it('a low-confidence driving blip alone gives nothing', () => {
    const log = [snap('still', T0 - 30 * MIN, T0 - 20 * MIN), snap('driving', T0, T0 + 1 * MIN, 0), snap('still', T0 + 1 * MIN, T0 + 2 * MIN, 0)];
    expect(transitions(motionToSignals(log, T0 - 10 * MIN))).toEqual([]);
  });

  it('drops a drive that was over long before the phone logged it, and merges what is around it', () => {
    const wokeAt = T0 + 4 * 60 * MIN;
    const log = [
      snap('still', T0 - 60 * MIN, T0 - 50 * MIN),
      snap('driving', T0, wokeAt),
      snap('still', T0 + 30 * MIN, wokeAt),
      snap('walking', wokeAt - 2 * MIN, wokeAt),
    ];
    expect(transitions(motionToSignals(log, T0 - 10 * MIN))).toEqual(['exit still @238', 'enter walking @238']);
  });

  it('keeps a drive the phone logged while it was going on, even after it ends', () => {
    const log = [
      snap('still', T0 - 60 * MIN, T0 - 50 * MIN),
      snap('driving', T0, T0 + 3 * MIN),
      snap('still', T0 + 30 * MIN, T0 + 30 * MIN + STALE_DRIVE_MS + MIN),
    ];
    expect(transitions(motionToSignals(log, 0))).toEqual(['enter still @-60', 'exit still @0', 'enter driving @0', 'exit driving @30', 'enter still @30']);
  });

  it('only returns what was logged at or after `since`; other signals pass through', () => {
    const log: TripSignal[] = [
      snap('still', T0 - 60 * MIN, T0 - 50 * MIN),
      snap('driving', T0, T0 + 5 * MIN),
      { kind: 'wake', at: T0 + 5 * MIN, reason: 'departure' },
      { kind: 'wake', at: T0 - 50 * MIN, reason: 'location' },
    ];
    const out = motionToSignals(log, T0);
    expect(transitions(out)).toEqual(['exit still @0', 'enter driving @0']);
    expect(out.filter((s) => s.kind === 'wake')).toEqual([{ kind: 'wake', at: T0 + 5 * MIN, reason: 'departure' }]);
  });
});

describe('iOS automatic trip through the engine', () => {
  it('a significant-change wake 6 min into a drive starts the trip when driving began', () => {
    // Opened the app at 07:40 (still), then nothing until iOS woke it at 08:06 for a location change.
    const log: TripSignal[] = [snap('still', T0 - 40 * MIN, T0 - 20 * MIN)];
    let r = pass(log, INITIAL_ENGINE_STATE, null, T0 - 20 * MIN);
    expect(r.actions).toEqual([]);

    log.push({ kind: 'wake', at: T0 + 6 * MIN, reason: 'location' }, snap('driving', T0 + MIN, T0 + 6 * MIN, 0), snap('driving', T0 + 2 * MIN, T0 + 6 * MIN));
    r = pass(log, r.state, null, T0 + 6 * MIN);
    expect(r.actions[0]).toEqual({ type: 'start', at: T0 + MIN, reason: 'motion' });
    expect(r.state.activity).toBe('driving');

    // Next wake re-reads the overlapping window: no second start, nothing repeated.
    const trip: EngineTrip = { id: 't', status: 'running', startedBy: 'auto', startedAt: T0 + MIN, lastPointAt: T0 + 15 * MIN };
    log.push({ kind: 'wake', at: T0 + 16 * MIN, reason: 'location' });
    const r2 = pass(log, r.state, trip, T0 + 16 * MIN);
    expect(r2.actions.filter((a) => a.type === 'start' || a.type === 'end')).toEqual([]);
    expect(r2.state.activity).toBe('driving');
  });

  it('ends when it has stood still for the merge time (wake timer), at the last move', () => {
    const log: TripSignal[] = [snap('still', T0 - 40 * MIN, T0 - 30 * MIN), snap('driving', T0, T0 + 5 * MIN)];
    let r = pass(log, INITIAL_ENGINE_STATE, null, T0 - 30 * MIN);
    r = pass(log, r.state, null, T0 + 5 * MIN);
    expect(r.actions[0]).toMatchObject({ type: 'start', at: T0 });

    const trip: EngineTrip = { id: 't', status: 'running', startedBy: 'auto', startedAt: T0, lastPointAt: T0 + 40 * MIN };
    // Live CoreMotion update while the trip keeps the app running: stopped at 08:41.
    log.push(snap('still', T0 + 41 * MIN, T0 + 41 * MIN));
    r = pass(log, r.state, trip, T0 + 41 * MIN);
    expect(r.actions).toEqual([{ type: 'wake', at: T0 + 40 * MIN + 20 * MIN + 30_000 }]);

    log.push({ kind: 'wake', at: T0 + 61 * MIN, reason: 'timer' });
    r = pass(log, r.state, trip, T0 + 61 * MIN);
    expect(r.actions).toEqual([{ type: 'end', tripId: 't', at: T0 + 40 * MIN }]);
  });

  it('red-light stops inside a drive do not end it while CoreMotion still says driving', () => {
    const log: TripSignal[] = [snap('still', T0 - 40 * MIN, T0 - 30 * MIN), snap('driving', T0, T0 + 5 * MIN)];
    let r = pass(log, INITIAL_ENGINE_STATE, null, T0 - 30 * MIN);
    r = pass(log, r.state, null, T0 + 5 * MIN);
    // GPS lost in a tunnel for 25 min, still driving.
    const trip: EngineTrip = { id: 't', status: 'running', startedBy: 'auto', startedAt: T0, lastPointAt: T0 + 10 * MIN };
    log.push({ kind: 'wake', at: T0 + 35 * MIN, reason: 'timer' });
    r = pass(log, r.state, trip, T0 + 35 * MIN);
    expect(r.actions.some((a) => a.type === 'end')).toBe(false);
  });

  it('a drive learnt about hours later starts nothing (it shows as a missing trip instead)', () => {
    const log: TripSignal[] = [snap('still', T0 - 40 * MIN, T0 - 30 * MIN)];
    let r = pass(log, INITIAL_ENGINE_STATE, null, T0 - 30 * MIN);
    const opened = T0 + 3 * 60 * MIN;
    log.push(snap('driving', T0, opened), snap('still', T0 + 25 * MIN, opened));
    r = pass(log, r.state, null, opened);
    expect(r.actions).toEqual([]);
    expect(r.state.activity).toBe('still');
  });

  it('automatic trips off: transitions are tracked, nothing starts', () => {
    const log: TripSignal[] = [snap('still', T0 - 40 * MIN, T0 - 30 * MIN), snap('driving', T0, T0 + 5 * MIN)];
    const r = step(INITIAL_ENGINE_STATE, motionToSignals(log, 0) as EngineSignal[], { ...cfg, enabled: false }, null, T0 + 5 * MIN, false);
    expect(r.actions).toEqual([]);
    expect(r.state.activity).toBe('driving');
  });
});

describe('iOS departure seed', () => {
  it('counts the stretch from the last parking spot without moving "last moved"', () => {
    const db = makeTestDb();
    const prev = startTrip(db, 'work', T0 - 120 * MIN, 'user');
    appendPoints(db, prev.id, [
      { ts: T0 - 119 * MIN, lat: 51.4, lng: -0.1, accuracy: 5, speed: 15 },
      { ts: T0 - 100 * MIN, lat: 51.5, lng: -0.1, accuracy: 5, speed: 15 },
    ]);
    endTrip(db, prev.id, T0 - 100 * MIN);
    expect(lastParkedPoint(db)).toMatchObject({ tripId: prev.id, lat: 51.5, lng: -0.1 });

    const trip = startTrip(db, 'work', T0, 'auto');
    // GPS starts ~1.1 km north of the parking spot.
    appendPoints(db, trip.id, [
      { ts: T0 + 3 * MIN, lat: 51.51, lng: -0.1, accuracy: 5, speed: 12 },
      { ts: T0 + 4 * MIN, lat: 51.52, lng: -0.1, accuracy: 5, speed: 12 },
    ]);
    const before = getTrip(db, trip.id)!;
    expect(seedStartPoint(db, trip.id, { lat: 51.5, lng: -0.1 })).toBe(true);
    const after = getTrip(db, trip.id)!;
    expect(after.distanceM - before.distanceM).toBeGreaterThan(1000);
    expect(after.lastPointAt).toBe(before.lastPointAt);
    expect(tripPointsOf(db, trip.id)[0]).toMatchObject({ ts: T0, lat: 51.5 });
  });

  it('never seeds a trip that is not recording', () => {
    const db = makeTestDb();
    const trip = startTrip(db, 'work', T0, 'auto');
    endTrip(db, trip.id, T0 + MIN);
    expect(seedStartPoint(db, trip.id, { lat: 51.5, lng: -0.1 })).toBe(false);
  });
});
