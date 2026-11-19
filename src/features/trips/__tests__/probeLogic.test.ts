import { PROBE_START_WITHIN_MS, probeSaysDriving, shouldStartProbe } from '../auto/probeLogic';

const T = 1_800_000_000_000;
const O = { lat: 53.8, lng: -1.5, ts: T, accuracy: 30 };
// ~0.0045° latitude ≈ 500 m.
const at = (dLat: number, secs: number, accuracy = 30) => ({ lat: O.lat + dLat, lng: O.lng, ts: T + secs * 1000, accuracy });

describe('B-88 drive check', () => {
  it('a phone 600 m away in 2 min is in a vehicle', () => {
    expect(probeSaysDriving(O, at(0.0054, 120), true)).toBe(true);
  });
  it('slow traffic: 600 m in 8 min while the sensor does not say walking is a drive', () => {
    expect(probeSaysDriving(O, at(0.0054, 480), false)).toBe(true);
  });
  it('a walk: 600 m in 8 min with the sensor saying walking is not', () => {
    expect(probeSaysDriving(O, at(0.0054, 480), true)).toBe(false);
  });
  it('not far enough, or poor fixes, is not', () => {
    expect(probeSaysDriving(O, at(0.002, 60), false)).toBe(false);
    expect(probeSaysDriving(O, at(0.0054, 60, 300), false)).toBe(false);
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
