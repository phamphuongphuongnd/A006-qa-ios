// B-149 (Phương 20/11): "Merge stops shorter than" is the driver's choice — whole minutes 3–60, quick picks 5 · 10 · 20 +
// Custom, default 10. Values saved before (10 / 20 / 45) are kept.
import { replaceAllData, snapshotTables } from '@/features/backup/dataStore';
import { INITIAL_ENGINE_STATE, step, type EngineConfig, type EngineState, type EngineTrip } from '@/features/trips/auto/engine';

import { DEFAULT_SETTINGS, getSettings, isMergeStopMinutes, parseMergeStopMinutes, saneSetting, updateSettings } from '../settingsRepo';
import { settings } from '../schema';
import { makeTestDb } from '../testing/testDb';

const stored = (raw: string) => {
  const db = makeTestDb();
  db.insert(settings).values({ key: 'mergeStopMinutes', value: raw }).run();
  return getSettings(db).mergeStopMinutes;
};

describe('B-149 merge stops setting', () => {
  it('defaults to 10 minutes', () => {
    expect(DEFAULT_SETTINGS.mergeStopMinutes).toBe(10);
    expect(getSettings(makeTestDb()).mergeStopMinutes).toBe(10);
  });

  it('accepts whole minutes 3–60 and nothing else', () => {
    for (const ok of [3, 5, 7, 10, 20, 45, 60]) expect(isMergeStopMinutes(ok)).toBe(true);
    for (const bad of [2, 61, 0, -5, 7.5, NaN, Infinity, '7', null, undefined, {}]) expect(isMergeStopMinutes(bad)).toBe(false);
    expect(saneSetting('mergeStopMinutes', 7)).toBe(7);
    expect(saneSetting('mergeStopMinutes', 61)).toBeUndefined();
  });

  it('a stored odd value falls back to the default; a stored good one is kept', () => {
    expect(stored('2')).toBe(10);
    expect(stored('61')).toBe(10);
    expect(stored('7.5')).toBe(10);
    expect(stored('"7"')).toBe(10);
    expect(stored('null')).toBe(10);
    expect(stored('7')).toBe(7);
  });

  it('values saved before B-149 (10 / 20 / 45) are kept', () => {
    expect(stored('10')).toBe(10);
    expect(stored('20')).toBe(20);
    expect(stored('45')).toBe(45);
  });

  it('a custom value saved from the screen reads back', () => {
    const db = makeTestDb();
    expect(updateSettings(db, { mergeStopMinutes: 7 }).mergeStopMinutes).toBe(7);
    expect(getSettings(db).mergeStopMinutes).toBe(7);
  });

  it('a backup file with an odd value restores the default, a good one is kept', () => {
    const restore = (raw: string) => {
      const db = makeTestDb();
      const t = snapshotTables(makeTestDb());
      t.settings = [{ key: 'mergeStopMinutes', value: raw }];
      replaceAllData(db, t, Date.now());
      return getSettings(db).mergeStopMinutes;
    };
    expect(restore('61')).toBe(10);
    expect(restore('"soon"')).toBe(10);
    expect(restore('45')).toBe(45);
    expect(restore('7')).toBe(7);
  });

  it('Custom field: whole minutes only', () => {
    expect(parseMergeStopMinutes('7')).toBe(7);
    expect(parseMergeStopMinutes(' 15 ')).toBe(15);
    expect(parseMergeStopMinutes('03')).toBe(3);
    expect(parseMergeStopMinutes('60')).toBe(60);
    for (const bad of ['', ' ', '2', '61', '7.5', '7,5', '-5', 'abc', '1e1', '100']) expect(parseMergeStopMinutes(bad)).toBeNull();
  });
});

describe('B-149 engine with a 5-minute merge threshold', () => {
  const MIN = 60_000;
  const T0 = new Date(2026, 10, 20, 8, 0).getTime();
  const cfg: EngineConfig = { enabled: true, vanAddress: null, mergeStopMinutes: 5 };
  const trip: EngineTrip = { id: 't1', status: 'running', startedBy: 'auto', startedAt: T0 - 30 * MIN, lastPointAt: T0 };
  const still: EngineState = { ...INITIAL_ENGINE_STATE, activity: 'still', activityAt: T0 + MIN };

  it('a 4-minute stop stays in the shift trip and wakes just after 5 minutes', () => {
    expect(step(still, [], cfg, trip, T0 + 4 * MIN).actions).toEqual([{ type: 'wake', at: T0 + 5 * MIN + 30_000 }]);
  });

  it('a 5-minute stop ends the trip at when the van stopped', () => {
    expect(step(still, [], cfg, trip, T0 + 5 * MIN).actions).toEqual([{ type: 'end', tripId: 't1', at: T0, startedBy: 'auto' }]);
  });

  it('the same 5-minute stop with the default 10 stays in one trip', () => {
    expect(step(still, [], { ...cfg, mergeStopMinutes: DEFAULT_SETTINGS.mergeStopMinutes }, trip, T0 + 5 * MIN).actions[0]).toMatchObject({ type: 'wake' });
  });
});
