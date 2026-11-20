// B-143 (Phương 20/11): the drive check and walking after a drive, against what A13 really logged on 19–20/11
// (diag 2026-11-20-01-43 + backup 0850). Times are Hanoi (UTC+7).
import { makeTestDb } from '@/db/testing/testDb';
import { appendPoints, getTrip, lastMoveAt, startTrip } from '@/db/tripsRepo';
import { haversine, isStationaryFix } from '@/domain/mileage';

import {
  type Activity,
  type EngineConfig,
  type EngineSignal,
  type EngineState,
  type EngineTrip,
  INITIAL_ENGINE_STATE,
  recordingFilter,
  step,
  tripLastMove,
} from '../auto/engine';
import {
  extendProbe,
  findDrive,
  PROBE_COOLDOWN_MS,
  PROBE_EXTEND_MAX_MS,
  PROBE_WINDOW_MS,
  type ProbeFix,
  shouldStartProbe,
} from '../auto/probeLogic';
import { gpsModeFor } from '../gpsPower';

const S = 1000;
const MIN = 60_000;
const cfg: EngineConfig = { enabled: true, vanAddress: null, startOnCharge: false, mergeStopMinutes: 10 };
const act = (activity: Activity, transition: 'enter' | 'exit', at: number): EngineSignal => ({
  kind: 'activity',
  activity,
  transition,
  at: at + 3 * S,
  eventAt: at,
});
const fixes = (rows: number[][]): ProbeFix[] => rows.map(([ts, lat, lng, accuracy]) => ({ ts, lat, lng, accuracy }));
/** Recorded fixes with the speed the OS would report (from the previous fix). */
const withSpeed = (pts: ProbeFix[]) =>
  pts.map((p, i) => ({ ...p, speed: i === 0 ? null : haversine(pts[i - 1], p) / ((p.ts - pts[i - 1].ts) / 1000) }));

describe('B-143 (a): walking 07:10–07:21 on 20/11, phone in a bag, never starts a Trip', () => {
  // The fixes A13 recorded for the wrong 659 m Trip (4–6 km/h all along); still exit / walking enter 07:10:25.
  const walk = fixes([
    [1795133505648, 21.0085679, 105.8468431, 12.8],
    [1795133880608, 21.0079437, 105.8423136, 12.5],
    [1795133937699, 21.0080499, 105.8417834, 2],
    [1795133949635, 21.0081474, 105.841664, 2],
    [1795133961662, 21.0082481, 105.8415547, 2.4],
    [1795133973655, 21.0083811, 105.8415143, 2],
    [1795133982713, 21.0085146, 105.8414776, 2],
    [1795133994667, 21.0086572, 105.8414879, 2],
    [1795134006645, 21.0087998, 105.8415086, 2],
    [1795134018655, 21.0089452, 105.8414891, 2],
    [1795134030655, 21.0090887, 105.8414654, 2.1],
    [1795134040653, 21.0092283, 105.8414731, 2.3],
  ]);

  it('the walk got more than 500 m away (the old rule started a Trip: sensor "not on foot", 0 steps)', () => {
    expect(haversine(walk[0], walk[walk.length - 1])).toBeGreaterThan(500);
  });

  it('sensor walking (as A13 said 07:10:25–07:21:28) → no drive at any fix', () => {
    for (let n = 2; n <= walk.length; n++) expect(findDrive(walk.slice(0, n), { onFoot: true, cycling: false, stepsPerMin: 0 })).toBe(-1);
  });

  it('even if the sensor missed it and the step counter says 0 — a walking pace is no drive', () => {
    for (let n = 2; n <= walk.length; n++) expect(findDrive(walk.slice(0, n), { onFoot: false, cycling: false, stepsPerMin: 0 })).toBe(-1);
  });
});

