// B-96: iPhone books "Still on a trip?" / "Trip isn't recording" ahead, mirroring the engine.
import { BACKSTOP_SLACK_MS, needsRebook, planBackstops, REBOOK_MIN_SHIFT_MS } from '../auto/backstopPlan';
import { INITIAL_ENGINE_STATE, SILENT_NOTIFY_MS, step, STILL_NOTIFY_MS, type EngineState, type EngineTrip } from '../auto/engine';

const MIN = 60_000;
const T0 = new Date(2026, 10, 18, 8, 0).getTime();
const manual = (over: Partial<EngineTrip> = {}): EngineTrip => ({ id: 't', status: 'running', startedBy: 'user', startedAt: T0, lastPointAt: T0 + 10 * MIN, ...over });
const driving: EngineState = { ...INITIAL_ENGINE_STATE, activity: 'driving', activityAt: T0 };
const still: EngineState = { ...INITIAL_ENGINE_STATE, activity: 'still', activityAt: T0 + 11 * MIN };

describe('iOS missed-trip backstops', () => {
  it('manual trip standing still: "Still on a trip?" just after 45 min from the last move, no "not recording"', () => {
    expect(planBackstops(manual(), still, T0 + 12 * MIN)).toEqual({ still: T0 + 10 * MIN + STILL_NOTIFY_MS + BACKSTOP_SLACK_MS, silent: null });
  });

  it('while driving: "not recording" 10 min after the last fix, "Still on a trip?" pushed 45 min ahead', () => {
    const now = T0 + 11 * MIN;
    expect(planBackstops(manual(), driving, now)).toEqual({
      still: now + STILL_NOTIFY_MS + BACKSTOP_SLACK_MS,
      silent: T0 + 10 * MIN + SILENT_NOTIFY_MS + BACKSTOP_SLACK_MS,
    });
  });

  it('never earlier than the engine would notify', () => {
    for (const [state, now] of [
      [still, T0 + 12 * MIN],
      [driving, T0 + 11 * MIN],
    ] as const) {
      const p = planBackstops(manual(), state, now);
      // At the booked time the engine itself would notify.
      if (p.still) expect(step(state, [], { enabled: true, vanAddress: null, startOnCharge: false, mergeStopMinutes: 20 }, manual(), p.still - REBOOK_MIN_SHIFT_MS, false).actions.map((a) => a.type)).toContain(
        state === still ? 'notifyStill' : 'wake',
      );
      if (p.silent) expect(step(state, [], { enabled: true, vanAddress: null, startOnCharge: false, mergeStopMinutes: 20 }, manual(), p.silent - REBOOK_MIN_SHIFT_MS, false).actions.map((a) => a.type)).toContain('notifySilent');
    }
  });

  it('automatic trips get no "Still on a trip?" (they end on their own) but do get "not recording"', () => {
    const p = planBackstops(manual({ startedBy: 'auto' }), driving, T0 + 11 * MIN);
    expect(p.still).toBeNull();
    expect(p.silent).not.toBeNull();
  });

  it('nothing for paused / no trip / already notified for this stop', () => {
    expect(planBackstops(manual({ status: 'paused' }), still, T0 + 12 * MIN)).toEqual({ still: null, silent: null });
    expect(planBackstops(null, still, T0)).toEqual({ still: null, silent: null });
    expect(planBackstops(manual(), { ...still, stillNotifiedFor: T0 + 10 * MIN }, T0 + 60 * MIN).still).toBeNull();
    expect(planBackstops(manual(), { ...driving, silentNotifiedFor: T0 + 10 * MIN }, T0 + 30 * MIN).silent).toBeNull();
  });

  it('a long-stale "driving" (lost exit) is not trusted for "not recording"', () => {
    expect(planBackstops(manual({ lastPointAt: T0 }), driving, T0 + 3 * 60 * MIN).silent).toBeNull();
  });

  it('re-books only on real changes', () => {
    expect(needsRebook(undefined, null)).toBe(true);
    expect(needsRebook(null, null)).toBe(false);
    expect(needsRebook(null, T0)).toBe(true);
    expect(needsRebook(T0, null)).toBe(true);
    expect(needsRebook(T0, T0 + 30_000)).toBe(false);
    expect(needsRebook(T0, T0 + 2 * MIN)).toBe(true);
  });
});
