import { gpsModeFor, PARKED_AFTER_MS } from '../gpsPower';

const NOW = 1_800_000_000_000;

describe('gpsModeFor (B-131)', () => {
  it('drives while the vehicle moved recently', () => {
    expect(gpsModeFor({ now: NOW, lastMoveAt: NOW - 30_000, sensorDriving: false })).toBe('drive');
  });
  it('goes parked after PARKED_AFTER_MS without a real move', () => {
    expect(gpsModeFor({ now: NOW, lastMoveAt: NOW - PARKED_AFTER_MS, sensorDriving: false })).toBe('parked');
  });
  it('the motion sensor saying driving (traffic jam, red light) keeps full rate', () => {
    expect(gpsModeFor({ now: NOW, lastMoveAt: NOW - 10 * PARKED_AFTER_MS, sensorDriving: true })).toBe('drive');
  });
  it('a real move while parked (lastMoveAt advanced) switches back at once', () => {
    expect(gpsModeFor({ now: NOW, lastMoveAt: NOW - 1_000, sensorDriving: false })).toBe('drive');
  });
});
