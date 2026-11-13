import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { syncProNotices } from '@/features/pro/notices';
import { refreshProFromStore } from '@/features/pro/store';
import { generateDueRecurring } from '@/features/recurring/repo';
import { BACKUP_TAP_URL, ensureSortChannel, NUDGE_URL, SORT_URL, syncReminders } from '@/features/settings/notifications';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';

import { runNightlyNow } from './folder';
import { nightlyDue } from './nightly';
import { registerNightlyTask } from './nightlyTask';

const HOUR = 3_600_000;
/** Notifications this hook opens (other sessions' notifications route themselves). */
const OWN_URLS: string[] = [SORT_URL, NUDGE_URL, BACKUP_TAP_URL, '/pro'];

/** Foreground catch-up: recurring entries, and a nightly backup the background task missed for > 26 h (iOS mostly). */
function catchUp() {
  const now = Date.now();
  try {
    generateDueRecurring(db, now);
  } catch {
    // retried next time
  }
  const s = getSettings(db);
  const last = s.backupRun?.lastTryAt ?? null;
  if (nightlyDue(s, now) && last !== null && now - last >= 26 * HOUR) runNightlyNow({ now })?.catch(() => {});
}

/**
 * S4 services, mounted once by DataServices (src/services/data.tsx): registers the periodic task, catches up at
 * start / foreground, keeps the Sunday reminder + daily nudge scheduled (rescheduled when the settings, the unsorted
 * count or today's entries change), and opens the screen a tapped reminder points to.
 */
export function useAutoServices() {
  'use no memo';
  const { settings } = useSettings();
  // Any change to entries may change "unsorted" and "logged today".
  const entriesVersion = useLive(() => Date.now(), [], ['entries']);
  const { reminder: r, dailyNudge: n, workHours: w } = settings;
  const key = JSON.stringify([r, n, w.on, w.days, settings.onboarded, settings.notify]);

  useEffect(() => {
    ensureSortChannel().catch(() => {});
    registerNightlyTask().catch(() => {});
    catchUp();
    // S5: re-check the subscription with the store (≤ every 12 h, only phones that ever subscribed).
    refreshProFromStore().catch(() => {});
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        catchUp();
        syncReminders(db).catch(() => {});
        refreshProFromStore().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Debounce bursts (sorting a whole week changes the count many times).
    const id = setTimeout(() => {
      syncReminders(db).catch(() => {});
      syncProNotices(db).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [key, entriesVersion]);

  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = last.notification.request.content.data?.url;
    if (typeof url !== 'string' || !OWN_URLS.includes(url)) return;
    router.navigate(url as never);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [last]);
}
