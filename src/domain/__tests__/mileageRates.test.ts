import {
  DEFAULT_RATES,
  flattenPeriods,
  formatDistanceNumber,
  formatRate,
  LEGACY_UK_RATES,
  mileageEstimate,
  mileageEstimateByDate,
  parseLocalDate,
  periodsIn,
  ratePeriods,
  ratesOn,
  toLocalDate,
  validatePeriods,
  type RateTier,
} from '../mileage';
import { taxYearFor } from '../taxYear';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('local dates', () => {
  it('parses real dates only', () => {
    expect(parseLocalDate('2026-07-01')).toBe(new Date(2026, 6, 1).getTime());
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-7-1')).toBeNull();
    expect(toLocalDate(new Date(2026, 6, 1, 23, 59).getTime())).toBe('2026-07-01');
  });
});

describe('rate periods', () => {
  it('groups US 2026 defaults into two periods and round-trips', () => {
    const p = ratePeriods(DEFAULT_RATES.US);
    expect(p).toEqual([
      { from: null, tiers: [{ upToMiles: null, minorPerMile: 72.5 }] },
      { from: '2026-07-01', tiers: [{ upToMiles: null, minorPerMile: 76 }] },
    ]);
    expect(flattenPeriods(p)).toEqual(DEFAULT_RATES.US);
  });

  it('picks the rate in force on the day: 72.5c to 30 Jun, 76c from 1 Jul', () => {
    expect(ratesOn(DEFAULT_RATES.US, day(2026, 6, 30))[0].minorPerMile).toBe(72.5);
    expect(ratesOn(DEFAULT_RATES.US, new Date(2026, 6, 1).getTime())[0].minorPerMile).toBe(76);
    expect(ratesOn(DEFAULT_RATES.US, day(2027, 3, 1))[0].minorPerMile).toBe(76);
    // Before the first dated period the undated one applies.
    expect(ratesOn(DEFAULT_RATES.US, day(2020, 1, 1))[0].minorPerMile).toBe(72.5);
  });

  it('uses the earliest period when none has started', () => {
    const r: RateTier[] = [{ upToMiles: null, minorPerMile: 80, from: '2030-01-01' }];
    expect(ratesOn(r, day(2026, 1, 1))[0].minorPerMile).toBe(80);
  });

  it('lists the periods overlapping a tax year', () => {
    const y2026 = taxYearFor(2026, 'US');
    expect(periodsIn(DEFAULT_RATES.US, y2026.start, y2026.end)).toHaveLength(2);
    const y2027 = taxYearFor(2027, 'US');
    expect(periodsIn(DEFAULT_RATES.US, y2027.start, y2027.end).map((p) => p.from)).toEqual(['2026-07-01']);
    const y2025 = taxYearFor(2025, 'US');
    expect(periodsIn(DEFAULT_RATES.US, y2025.start, y2025.end).map((p) => p.from)).toEqual([null]);
  });
});

