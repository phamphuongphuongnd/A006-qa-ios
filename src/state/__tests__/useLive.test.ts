import { markTablesChanged, stampOf, subscribe } from '../useLive';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

describe('live query store', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('notifies only subscribers of the tables that changed', () => {
    const onEntries = jest.fn();
    const onTrips = jest.fn();
    const off1 = subscribe(['entries', 'receipts'], onEntries);
    const off2 = subscribe(['trips'], onTrips);

    markTablesChanged(['trip_points']);
    jest.runAllTimers();
    expect(onEntries).not.toHaveBeenCalled();
    expect(onTrips).not.toHaveBeenCalled();

    markTablesChanged(['receipts']);
    jest.runAllTimers();
    expect(onEntries).toHaveBeenCalledTimes(1);
    expect(onTrips).not.toHaveBeenCalled();
    off1();
    off2();
  });

  it('coalesces a burst of row writes into one notification and bumps the table version once', () => {
    const cb = jest.fn();
    const off = subscribe(['entries', 'categories'], cb);
    const before = stampOf(['entries', 'categories']);
    for (let i = 0; i < 1500; i++) markTablesChanged(['entries']);
    markTablesChanged(['categories']);
    jest.runAllTimers();
    expect(cb).toHaveBeenCalledTimes(1);
    const [e0, c0] = before.split(',').map(Number);
    expect(stampOf(['entries', 'categories'])).toBe(`${e0 + 1},${c0 + 1}`);
    off();
  });

  it('stops notifying after unsubscribe', () => {
    const cb = jest.fn();
    subscribe(['settings'], cb)();
    markTablesChanged(['settings']);
    jest.runAllTimers();
    expect(cb).not.toHaveBeenCalled();
  });
});
