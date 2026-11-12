import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { nextReminderAt, reminderContent, type ReminderTime } from './reminder';

export const SORT_CHANNEL = 'weekly-sort';
/** Weeks scheduled ahead, so the reminder still comes if the app isn't opened for a while. */
const WEEKS_AHEAD = 4;
const idOf = (i: number) => `weekly-sort-${i}`;
export const SORT_URL = '/sort';

export async function ensureSortChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SORT_CHANNEL, {
    name: 'Weekly sort reminder',
    description: 'One reminder a week when entries are waiting to be sorted.',
    importance: AndroidImportance.DEFAULT,
    lightColor: '#F5B841',
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Asks once (system prompt); returns whether reminders can be shown. */
export async function requestNotifications(): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  await ensureSortChannel(); // Android 13 shows the prompt only once a channel exists
  const p = await Notifications.requestPermissionsAsync();
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/**
 * Replaces the scheduled Sunday reminders. Nothing is scheduled when the reminder is off, nothing waits to be
 * sorted, or notifications aren't allowed. The text carries the unsorted count at scheduling time; DataServices
 * reschedules whenever that count or the settings change.
 */
export async function scheduleSortReminders(r: ReminderTime & { on: boolean }, unsorted: number, now = Date.now()) {
  await Promise.all(Array.from({ length: WEEKS_AHEAD }, (_, i) => Notifications.cancelScheduledNotificationAsync(idOf(i)).catch(() => {})));
  const content = reminderContent(unsorted);
  if (!r.on || !content || !(await notificationsAllowed())) return;
  await ensureSortChannel();
  let at = now;
  for (let i = 0; i < WEEKS_AHEAD; i++) {
    at = nextReminderAt(r, at);
    await Notifications.scheduleNotificationAsync({
      identifier: idOf(i),
      content: { title: content.title, body: content.body, data: { url: SORT_URL }, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: SORT_CHANNEL },
    });
  }
}

export async function cancelSortReminders() {
  await Promise.all(Array.from({ length: WEEKS_AHEAD }, (_, i) => Notifications.cancelScheduledNotificationAsync(idOf(i)).catch(() => {})));
}
