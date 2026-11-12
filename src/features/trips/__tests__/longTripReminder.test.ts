// Step 4 · TC-131: "Still driving?" is scheduled 12 hours after the trip started, with End trip / Keep going.

import { TRIP_REMINDER_MS } from '@/domain/mileage';

import { CATEGORY_LONG, NOTIF_LONG_TRIP } from '../constants';
import { scheduleLongTripReminder } from '../notify';

const mockScheduled: any[] = [];
const mockCategories: Record<string, any[]> = {};

jest.mock('expo-notifications', () => ({
  AndroidImportance: { LOW: 2, HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidNotificationPriority: { LOW: 'low' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => {}),
  setNotificationCategoryAsync: jest.fn(async (id: string, actions: any[]) => {
    mockCategories[id] = actions;
  }),
  scheduleNotificationAsync: jest.fn(async (req: any) => {
    mockScheduled.push(req);
    return req.identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  dismissNotificationAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
}));

describe('long trip reminder', () => {
  beforeEach(() => {
    mockScheduled.length = 0;
  });

  it('fires 12 hours after the start with the product wording and buttons', async () => {
    const start = Date.UTC(2026, 10, 12, 6, 0);
    await scheduleLongTripReminder({ startedAt: start }, start + 60_000);
    expect(TRIP_REMINDER_MS).toBe(12 * 60 * 60 * 1000);
    expect(mockScheduled).toHaveLength(1);
    const req = mockScheduled[0];
    expect(req.identifier).toBe(NOTIF_LONG_TRIP);
    expect(req.trigger.date).toBe(start + TRIP_REMINDER_MS);
    expect(`${req.content.title} ${req.content.body}`).toBe('Still driving? Your trip has been running for 12 hours.');
    expect(req.content.categoryIdentifier).toBe(CATEGORY_LONG);
    expect(mockCategories[CATEGORY_LONG].map((a) => a.buttonTitle)).toEqual(['End trip', 'Keep going']);
  });

  it('a trip already older than 12 hours (app reopened late) is reminded a minute from now', async () => {
    const start = Date.UTC(2026, 10, 12, 6, 0);
    const now = start + TRIP_REMINDER_MS + 3_600_000;
    await scheduleLongTripReminder({ startedAt: start }, now);
    expect(mockScheduled[0].trigger.date).toBe(now + 60_000);
  });
});