describe('B-143: an enter dated 1 ms before its exit (A13: 6 of 44 pairs, 18–20/11) still counts', () => {
  const raw = (activity: Activity, transition: 'enter' | 'exit', at: number, eventAt: number): EngineSignal => ({ kind: 'activity', activity, transition, at, eventAt });

  it('20/11 07:10:25 still exit .082 / walking enter .081 → walking (probe_drive said onFoot: false)', () => {
    const r = step(
      { ...INITIAL_ENGINE_STATE, seenUntil: 1795133000000, activity: 'still', activityAt: 1795130000000 },
      [raw('still', 'exit', 1795133503042, 1795133425082), raw('walking', 'enter', 1795133503232, 1795133425081)],
      cfg,
      null,
      1795133503917,
      false,
    );
    expect(r.state.activity).toBe('walking');
    expect(r.actions).toEqual([]);
  });

  it('19/11 17:46:27 walking exit .213 / still enter .212 → still (the stop that ends the cool-down)', () => {
    const r = step(
      { ...INITIAL_ENGINE_STATE, seenUntil: 1795085000000, activity: 'walking', activityAt: 1795084604507 },
      [raw('walking', 'exit', 1795085194257, 1795085187213), raw('still', 'enter', 1795085194266, 1795085187212)],
      cfg,
      null,
      1795085194300,
      false,
    );
    expect(r.state).toMatchObject({ activity: 'still', stillEnterAt: 1795085187212 });
  });

  it('19/11 07:34:00 still exit / driving enter 1 ms earlier → the Trip starts (it was missed)', () => {
    const exitAt = Date.UTC(2026, 10, 19, 0, 34, 0, 501);
    const r = step(
      { ...INITIAL_ENGINE_STATE, seenUntil: exitAt - MIN, activity: 'still', activityAt: exitAt - 60 * MIN },
      [raw('still', 'exit', exitAt + 5 * S, exitAt), raw('driving', 'enter', exitAt + 5 * S + 10, exitAt - 1)],
      cfg,
      null,
      exitAt + 6 * S,
      false,
    );
    expect(r.actions[0]).toMatchObject({ type: 'start', reason: 'motion' });
  });

  it('an older enter long before the latest change is still ignored', () => {
    const r = step(
      { ...INITIAL_ENGINE_STATE, seenUntil: 0, activity: null, activityAt: 1795133425082 },
      [raw('walking', 'enter', 1795133503232, 1795133425082 - 5 * S)],
      cfg,
      null,
      1795133503917,
      false,
    );
    expect(r.state.activity).toBeNull();
  });
});

