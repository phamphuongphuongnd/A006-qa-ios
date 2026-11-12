import { formatClock, formatDay, formatDistance, formatDuration, groupByMonth, inputToMiles, parseNumberInput } from '../format';
import { gpsQuality, sketchRoute } from '../sketch';

describe('format', () => {
  it('formats distance in miles or km', () => {
    expect(formatDistance(206_640, 'mi')).toBe('128.4 mi');
    expect(formatDistance(206_640, 'km')).toBe('206.6 km');
    expect(formatDistance(13_537_000, 'mi')).toBe('8,412 mi');
    expect(formatDistance(984_920, 'mi', 0)).toBe('612 mi');
  });
  it('formats duration', () => {
    expect(formatDuration((2 * 60 + 14) * 60_000 + 59_000)).toBe('2h 14m');
    expect(formatDuration(14 * 60_000)).toBe('14m');
    expect(formatDuration(-5)).toBe('0m');
  });
  it('formats day and clock', () => {
    const at = new Date(2026, 10, 10, 14, 5).getTime();
    expect(formatDay(at)).toBe('Tue 10 Nov');
    expect(formatClock(at)).toBe('14:05');
  });
  it('parses typed numbers', () => {
    expect(parseNumberInput('48,210')).toBe(48210);
    expect(parseNumberInput(' 12.5 ')).toBe(12.5);
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('-3')).toBeNull();
    expect(parseNumberInput('1.2.3')).toBeNull();
  });
  it('converts km input to miles', () => {
    expect(inputToMiles(160.9344, 'km')).toBeCloseTo(100, 6);
    expect(inputToMiles(10, 'mi')).toBe(10);
  });
  it('groups by month keeping order', () => {
    const g = groupByMonth(
      [new Date(2026, 10, 10).getTime(), new Date(2026, 10, 1).getTime(), new Date(2026, 9, 30).getTime()],
      (x) => x,
    );
    expect(g.map((m) => [m.label, m.items.length])).toEqual([
      ['November 2026', 2],
      ['October 2026', 1],
    ]);
  });
});

describe('sketchRoute', () => {
  const p = (lat: number, lng: number, extra: object = {}) => ({ lat, lng, accuracy: 5, ...extra });

  it('returns nothing without good points', () => {
    expect(sketchRoute([p(1, 1, { accuracy: 200 })], 300, 200).segments).toEqual([]);
  });

  it('fits the route inside the box with padding', () => {
    const s = sketchRoute([p(53.8, -1.6), p(53.85, -1.55), p(53.9, -1.5)], 350, 290, 28);
    expect(s.segments).toHaveLength(1);
    const nums = s.segments[0].match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThanOrEqual(28 - 0.1);
      expect(nums[i]).toBeLessThanOrEqual(350 - 28 + 0.1);
      expect(nums[i + 1]).toBeGreaterThanOrEqual(28 - 0.1);
      expect(nums[i + 1]).toBeLessThanOrEqual(290 - 28 + 0.1);
    }
    // North is up: the last (northernmost) point is above the first.
    expect(s.end!.y).toBeLessThan(s.start!.y);
  });

  it('splits at personal stops and links the gap', () => {
    const s = sketchRoute([p(0, 0), p(0, 0.01), p(0, 0.02, { segmentStart: true }), p(0, 0.03)], 300, 200);
    expect(s.segments).toHaveLength(2);
    expect(s.gaps).toHaveLength(1);
  });

  it('centres a single point', () => {
    const s = sketchRoute([p(10, 10)], 300, 200);
    expect(s.start).toEqual({ x: 150, y: 100 });
  });

  it('thins very long tracks', () => {
    const pts = Array.from({ length: 5000 }, (_, i) => p(i * 0.0001, 0));
    const s = sketchRoute(pts, 300, 200);
    expect(s.segments[0].split('L').length).toBeLessThan(700);
  });
});

describe('gpsQuality', () => {
  it('rates the last fix', () => {
    expect(gpsQuality(undefined, 0)).toBe('searching');
    expect(gpsQuality({ ts: 1000, accuracy: 8 }, 5000)).toBe('good');
    expect(gpsQuality({ ts: 1000, accuracy: 40 }, 5000)).toBe('weak');
    expect(gpsQuality({ ts: 0, accuracy: 8 }, 120_000)).toBe('weak');
  });
});