describe('mileageEstimateByDate', () => {
  it('prices each trip at the rate of its day (US 2026)', () => {
    const trips = [
      { at: day(2026, 3, 10), miles: 100 },
      { at: day(2026, 8, 10), miles: 100 },
    ];
    expect(mileageEstimateByDate(trips, DEFAULT_RATES.US)).toBe(7250 + 7600);
  });

  it('matches the plain tiered estimate when there are no dates (UK)', () => {
    const trips = [
      { at: day(2026, 5, 1), miles: 6000 },
      { at: day(2026, 9, 1), miles: 2412 },
    ];
    expect(mileageEstimateByDate(trips, LEGACY_UK_RATES)).toBe(mileageEstimate(8412, LEGACY_UK_RATES));
  });

  it('UK: 45p up to 5 Apr 2026, 55p from 6 Apr 2026 (X1)', () => {
    expect(mileageEstimateByDate([{ at: day(2026, 4, 5), miles: 100 }], DEFAULT_RATES.UK)).toBe(4500);
    expect(mileageEstimateByDate([{ at: new Date(2026, 3, 6).getTime(), miles: 100 }], DEFAULT_RATES.UK)).toBe(5500);
    expect(ratesOn(DEFAULT_RATES.UK, day(2025, 6, 1)).map((t) => t.minorPerMile)).toEqual([45, 25]);
    expect(ratesOn(DEFAULT_RATES.UK, day(2026, 4, 6)).map((t) => t.minorPerMile)).toEqual([55, 25]);
  });

  it('UK 2025/26 stays at 45p / 25p over 10,000 mi (X1)', () => {
    const trips = [
      { at: day(2025, 5, 1), miles: 9800 },
      { at: day(2026, 3, 1), miles: 500 },
    ];
    expect(mileageEstimateByDate(trips, DEFAULT_RATES.UK)).toBe(10_000 * 45 + 300 * 25);
  });

  it('crosses the UK 10,000 mi threshold inside one trip, in date order', () => {
    const trips = [
      { at: day(2026, 12, 1), miles: 500 },
      { at: day(2026, 5, 1), miles: 9800 },
    ];
    // 2026/27: 10,000 × 55p + 300 × 25p
    expect(mileageEstimateByDate(trips, DEFAULT_RATES.UK)).toBe(550000 + 7500);
  });

  it('keeps the cumulative threshold across a rate change', () => {
    const rates: RateTier[] = [
      { upToMiles: 10_000, minorPerMile: 45 },
      { upToMiles: null, minorPerMile: 25 },
      { upToMiles: 10_000, minorPerMile: 50, from: '2026-10-01' },
      { upToMiles: null, minorPerMile: 30, from: '2026-10-01' },
    ];
    const trips = [
      { at: day(2026, 5, 1), miles: 9000 },
      { at: day(2026, 11, 1), miles: 2000 },
    ];
    // 9000×45 + 1000×50 + 1000×30
    expect(mileageEstimateByDate(trips, rates)).toBe(405000 + 50000 + 30000);
  });

  it('ignores zero and negative trips', () => {
    expect(mileageEstimateByDate([{ at: 0, miles: 0 }, { at: 0, miles: -5 }], DEFAULT_RATES.UK)).toBe(0);
  });
});

describe('formatting', () => {
  it('formats rates per currency', () => {
    expect(formatRate(45, 'GBP')).toBe('45p');
    expect(formatRate(25, 'GBP')).toBe('25p');
    expect(formatRate(72.5, 'USD')).toBe('$0.725');
    expect(formatRate(76, 'USD')).toBe('$0.76');
    expect(formatRate(70, 'USD')).toBe('$0.70');
  });

  it('formats distances', () => {
    expect(formatDistanceNumber(128.44)).toBe('128.4');
    expect(formatDistanceNumber(8412.3)).toBe('8,412');
    expect(formatDistanceNumber(612, 0)).toBe('612');
    expect(formatDistanceNumber(-3)).toBe('0.0');
  });
});

describe('validatePeriods', () => {
  it('accepts defaults and rejects bad input', () => {
    expect(validatePeriods(ratePeriods(DEFAULT_RATES.UK))).toBeNull();
    expect(validatePeriods(ratePeriods(DEFAULT_RATES.US))).toBeNull();
    expect(validatePeriods([{ from: null, tiers: [{ upToMiles: null, minorPerMile: 0 }] }])).toBe('rate_invalid');
    expect(validatePeriods([{ from: null, tiers: [{ upToMiles: null, minorPerMile: NaN }] }])).toBe('rate_invalid');
    expect(validatePeriods([{ from: '2026-13-01', tiers: [{ upToMiles: null, minorPerMile: 70 }] }])).toBe('date_invalid');
    expect(
      validatePeriods([
        { from: '2026-07-01', tiers: [{ upToMiles: null, minorPerMile: 70 }] },
        { from: '2026-07-01', tiers: [{ upToMiles: null, minorPerMile: 71 }] },
      ]),
    ).toBe('date_duplicate');
    expect(validatePeriods([])).toBe('rate_invalid');
  });
});
