import { scheduleSortReminders } from '../notifications';

// TC-330: the Sunday reminder keeps coming after 4 weeks — each sync (app start, nightly task) replaces the
// 4 mockScheduled weeks with the next 4 from "now", so the window moves on instead of running out.
const mockScheduled = new Map<string, number>();
jest.mock('expo-notifications', () => ({
  AndroidImportance: {},
  IosAuthorizationStatus: {},
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: async () => ({ granted: true }),
  setNotificationChannelAsync: async () => null,
  cancelScheduledNotificationAsync: async (id: string) => {
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (r: { identifier: string; trigger: { date: number } }) => {
    mockScheduled.set(r.identifier, r.trigger.date);
    return r.identifier;
  },
}));

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const sunday18 = { on: true, weekday: 0, hour: 18, minute: 0 };
const days = () => [...mockScheduled.values()].sort((a, b) => a - b).map((ms) => new Date(ms).toDateString());

describe('Sunday reminder window (TC-330)', () => {
  beforeEach(() => mockScheduled.clear());

  it('schedules the next 4 Sundays at 18:00', async () => {
    await scheduleSortReminders(sunday18, 5, at(2026, 11, 16)); // Monday
    expect(days()).toEqual(['Sun Nov 22 2026', 'Sun Nov 29 2026', 'Sun Dec 06 2026', 'Sun Dec 13 2026']);
    expect(new Date([...mockScheduled.values()][0]).getHours()).toBe(18);
  });

  it('moves the window on at the next sync, so it never stops after 4 weeks', async () => {
    await scheduleSortReminders(sunday18, 5, at(2026, 11, 16));
    await scheduleSortReminders(sunday18, 5, at(2026, 12, 14)); // 4 weeks later
    expect(mockScheduled.size).toBe(4);
    expect(days()).toEqual(['Sun Dec 20 2026', 'Sun Dec 27 2026', 'Sun Jan 03 2027', 'Sun Jan 10 2027']);
  });

  it('nothing to sort or reminder off → nothing mockScheduled', async () => {
    await scheduleSortReminders(sunday18, 0, at(2026, 11, 16));
    expect(mockScheduled.size).toBe(0);
    await scheduleSortReminders({ ...sunday18, on: false }, 5, at(2026, 11, 16));
    expect(mockScheduled.size).toBe(0);
  });
});