describe('B-143 (b, d): the slow drive at 17:50 on 19/11 starts a Trip', () => {
  // Still exit 17:36:44 (walk to UBND), check from 17:38:01 to 17:50:01, still enter 17:46:27 (in the van), the van
  // crawls off ~17:49:30 — A13 said still all along and logged probe_none at 17:50:50; only Bluetooth started it 17:57.
  const leftStill = 1795084604507;
  const checkFrom = 1795084681254;
  const until = checkFrom + PROBE_WINDOW_MS;
  const maxUntil = until + PROBE_EXTEND_MAX_MS;
  const stillEnter = 1795085187212;
  const t = (hh: number, mm: number, ss = 0) => Date.UTC(2026, 10, 19, hh - 7, mm, ss);
  const HOME = { lat: 21.03, lng: 105.77 };
  const north = (m: number, ts: number, accuracy = 20): ProbeFix => ({ lat: HOME.lat + m / 111_320, lng: HOME.lng, ts, accuracy });
  const track: ProbeFix[] = [];
  // 17:38:30–17:46:00 walking at 1.25 m/s (~560 m).
  for (let ts = t(17, 38, 30); ts <= t(17, 46); ts += 30 * S) track.push(north(1.25 * ((ts - t(17, 38, 30)) / S), ts));
  const stop = track[track.length - 1];
  const stopM = haversine({ lat: HOME.lat, lng: HOME.lng }, stop);
  // 17:46:30–17:49:00 sitting in the van: GPS wanders ±20 m.
  for (let ts = t(17, 46, 30), i = 0; ts <= t(17, 49); ts += 30 * S, i++) track.push(north(stopM + (i % 2 ? 20 : -15), ts, 40));
  // From 17:49:30 the van crawls at 3.5 m/s (12.6 km/h).
  const vanFrom = t(17, 49);
  for (let ts = t(17, 49, 30); ts <= t(17, 53); ts += 30 * S) track.push(north(stopM + 3.5 * ((ts - vanFrom) / S), ts));
  const upTo = (ts: number) => track.filter((f) => f.ts <= ts);
  const ctx = { onFoot: false, cycling: false, stepsPerMin: null };

  it('those 12 minutes alone see no drive (walk, then a stop, then the van just rolling)', () => {
    expect(findDrive(upTo(until), ctx)).toBe(-1);
  });

  it('(d) at 17:50:50 the check still moves → it goes on (2 min at a time) instead of probe_none', () => {
    const now = t(17, 50, 50);
    expect(extendProbe({ now, until, maxUntil, fixes: upTo(now), onFoot: false })).toBe(now + 2 * MIN);
  });

  it('(d) …and finds the drive — counted from where the van set off, not from the walk', () => {
    const fx = upTo(t(17, 52, 30));
    const from = findDrive(fx, ctx);
    expect(from).toBeGreaterThanOrEqual(0);
    expect(fx[from].ts).toBeGreaterThan(stillEnter);
    expect(fx[from].ts).toBeLessThan(t(17, 50));
    expect(leftStill).toBeLessThan(fx[from].ts);
  });

  it('(d) no going on: standing still (wander only), walking, no recent fix, or 12 minutes past the end', () => {
    const now = t(17, 50, 50);
    const parked = upTo(t(17, 49));
    expect(extendProbe({ now: t(17, 49, 30) + 1, until: t(17, 49, 30), maxUntil, fixes: parked, onFoot: false })).toBeNull();
    expect(extendProbe({ now, until, maxUntil, fixes: upTo(now), onFoot: true })).toBeNull();
    expect(extendProbe({ now: now + 5 * MIN, until, maxUntil, fixes: upTo(now), onFoot: false })).toBeNull();
    expect(extendProbe({ now: maxUntil + 1, until: maxUntil, maxUntil, fixes: upTo(t(17, 53)), onFoot: false })).toBeNull();
    // Not before the end, and never past maxUntil.
    expect(extendProbe({ now: until - 1, until, maxUntil, fixes: upTo(now), onFoot: false })).toBeNull();
    expect(extendProbe({ now: maxUntil - 30 * S, until: maxUntil - 31 * S, maxUntil, fixes: upTo(t(17, 53)), onFoot: false })).toBeNull();
  });

  it('(b) after a check found nothing: a stop ("still" enter) then moving again checks at once', () => {
    const ended = t(17, 50, 50);
    const base = { enabled: true, tripActive: false, probing: false, probeAfter: ended + PROBE_COOLDOWN_MS, lastCheckSince: leftStill };
    // Still exit at 17:52 after the still enter at 17:46:27 (in the van): a new movement.
    expect(shouldStartProbe({ ...base, now: t(17, 52, 30), movedAt: t(17, 52), stillEnterAt: stillEnter })).toBe(true);
    // The same movement (no stop since that check began): the cool-down holds.
    expect(shouldStartProbe({ ...base, now: t(17, 52, 30), movedAt: t(17, 52), stillEnterAt: leftStill - 10 * MIN })).toBe(false);
    // The cool-down over: as before.
    expect(shouldStartProbe({ ...base, now: ended + PROBE_COOLDOWN_MS, movedAt: ended + PROBE_COOLDOWN_MS - MIN, stillEnterAt: 0 })).toBe(true);
  });

  it('the Trip the check started records the crawl although the sensor still says still (it missed the drive)', () => {
    const found = t(17, 52, 30);
    const state: EngineState = { ...INITIAL_ENGINE_STATE, activity: 'still', activityAt: stillEnter };
    const f = recordingFilter({ state, permission: true, tripStartedAt: t(17, 48, 30), probeFoundAt: found });
    expect(f.sensorStill).toBe(false);
    // A 'still' entered after that is the van parked again: trusted.
    const parked = { ...state, activityAt: found + 5 * MIN };
    expect(recordingFilter({ state: parked, permission: true, tripStartedAt: t(17, 48, 30), probeFoundAt: found }).sensorStill).toBe(true);
    // Any other Trip: as before.
    expect(recordingFilter({ state, permission: true, tripStartedAt: t(17, 48, 30), probeFoundAt: null }).sensorStill).toBe(true);
  });
});

