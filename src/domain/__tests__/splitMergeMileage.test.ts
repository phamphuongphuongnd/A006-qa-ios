import { countedPath, DEFAULT_RATES, isStationaryFix, mileageEstimate, odometerMiles, trackDistance, type GpsPoint } from '../mileage';
import { checkSplit, defaultSplit, planMerge, type MergeSource } from '../splitMerge';

describe('split', () => {
  it('splits evenly with remainder on the first part', () => {
    expect(defaultSplit(6000)).toEqual([3000, 3000]);
    expect(defaultSplit(1001, 3)).toEqual([335, 333, 333]);
    expect(defaultSplit(100, 50)).toHaveLength(10);
  });
  it('validates sum, positivity and part count', () => {
    expect(checkSplit(6000, [4500, 1500])).toEqual({ remaining: 0, valid: true });
    expect(checkSplit(6000, [4500, 1000])).toEqual({ remaining: 500, valid: false });
    expect(checkSplit(6000, [4500, 2000]).remaining).toBe(-500);
    expect(checkSplit(6000, [6000, 0]).valid).toBe(false);
    expect(checkSplit(6000, [6000]).valid).toBe(false);
  });
});

describe('merge', () => {
  const e = (p: Partial<MergeSource>): MergeSource => ({
    type: 'expense', amountMinor: 100, occurredAt: 0, note: '', categoryId: null, scope: 'work', ...p,
  });
  it('sums, keeps earliest date, joins unique notes', () => {
    const r = planMerge([
      e({ amountMinor: 350, occurredAt: 20, note: 'RingGo', categoryId: 'parking' }),
      e({ amountMinor: 1240, occurredAt: 10, note: 'NCP', categoryId: 'parking' }),
      e({ amountMinor: 1150, occurredAt: 30, note: 'ringgo ', categoryId: 'parking' }),
    ]);
    expect(r).toEqual({
      ok: true,
      merged: { type: 'expense', amountMinor: 2740, occurredAt: 10, note: 'NCP · RingGo', categoryId: 'parking', scope: 'work' },
    });
  });
  it('drops category and scope when they disagree', () => {
    const r = planMerge([e({ categoryId: 'fuel', scope: 'personal' }), e({ categoryId: 'parking', scope: 'personal' })]);
    expect(r.ok && r.merged.categoryId).toBeNull();
    expect(r.ok && r.merged.scope).toBe('personal');
    const r2 = planMerge([e({ scope: 'personal' }), e({ scope: 'work' })]);
    expect(r2.ok && r2.merged.scope).toBe('work');
  });
  it('refuses mixed types or fewer than 2', () => {
    expect(planMerge([e({})])).toEqual({ ok: false, reason: 'too_few' });
    expect(planMerge([e({}), e({ type: 'income' })])).toEqual({ ok: false, reason: 'mixed_types' });
  });
});

describe('mileage estimate', () => {
  it('UK tiers: 45p first 10,000 then 25p', () => {
    expect(mileageEstimate(8412, DEFAULT_RATES.UK)).toBe(378540);
    expect(mileageEstimate(10000, DEFAULT_RATES.UK)).toBe(450000);
    expect(mileageEstimate(12000, DEFAULT_RATES.UK)).toBe(500000);
    expect(mileageEstimate(0, DEFAULT_RATES.UK)).toBe(0);
  });
  it('US flat rate', () => {
    expect(mileageEstimate(8412, [{ upToMiles: null, minorPerMile: 70 }])).toBe(588840);
  });
  it('odometer', () => {
    expect(odometerMiles(41200, 41328)).toEqual({ ok: true, miles: 128 });
    expect(odometerMiles(41328, 41200)).toEqual({ ok: false, reason: 'end_before_start' });
    expect(odometerMiles(NaN, 3)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('trackDistance', () => {
  // ~111 m per 0.001° latitude
  const p = (i: number, extra: Partial<GpsPoint> = {}): GpsPoint => ({ ts: i * 10_000, lat: 53.8 + i * 0.001, lng: -1.55, accuracy: 10, ...extra });

  it('sums straight segments', () => {
    const d = trackDistance([p(0), p(1), p(2), p(3)]);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(336);
  });
  it('skips inaccurate fixes and teleport glitches', () => {
    const base = trackDistance([p(0), p(1), p(2)]);
    expect(trackDistance([p(0), p(1), { ...p(1.5), accuracy: 200 }, p(2)])).toBeCloseTo(base, 0);
    expect(trackDistance([p(0), p(1), { ...p(1.5), lat: 54.9 }, p(2)])).toBeCloseTo(base, 0);
  });
  it('does not count the gap across a personal stop', () => {
    const d = trackDistance([p(0), p(1), p(5, { segmentStart: true }), p(6)]);
    expect(d).toBeGreaterThan(220);
    expect(d).toBeLessThan(224);
  });

  // Deterministic "random" in [-1, 1).
  const noise = (i: number) => ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1) * 2 - 1;
  const M_PER_DEG_LAT = 111_320;
  const M_PER_DEG_LNG = 111_320 * Math.cos((53.8 * Math.PI) / 180);

  it('adds nothing for fixes wandering within their accuracy around one spot', () => {
    const pts: GpsPoint[] = Array.from({ length: 40 }, (_, i) => ({
      ts: i * 5_000,
      lat: 53.8 + (noise(i) * 12) / M_PER_DEG_LAT,
      lng: -1.55 + (noise(i + 100) * 12) / M_PER_DEG_LNG,
      accuracy: 20,
    }));
    expect(trackDistance(pts)).toBe(0);
    expect(countedPath(pts)).toHaveLength(1); // the sketch draws one dot, not a zigzag
  });
  it('flags slow fixes near the last point as stationary noise', () => {
    const at = { lat: 53.8, lng: -1.55 };
    const near = { lat: 53.8 + 40 / M_PER_DEG_LAT, lng: -1.55 };
    const far = { lat: 53.8 + 200 / M_PER_DEG_LAT, lng: -1.55 };
    expect(isStationaryFix(at, { ...near, speed: 0.3 })).toBe(true);
    expect(isStationaryFix(at, { ...near, speed: 5 })).toBe(false); // moving
    expect(isStationaryFix(at, { ...near, speed: null })).toBe(false); // unknown speed
    expect(isStationaryFix(at, { ...near, speed: -1 })).toBe(false);
    expect(isStationaryFix(at, { ...far, speed: 0 })).toBe(false); // phone that always reports 0
    expect(isStationaryFix(null, { ...near, speed: 0 })).toBe(false); // first fix of the trip
  });
  it('keeps the distance of a slow drive (≈ 4.5 m/s, a fix every 5 s, 20 m accuracy)', () => {
    const pts: GpsPoint[] = Array.from({ length: 121 }, (_, i) => ({
      ts: i * 5_000,
      lat: 53.8 + (i * 22.5 + noise(i) * 8) / M_PER_DEG_LAT,
      lng: -1.55 + (noise(i + 50) * 8) / M_PER_DEG_LNG,
      accuracy: 20,
    }));
    const truth = 120 * 22.5; // 2,700 m
    const d = trackDistance(pts);
    expect(d).toBeGreaterThan(truth * 0.95);
    expect(d).toBeLessThan(truth * 1.05);
  });
});
