// Automatic-trip notifications (F-12, F-17): trip saved, still on a trip, not recording, paused, Pro ended, start fallback.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';

import { ACTION_END, ACTION_KEEP, CATEGORY_ENDED, CATEGORY_LONG, CHANNEL_TRIP, CHANNEL_TRIP_REMINDER, NOTIF_COLOR } from '../constants';
import { formatClock } from '../format';
import { setupTripNotifications } from '../notify';

export const NOTIF_AUTO_SAVED = 'trip-auto-saved';
export const NOTIF_STILL = 'trip-still';
export const NOTIF_SILENT = 'trip-silent';
export const NOTIF_AUTO_OFF = 'trip-auto-off';
export const NOTIF_AUTO_START_FAILED = 'trip-auto-start-failed';

async function post(
  identifier: string,
  title: string,
  body: string,
  opts: { channel?: string; url?: string; category?: string; data?: object; at?: number } = {},
) {
  try {
    await setupTripNotifications();
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        color: NOTIF_COLOR,
        categoryIdentifier: opts.category,
        data: { kind: 'trip', url: opts.url ?? '/miles', ...opts.data },
      },
      trigger:
        opts.at !== undefined
          ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: opts.at, channelId: opts.channel ?? CHANNEL_TRIP_REMINDER }
          : Platform.OS === 'android'
            ? { channelId: opts.channel ?? CHANNEL_TRIP_REMINDER }
            : null,
    });
  } catch {
    // Notifications are best effort.
  }
}

/** Silent "Trip saved · 42.3 mi · Work" / "· Sort on Sunday" + "Continue trip" (Phương 19/11). */
export const notifyAutoSaved = (distance: string, scopeText: string, tripId: string, endedAt: number) =>
  post(
    NOTIF_AUTO_SAVED,
    t('autoTrip.notif.savedTitle', { distance, scope: scopeText }),
    t('autoTrip.notif.endedBody', { time: formatClock(endedAt) }),
    { channel: CHANNEL_TRIP, url: `/trip/${tripId}`, category: CATEGORY_ENDED, data: { tripId } },
  );

/** A Trip the driver started ended on its own after standing still: "Trip ended at 17:52 · 3.4 mi" + "Continue trip". */
export const notifyTripEnded = (distance: string, endedAt: number, tripId: string) =>
  post(
    NOTIF_AUTO_SAVED,
    t('autoTrip.notif.endedTitle', { time: formatClock(endedAt), distance }),
    t('autoTrip.notif.endedDriverBody'),
    { url: `/trip/${tripId}`, category: CATEGORY_ENDED, data: { tripId } },
  );

/** Manual trip not moving 45 min: End trip (ends when it stopped) / Keep going. */
export const notifyStill = () =>
  post(NOTIF_STILL, t('autoTrip.notif.stillTitle'), t('autoTrip.notif.stillBody'), { category: CATEGORY_LONG, url: '/trip/active' });

export const notifySilent = () => post(NOTIF_SILENT, t('autoTrip.notif.silentTitle'), t('autoTrip.notif.silentBody'), { url: '/trip/active' });

/**
 * iOS backstop (B-96): the same two notifications booked ahead with the same identifiers, so iOS shows them even if
 * the app has stopped running; re-booked as fixes arrive, cancelled when the trip ends (features/trips/auto/backstop.ts).
 */
export const scheduleStill = (at: number) =>
  post(NOTIF_STILL, t('autoTrip.notif.stillTitle'), t('autoTrip.notif.stillBody'), { category: CATEGORY_LONG, url: '/trip/active', at });

export const scheduleSilent = (at: number) =>
  post(NOTIF_SILENT, t('autoTrip.notif.silentTitle'), t('autoTrip.notif.silentBody'), { url: '/trip/active', at });

export const cancelScheduled = (identifier: string) => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

/** Already on screen (a booked backstop fired): don't post it again. */
export async function isPresented(identifier: string): Promise<boolean> {
  try {
    return (await Notifications.getPresentedNotificationsAsync()).some((n) => n.request.identifier === identifier);
  } catch {
    return false;
  }
}

export const notifyAutoPaused = (samsung: boolean) =>
  Platform.OS === 'ios'
    ? post(NOTIF_AUTO_OFF, t('homeV2.alert.autoPausedTitle'), t('homeV2.alert.autoPausedBodyIos'), { url: '/trip/setup' })
    : post(NOTIF_AUTO_OFF, t('homeV2.alert.autoPausedTitle'), samsung ? t('homeV2.alert.autoPausedBodySamsung') : t('homeV2.alert.autoPausedBody'), {
        url: '/trip/battery',
      });

export const notifyProEnded = () => post(NOTIF_AUTO_OFF, t('autoTrip.notif.proEndedTitle'), t('autoTrip.notif.proEndedBody'), { url: '/trip/auto' });

/** Android refused to start GPS from the background: ask for one tap. */
export const notifyStartFailed = () =>
  post(NOTIF_AUTO_START_FAILED, t('autoTrip.notif.startFailedTitle'), t('autoTrip.notif.startFailedBody'), { url: '/trip/active?start=1' });

export const clearStillNotifications = () =>
  Promise.all([NOTIF_STILL, NOTIF_SILENT].map((id) => Notifications.dismissNotificationAsync(id).catch(() => {})));

export { ACTION_END, ACTION_KEEP };
