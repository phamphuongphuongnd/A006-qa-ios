import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import type { TripRow } from '@/db/schema';
import { TRIP_REMINDER_MS } from '@/domain/mileage';
import { t } from '@/i18n';

import {
  ACTION_END,
  ACTION_KEEP,
  ACTION_PAUSE,
  ACTION_RESUME,
  CATEGORY_LONG,
  CATEGORY_PAUSED,
  CATEGORY_RUNNING,
  CHANNEL_LOCATION_SERVICE,
  OLD_CHANNEL_LOCATION_SERVICE,
  CHANNEL_TRIP,
  CHANNEL_TRIP_REMINDER,
  NOTIF_COLOR,
  NOTIF_LONG_TRIP,
  NOTIF_TRIP,
} from './constants';

let setupDone: Promise<void> | null = null;

/** Channels + action categories. Safe to call many times. */
export function setupTripNotifications(): Promise<void> {
  if (!setupDone) {
    setupDone = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_TRIP, {
          name: t('trip.channelName'),
          importance: AndroidImportance.LOW,
          sound: null,
          vibrationPattern: null,
          enableVibrate: false,
          showBadge: false,
          lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        });
        // Android won't lower an existing channel's importance, so the service uses a new channel id (new task name)
        // that is created here at MIN before the first trip; the old LOW one goes.
        await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL_LOCATION_SERVICE).catch(() => {});
        await Notifications.setNotificationChannelAsync(CHANNEL_LOCATION_SERVICE, {
          name: t('trip.channelServiceName'),
          importance: AndroidImportance.MIN,
          sound: null,
          vibrationPattern: null,
          enableVibrate: false,
          showBadge: false,
        });
        await Notifications.setNotificationChannelAsync(CHANNEL_TRIP_REMINDER, {
          name: t('trip.channelReminderName'),
          importance: AndroidImportance.HIGH,
          lightColor: NOTIF_COLOR,
        });
      }
      const open = { opensAppToForeground: true };
      await Notifications.setNotificationCategoryAsync(CATEGORY_RUNNING, [
        { identifier: ACTION_PAUSE, buttonTitle: t('trip.actionPersonalStop'), options: open },
        { identifier: ACTION_END, buttonTitle: t('trip.actionEnd'), options: open },
      ]);
      await Notifications.setNotificationCategoryAsync(CATEGORY_PAUSED, [
        { identifier: ACTION_RESUME, buttonTitle: t('trip.actionResume'), options: open },
        { identifier: ACTION_END, buttonTitle: t('trip.actionEnd'), options: open },
      ]);
      await Notifications.setNotificationCategoryAsync(CATEGORY_LONG, [
        { identifier: ACTION_END, buttonTitle: t('trip.actionEnd'), options: open },
        { identifier: ACTION_KEEP, buttonTitle: t('trip.actionKeepGoing'), options: { opensAppToForeground: false } },
      ]);
    })().catch((e) => {
      setupDone = null;
      throw e;
    });
  }
  return setupDone;
}

/** Ask once when the first trip starts (Android 13+ / iOS). Recording works without it. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

let lastShown = '';

/**
 * Ongoing "Trip running · 42.3 mi" with Personal stop / End trip (or Resume / End trip while paused).
 * Re-posting with the same identifier updates it in place; identical text is skipped.
 */
export async function showTripNotification(trip: Pick<TripRow, 'status'> & Partial<Pick<TripRow, 'startedBy'>>, distanceText: string, force = false) {
  const paused = trip.status === 'paused';
  const title = paused ? t('trip.notifPaused', { distance: distanceText }) : t('trip.notifRunning', { distance: distanceText });
  if (!force && title === lastShown) return;
  lastShown = title;
  try {
    await setupTripNotifications();
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_TRIP,
      content: {
        title,
        body: trip.startedBy === 'auto' && !paused ? t('autoTrip.notif.autoBody') : t('trip.notifRecording'),
        sticky: true,
        autoDismiss: false,
        sound: false,
        color: NOTIF_COLOR,
        priority: Notifications.AndroidNotificationPriority.LOW,
        interruptionLevel: 'passive',
        categoryIdentifier: paused ? CATEGORY_PAUSED : CATEGORY_RUNNING,
        data: { kind: 'trip', url: '/trip/active' },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_TRIP } : null,
    });
  } catch {
    // Notifications are a convenience; recording continues without them.
  }
}

export async function clearTripNotification() {
  lastShown = '';
  await Notifications.dismissNotificationAsync(NOTIF_TRIP).catch(() => {});
}

/** "Still driving?" 12 hours after the trip started. */
export async function scheduleLongTripReminder(trip: Pick<TripRow, 'startedAt'>, now = Date.now()) {
  await cancelLongTripReminder();
  const at = Math.max(trip.startedAt + TRIP_REMINDER_MS, now + 60_000);
  try {
    await setupTripNotifications();
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_LONG_TRIP,
      content: {
        title: t('trip.notifStillTitle'),
        body: t('trip.notifStillBody'),
        color: NOTIF_COLOR,
        categoryIdentifier: CATEGORY_LONG,
        data: { kind: 'trip', url: '/trip/active' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_TRIP_REMINDER },
    });
  } catch {
    // ignore — reminder is best effort
  }
}

export async function cancelLongTripReminder() {
  await Notifications.cancelScheduledNotificationAsync(NOTIF_LONG_TRIP).catch(() => {});
  await Notifications.dismissNotificationAsync(NOTIF_LONG_TRIP).catch(() => {});
}