describe('B-143 (c): walking up home after parking at 08:26 on 20/11 is not counted', () => {
  // Driving enter 08:20:12, driving exit / walking enter 08:26:10, walking exit / still enter 08:32:09.
  const tripStart = 1795135194404;
  const drivingEnter = 1795137612094;
  const drivingExit = 1795137970000;
  const stillEnter = 1795138329612;
  const drive = fixes([
    [1795137872640, 21.0395568, 105.7683054, 2],
    [1795137919694, 21.039675, 105.7680216, 2.4],
    [1795137924638, 21.0397331, 105.7677669, 2.5],
    [1795137929692, 21.0398037, 105.7674603, 2.5],
    [1795137934689, 21.0398972, 105.7671499, 2.5],
    [1795137952645, 21.0399572, 105.7672844, 1.6],
    [1795137962638, 21.0399235, 105.7674252, 1.6],
  ]);
  // 505 m at 4–6 km/h, A13 added these to the Trip (and went back to GPS every 5 s at 08:28:00).
  const walk = fixes([
    [1795137975637, 21.0399092, 105.7675773, 1.5],
    [1795137987641, 21.0399632, 105.7677141, 1.5],
    [1795138079621, 21.0415651, 105.7682347, 11.5],
    [1795138091680, 21.0410928, 105.7681904, 5.7],
    [1795138103625, 21.0412374, 105.7682124, 2.1],
    [1795138115679, 21.041366, 105.7682669, 2.1],
    [1795138128629, 21.0415066, 105.7682948, 3.3],
    [1795138176692, 21.042072, 105.7684309, 2.5],
    [1795138187639, 21.0421914, 105.7685241, 2],
    [1795138197642, 21.0423216, 105.7685717, 2.4],
    [1795138223640, 21.0425891, 105.7686236, 2.3],
    [1795138249690, 21.0426985, 105.7683444, 2.8],
    [1795138258687, 21.0427843, 105.7682153, 2.2],
    [1795138268642, 21.0429306, 105.7682385, 2.8],
    [1795138294619, 21.0428577, 105.7683287, 22.7],
  ]);
  const all = withSpeed([...drive, ...walk]);

  function engineAt(signals: EngineSignal[], now: number, trip: EngineTrip | null) {
    const driving = step({ ...INITIAL_ENGINE_STATE, seenUntil: tripStart }, [act('driving', 'enter', drivingEnter)], cfg, trip, drivingEnter + 5 * S, false).state;
    return step(driving, signals, cfg, trip, now, false);
  }

  it('the sensor says the driver walked away from the van', () => {
    const { state } = engineAt([act('driving', 'exit', drivingExit), act('walking', 'enter', drivingExit)], drivingExit + 10 * S, null);
    expect(state).toMatchObject({ activity: 'walking', vehicleExitAt: drivingExit, footAfterDrive: true });
    const f = recordingFilter({ state, permission: true, tripStartedAt: tripStart, probeFoundAt: null });
    expect(f.onFoot).toBe(true);
    // Home: walking → still keeps it (the stop began when the van parked).
    const home = step(state, [act('walking', 'exit', stillEnter), act('still', 'enter', stillEnter)], cfg, null, stillEnter + 10 * S, false).state;
    expect(home.footAfterDrive).toBe(true);
  });

  it('no metres, no "moving" from the walk: same distance, lastMoveAt and GPS mode as when the van parked', () => {
    const db = makeTestDb();
    const trip = startTrip(db, 'work', tripStart, 'auto');
    appendPoints(db, trip.id, all.slice(0, drive.length));
    const parked = getTrip(db, trip.id)!;
    const parkedMove = lastMoveAt(db, parked);
    expect(parkedMove).toBeLessThanOrEqual(drivingExit);

    const { state } = engineAt([act('driving', 'exit', drivingExit), act('walking', 'enter', drivingExit)], drivingExit + 10 * S, null);
    const filter = recordingFilter({ state, permission: true, tripStartedAt: tripStart, probeFoundAt: null });
    for (const p of all.slice(drive.length)) appendPoints(db, trip.id, [p], filter);
    const after = getTrip(db, trip.id)!;
    expect(after.distanceM).toBe(parked.distanceM);
    expect(lastMoveAt(db, after)).toBe(parkedMove);
    // A13 went back to GPS every 5 s at 08:28:00 because of the walk.
    expect(gpsModeFor({ now: 1795138080641, lastMoveAt: lastMoveAt(db, after), sensorDriving: false })).toBe('parked');

    // Before B-143 the walk added ~500 m.
    const db2 = makeTestDb();
    const old = startTrip(db2, 'work', tripStart, 'auto');
    appendPoints(db2, old.id, all);
    expect(getTrip(db2, old.id)!.distanceM - parked.distanceM).toBeGreaterThan(400);
  });

  it('the Trip ends at 08:26:10 (driving exit) after the merge threshold, not 08:29', () => {
    const signals = [act('driving', 'exit', drivingExit), act('walking', 'enter', drivingExit), act('walking', 'exit', stillEnter), act('still', 'enter', stillEnter)];
    // lastMoveAt from the van's own fixes (the walk added none): when it slowed into the spot.
    const trip: EngineTrip = { id: 't', status: 'running', startedBy: 'auto', startedAt: tripStart, lastPointAt: drive[drive.length - 1].ts, lastMoveAt: 1795137919694 };
    const before = engineAt(signals, drivingExit + 9 * MIN, trip);
    expect(before.actions.find((a) => a.type === 'end')).toBeUndefined();
    expect(tripLastMove(trip, before.state)).toBe(drivingExit);
    const r = engineAt(signals, drivingExit + 10 * MIN, trip);
    expect(r.actions).toContainEqual({ type: 'end', tripId: 't', at: drivingExit, startedBy: 'auto' });
  });
});

