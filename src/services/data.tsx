import * as Notifications from 'expo-notifications';
import { router } from '@/services/router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import { unsortedCount } from '@/db/entriesRepo';
import { lockSuspended } from '@/features/settings/lockState';
import { LockedView } from '@/features/settings/LockedView';
import { ensureSortChannel, scheduleSortReminders, SORT_URL } from '@/features/settings/notifications';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';

export { withLockSuspended } from '@/features/settings/lockState';

// Local notifications only: show them even while the app is open, quietly.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Data / settings background services, mounted once in the root layout after onboarding:
 * notification channel, the weekly "entries to sort" reminder (F-17) rescheduled whenever the settings or the
 * unsorted count change, and opening Sort when that notification is tapped.
 */
export function DataServices() {
  const { settings } = useSettings();
  const unsorted = useLive(() => unsortedCount(db), [], ['entries']);
  const { on, weekday, hour, minute } = settings.reminder;

  useEffect(() => {
    ensureSortChannel().catch(() => {});
  }, []);

  useEffect(() => {
    // Debounce bursts (sorting a whole week changes the count many times).
    const id = setTimeout(() => {
      scheduleSortReminders({ on, weekday, hour, minute }, unsorted).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [on, weekday, hour, minute, unsorted]);

  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    if (last.notification.request.content.data?.url !== SORT_URL) return;
    router.navigate(SORT_URL);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [last]);

  return null;
}

/**
 * Wraps the navigator. With app lock on, the S-13 Locked screen covers the app at launch and after the app was
 * in the background for `lockAfterMs`. Navigation underneath keeps its state, so a notification or widget tap
 * lands on its screen once unlocked.
 */
const LockedCtx = createContext(false);

/** True while the App lock screen covers the app (screens re-focus inputs once it lifts, B-21). */
export const useAppLocked = () => useContext(LockedCtx);

export function LockGate({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const enabled = settings.onboarded && settings.appLock;
  const [locked, setLocked] = useState(enabled);
  const cfg = useRef({ enabled, after: settings.lockAfterMs as number });
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    cfg.current = { enabled, after: settings.lockAfterMs };
  }, [enabled, settings.lockAfterMs]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') {
        // A share sheet / picker / biometric prompt we opened doesn't count as leaving the app.
        leftAt.current = lockSuspended() ? null : Date.now();
      } else if (s === 'active') {
        const at = leftAt.current;
        leftAt.current = null;
        if (at !== null && cfg.current.enabled && Date.now() - at >= cfg.current.after) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const showLock = locked && enabled;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} importantForAccessibility={showLock ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={showLock}>
        <LockedCtx.Provider value={showLock}>{children}</LockedCtx.Provider>
      </View>
      {showLock ? (
        <View style={StyleSheet.absoluteFill}>
          <LockedView onUnlock={() => setLocked(false)} />
        </View>
      ) : null}
    </View>
  );
}
