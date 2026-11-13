import { and, count, eq, gte } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { unsortedCount } from '@/db/entriesRepo';
import { entries } from '@/db/schema';
import { getSettings } from '@/db/settingsRepo';
import type { AppDb } from '@/db/types';
import { t } from '@/i18n';

import { nextReminderAt, nudgeDays, nudgeTimes, reminderContent, startOfDay, type NudgeTime, type ReminderTime } from './reminder';

export const SORT_CHANNEL = 'weekly-sort';
export const NUDGE_CHANNEL = 'daily-nudge';
export const BACKUP_CHANNEL = 'backup';
/** Weeks scheduled ahead. The nightly background task and every app start move the window on, so it never runs out. */
const WEEKS_AHEAD = 4;
const NUDGE_DAYS_AHEAD = 7;
const idOf = (i: number) => `weekly-sort-${i}`;
const nudgeId = (i: number) => `daily-nudge-${i}`;
const BACKUP_TAP_ID = 'backup-tap';
export const SORT_URL = '/sort';
export const NUDGE_URL = '/capture';
export const BACKUP_TAP_URL = '/backup?run=1';

export async function ensureSortChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SORT_CHANNEL, {
    name: 'Weekly sort reminder',
    description: 'One reminder a week when entries are waiting to be sorted.',
    importance: AndroidImportance.DEFAULT,
    lightColor: '#F5B841',
  });
}

async function ensureChannel(id: typeof NUDGE_CHANNEL | typeof BACKUP_CHANNEL) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(
    id,
    id === NUDGE_CHANNEL
      ? { name: 'Daily nudge', description: 'One evening reminder on days nothing was logged.', importance: AndroidImportance.DEFAULT }
      : { name: 'Backup', description: "When the nightly backup can't finish on its own.", importance: AndroidImportance.DEFAULT },
  );
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

const cancelIds = (ids: string[]) => Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));

/**
 * Replaces the scheduled Sunday reminders. Nothing is scheduled when the reminder is off, nothing waits to be
 * sorted, or notifications aren't allowed. The text carries the unsorted count at scheduling time; it is
 * rescheduled whenever that count or the settings change, at every app start and by the nightly task.
 */
export async function scheduleSortReminders(r: ReminderTime & { on: boolean }, unsorted: number, now = Date.now()) {
  await cancelIds(Array.from({ length: WEEKS_AHEAD }, (_, i) => idOf(i)));
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
  await cancelIds(Array.from({ length: WEEKS_AHEAD }, (_, i) => idOf(i)));
}

/** Q22 daily nudge: the next 7 evenings on the chosen days, minus today once something was logged today. */
export async function scheduleDailyNudge(n: NudgeTime, days: number[], loggedToday: boolean, now = Date.now()) {
  await cancelIds(Array.from({ length: NUDGE_DAYS_AHEAD }, (_, i) => nudgeId(i)));
  const times = nudgeTimes(n, days, now, loggedToday, NUDGE_DAYS_AHEAD);
  if (times.length === 0 || !(await notificationsAllowed())) return;
  await ensureChannel(NUDGE_CHANNEL);
  for (let i = 0; i < times.length; i++) {
    await Notifications.scheduleNotificationAsync({
      identifier: nudgeId(i),
      content: { title: t('backupAuto.nudgeTitle'), body: t('backupAuto.nudgeBody'), data: { url: NUDGE_URL }, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: times[i], channelId: NUDGE_CHANNEL },
    });
  }
}

/** "Delete all data": nothing scheduled may outlive the data. */
export async function cancelAllReminders() {
  await cancelSortReminders();
  await cancelIds(Array.from({ length: NUDGE_DAYS_AHEAD }, (_, i) => nudgeId(i)));
  await Notifications.dismissNotificationAsync(BACKUP_TAP_ID).catch(() => {});
}

/** Entries the driver logged today (recurring ones don't count — they log themselves). */
export function loggedToday(db: AppDb, now = Date.now()): boolean {
  const n =
    db
      .select({ n: count() })
      .from(entries)
      .where(and(gte(entries.createdAt, startOfDay(now)), eq(entries.source, 'manual')))
      .get()?.n ?? 0;
  return n > 0;
}

/** Re-plans every reminder from the stored settings (app start, settings change, nightly task). */
export async function syncReminders(db: AppDb, now = Date.now()) {
  const s = getSettings(db);
  // After "Delete all data" (settings emptied → not onboarded) nothing scheduled may outlive the data.
  if (!s.onboarded) return cancelAllReminders();
  await scheduleSortReminders(s.reminder, unsortedCount(db), now);
  await scheduleDailyNudge(s.dailyNudge, nudgeDays(s.dailyNudge, s.workHours), loggedToday(db, now), now);
}

/** F-17 "Tap to finish last night's backup" (posted by the nightly task when the backup failed in the background). */
export async function notifyBackupNeedsTap() {
  if (!(await notificationsAllowed())) return;
  await ensureChannel(BACKUP_CHANNEL);
  await Notifications.scheduleNotificationAsync({
    identifier: BACKUP_TAP_ID,
    content: { title: t('backupAuto.tapTitle'), body: t('backupAuto.tapBody'), data: { url: BACKUP_TAP_URL }, sound: false },
    trigger: null,
  });
}

export const clearBackupNeedsTap = () => Notifications.dismissNotificationAsync(BACKUP_TAP_ID).catch(() => {});
