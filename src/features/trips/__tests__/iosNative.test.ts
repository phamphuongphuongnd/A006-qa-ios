// B-95: on iOS `readSignals` reads the native log with look-back and converts CoreMotion snapshots; Android untouched.
import { autoTripsSupported, readRawSignals, readSignals } from '../auto/native';
import { MOTION_LOOKBACK_MS } from '../auto/motion';

const mockGetRecentEvents = jest.fn();
let mockOS = 'ios';

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));
jest.mock('../../../../modules/trip-detect', () => ({
  TripDetect: {
    getRecentEvents: (since: number) => mockGetRecentEvents(since),
    isActivityAvailable: () => mockOS === 'android',
  },
}));

const T0 = new Date(2026, 10, 18, 8, 0).getTime();
const MIN = 60_000;
const LOG = [
  { kind: 'motion', activity: 'still', confidence: 2, eventAt: T0 - 60 * MIN, at: T0 - 60 * MIN },
  { kind: 'motion', activity: 'driving', confidence: 2, eventAt: T0, at: T0 + 5 * MIN },
];

beforeEach(() => mockGetRecentEvents.mockReset().mockReturnValue(LOG));

it('iOS: reads with look-back and returns transitions logged since', () => {
  mockOS = 'ios';
  const out = readSignals(T0);
  expect(mockGetRecentEvents).toHaveBeenCalledWith(T0 - MOTION_LOOKBACK_MS);
  expect(out).toEqual([
    { kind: 'activity', activity: 'still', transition: 'exit', confidence: 2, at: T0 + 5 * MIN, eventAt: T0 },
    { kind: 'activity', activity: 'driving', transition: 'enter', confidence: 2, at: T0 + 5 * MIN, eventAt: T0 },
  ]);
  // Diagnostics keep the raw snapshots.
  expect(readRawSignals(T0)).toBe(LOG);
});

it('iOS without a motion chip (simulator) does not offer automatic trips', () => {
  mockOS = 'ios';
  expect(autoTripsSupported()).toBe(false);
});

it('Android: the log is returned as stored', () => {
  mockOS = 'android';
  expect(readSignals(T0)).toBe(LOG);
  expect(mockGetRecentEvents).toHaveBeenCalledWith(T0);
  expect(autoTripsSupported()).toBe(true);
});
