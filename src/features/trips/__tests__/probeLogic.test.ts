import { PROBE_START_WITHIN_MS, probeSaysDriving, shouldStartProbe } from '../auto/probeLogic';

const T = 1_800_000_000_000;
const O = { lat: 53.8, lng: -1.5, ts: T, accuracy: 30 };
// ~0.0045° latitude ≈ 500 m.
const at = (dLat: number, secs: number, accuracy = 30) => ({ lat: O.lat + dLat, lng: O.lng, ts: T + secs * 1000, accuracy });

const car = { onFoot: false, cycling: false, stepsPerMin: 0 };

describe('B-88 drive check', () => {
  it('a phone 600 m away in 2 min is in a vehicle', () => {
    expect(probeSaysDriving(O, at(0.0054, 120), { ...car, onFoot: true })).toBe(true);
  });
  it('slow traffic: 600 m in 8 min while the sensor does not say walking is a drive', () => {
    expect(probeSaysDriving(O, at(0.0054, 480), car)).toBe(true);
  });
  it('a walk: 600 m in 8 min with the sensor saying walking is not', () => {
    expect(probeSaysDriving(O, at(0.0054, 480), { ...car, onFoot: true })).toBe(false);
  });
  it('not far enough, or poor fixes, is not', () => {
    expect(probeSaysDriving(O, at(0.002, 60), car)).toBe(false);
    expect(probeSaysDriving(O, at(0.0054, 60, 300), car)).toBe(false);
  });
  it('v2: walking with the phone in a bag (steps, sensor silent) is never a drive', () => {
    expect(probeSaysDriving(O, at(0.0054, 480), { ...car, stepsPerMin: 95 })).toBe(false);
    expect(probeSaysDriving(O, at(0.0054, 120), { ...car, stepsPerMin: 170 })).toBe(false);
  });
  it('v2: walked to the van, then drove (no steps any more) is a drive', () => {
    expect(probeSaysDriving(O, at(0.0054, 300), { ...car, stepsPerMin: 0 })).toBe(true);
  });
  it('v2: cycling is never a drive, however fast', () => {
    expect(probeSaysDriving(O, at(0.0054, 90), { ...car, cycling: true })).toBe(false);
  });
  it('v2: no step counter falls back to the sensor rule', () => {
    expect(probeSaysDriving(O, at(0.0054, 480), { ...car, stepsPerMin: null })).toBe(true);
  });
  it('starts only soon after leaving still, with no trip, no check running and after the cool-down', () => {
    const base = { now: T, enabled: true, tripActive: false, movedAt: T - 60_000, probeAfter: 0, probing: false };
    expect(shouldStartProbe(base)).toBe(true);
    expect(shouldStartProbe({ ...base, enabled: false })).toBe(false);
    expect(shouldStartProbe({ ...base, tripActive: true })).toBe(false);
    expect(shouldStartProbe({ ...base, probing: true })).toBe(false);
    expect(shouldStartProbe({ ...base, probeAfter: T + 1 })).toBe(false);
    expect(shouldStartProbe({ ...base, movedAt: T - PROBE_START_WITHIN_MS - 1 })).toBe(false);
    expect(shouldStartProbe({ ...base, movedAt: 0 })).toBe(false);
  });
});