describe('B-143 (c): a delivery — out of the van for a few minutes, then on — stays one Trip', () => {
  const T0 = new Date(2026, 10, 20, 10, 0).getTime();
  const trip: EngineTrip = { id: 't', status: 'running', startedBy: 'auto', startedAt: T0 - 30 * MIN, lastPointAt: T0, lastMoveAt: T0 };
  const driving: EngineState = { ...INITIAL_ENGINE_STATE, seenUntil: T0 - MIN, activity: 'driving', activityAt: T0 - 30 * MIN };

  it('walking 4 min to the door and back, sitting down, driving on: no end, and the walk is not the van', () => {
    const out = step(driving, [act('driving', 'exit', T0), act('walking', 'enter', T0)], cfg, trip, T0 + MIN, false);
    expect(out.actions.find((a) => a.type === 'end')).toBeUndefined();
    expect(recordingFilter({ state: out.state, permission: true, tripStartedAt: trip.startedAt, probeFoundAt: null }).onFoot).toBe(true);
    const back = step(
      out.state,
      [act('walking', 'exit', T0 + 4 * MIN), act('still', 'enter', T0 + 4 * MIN), act('still', 'exit', T0 + 5 * MIN), act('driving', 'enter', T0 + 5 * MIN)],
      cfg,
      trip,
      T0 + 6 * MIN,
      false,
    );
    expect(back.state.footAfterDrive).toBe(false);
    expect(back.actions.find((a) => a.type === 'end')).toBeUndefined();
    // Driving again: the van's fixes count again.
    const f = recordingFilter({ state: back.state, permission: true, tripStartedAt: trip.startedAt, probeFoundAt: null });
    expect(f).toEqual({ sensorStill: false, onFoot: false, walkSpeed: false });
    // Even 12 minutes after the van stopped, driving keeps it open (it moved again).
    expect(step(back.state, [], cfg, trip, T0 + 12 * MIN, false).actions.find((a) => a.type === 'end')).toBeUndefined();
  });

  it('out of the van longer than the merge threshold → ends when the van stopped', () => {
    const out = step(driving, [act('driving', 'exit', T0 + 30 * S), act('walking', 'enter', T0 + 30 * S)], cfg, trip, T0 + MIN, false);
    const r = step(out.state, [], cfg, trip, T0 + 30 * S + 10 * MIN, false);
    expect(r.actions).toContainEqual({ type: 'end', tripId: 't', at: T0 + 30 * S, startedBy: 'auto' });
  });

  it('a crawl the sensor calls cycling still counts; a walking pace with the sensor silent after the van stopped does not', () => {
    const crawl = step(driving, [act('driving', 'exit', T0), act('cycling', 'enter', T0)], cfg, trip, T0 + MIN, false).state;
    expect(recordingFilter({ state: crawl, permission: true, tripStartedAt: trip.startedAt, probeFoundAt: null })).toEqual({
      sensorStill: false,
      onFoot: false,
      walkSpeed: false,
    });
    const silent = step(driving, [act('driving', 'exit', T0)], cfg, trip, T0 + MIN, false).state;
    const f = recordingFilter({ state: silent, permission: true, tripStartedAt: trip.startedAt, probeFoundAt: null });
    expect(f.walkSpeed).toBe(true);
    const prev = { lat: 21, lng: 105.8 };
    expect(isStationaryFix(prev, { lat: 21.0003, lng: 105.8, accuracy: 5, speed: 1.4 }, f)).toBe(true);
    expect(isStationaryFix(prev, { lat: 21.0003, lng: 105.8, accuracy: 5, speed: 6 }, f)).toBe(false);
    // Without the motion permission nothing is read from the sensor.
    expect(recordingFilter({ state: silent, permission: false, tripStartedAt: trip.startedAt, probeFoundAt: null })).toEqual({
      sensorStill: false,
      onFoot: false,
      walkSpeed: false,
    });
  });
});
