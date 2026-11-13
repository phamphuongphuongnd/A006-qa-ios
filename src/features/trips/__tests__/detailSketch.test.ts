import { sketchTripDetail, type DetailPoint } from '../auto/detailSketch';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

/** 10 good fixes heading east, one a minute. */
const track = (opts: { gapAt?: number; badAt?: number } = {}): DetailPoint[] =>
  Array.from({ length: 10 }, (_, i) => ({
    ts: T0 + i * MIN,
    lat: 51.5,
    lng: -0.1 + i * 0.01,
    accuracy: i === opts.badAt ? 500 : 5,
    segmentStart: i === opts.gapAt,
  }));

describe('trip detail sketch', () => {
  it('draws everything as work when there is no personal segment', () => {
    const s = sketchTripDetail(track(), [], [], false, 300, 200);
    expect(s.work).toHaveLength(1);
    expect(s.personal).toHaveLength(0);
    expect(s.start!.x).toBeLessThan(s.end!.x);
  });

  it('splits work / personal runs at the segment and places stops on the route', () => {
    const pts = track();
    const s = sketchTripDetail(pts, [{ lat: pts[4].lat, lng: pts[4].lng }], [{ fromTs: T0 + 4 * MIN, toTs: T0 + 7 * MIN }], false, 300, 200);
    expect(s.work).toHaveLength(2); // before and after the personal run
    expect(s.personal).toHaveLength(1);
    expect(s.personal[0].split('L')).toHaveLength(4); // 4 points: minutes 4..7
    expect(s.stops).toHaveLength(1);
    // Stop sits between start and end on the same horizontal line.
    expect(s.stops[0].x).toBeGreaterThan(s.start!.x);
    expect(s.stops[0].x).toBeLessThan(s.end!.x);
    expect(s.stops[0].y).toBeCloseTo(s.start!.y);
  });

  it('a personal trip is drawn personal; recording pauses become gaps; poor fixes are skipped', () => {
    const s = sketchTripDetail(track({ gapAt: 5, badAt: 2 }), [], [], true, 300, 200);
    expect(s.work).toHaveLength(0);
    expect(s.personal).toHaveLength(2);
    expect(s.gaps).toHaveLength(1);
    expect(s.personal[0].split('L')).toHaveLength(4); // minutes 0,1,3,4 (2 dropped)
  });

  it('is empty without usable fixes', () => {
    expect(sketchTripDetail([], [], [], false, 300, 200)).toEqual({ work: [], personal: [], gaps: [], start: null, end: null, stops: [] });
  });
});
