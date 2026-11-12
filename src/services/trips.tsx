import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { ACTION_END, ACTION_KEEP, ACTION_PAUSE, ACTION_RESUME, NOTIF_LONG_TRIP } from '@/features/trips/constants';
import { detectInterruptedTrip, stopOrphanRecording } from '@/features/trips/controller';
import { setupTripNotifications } from '@/features/trips/notify';
import { refreshWidgets } from '@/features/widgets/refresh';
import { useDbVersion } from '@/state/useLive';

/**
 * Trip & widget background services (owner: miles/GPS/widget work). Mounted once in the root layout after
 * onboarding. The background location task itself is registered at bundle load (see `index.ts`).
 * - On launch / return to foreground: detect a trip whose recording stopped silently → "interrupted".
 * - Notification buttons (Personal stop / Resume / End trip / Keep going) → Active trip screen.
 * - Any data change → refresh home-screen widgets (debounced); stop GPS if its trip was wiped (Delete all / Restore).
 */
export function TripServices() {
  useTripLifecycle();
  useTripNotificationResponses();
  useWidgetRefresh();
  return null;
}

function useTripLifecycle() {
  useEffect(() => {
    setupTripNotifications().catch(() => {});
    const check = () => {
      detectInterruptedTrip().catch(() => {});
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);
}

function useTripNotificationResponses() {
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const req = r.notification.request;
      const data = req.content.data as { kind?: string } | undefined;
      if (data?.kind !== 'trip') return;
      const key = `${req.identifier}:${r.notification.date}:${r.actionIdentifier}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      switch (r.actionIdentifier) {
        case ACTION_PAUSE:
          router.push('/trip/active?action=pause');
          break;
        case ACTION_RESUME:
          router.push('/trip/active?action=resume');
          break;
        case ACTION_END:
          router.push('/trip/active?action=end');
          break;
        case ACTION_KEEP:
          Notifications.dismissNotificationAsync(NOTIF_LONG_TRIP).catch(() => {});
          break;
        default:
          router.push('/trip/active');
      }
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, []);
}

function useWidgetRefresh() {
  const v = useDbVersion();
  useEffect(() => {
    const id = setTimeout(() => {
      refreshWidgets().catch((e: unknown) => console.warn('[widget] refresh failed', e));
      stopOrphanRecording().catch(() => {});
    }, 1_500);
    return () => clearTimeout(id);
  }, [v]);
}
