import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { getProState } from '@/db/proRepo';
import { getSettings } from '@/db/settingsRepo';
import type { AppDb } from '@/db/types';
import { PRO_PAUSED } from '@/domain/pro';
import { t } from '@/i18n';

import { priceText, proNotificationPlan, type ProNotificationId } from './purchase';

/**
 * Pro renewal + trial-ending notifications (F-17, P1-11). S5 owns the timing and text; S4's S-20 Notifications
 * screen owns the switches (`settings.notify.proRenewal` / `trialEnding`) and calls `syncProNotices(db)` after
 * changing them and from the nightly task. S5 calls it after a trial starts, a purchase, a restore and a store refresh.
 * Idempotent: always cancels both, then schedules what the current state calls for.
 */

export const PRO_CHANNEL = 'pro';
const IDS: ProNotificationId[] = ['pro-renewal', 'pro-trial-ending'];

/** Store price last seen by S-19, so a scheduled text shows the real price (fallback: PRO_FALLBACK_PRICE). */
let lastPrice: string | null = null;
export const rememberProPrice = (price: string | null) => {
  if (price) lastPrice = price;
};

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PRO_CHANNEL, {
    name: 'Sunday Sort Pro',
    description: 'Before your Pro trial ends and 7 days before Pro renews.',
    importance: AndroidImportance.DEFAULT,
    lightColor: '#F5B841',
  });
}

const allowed = async () => {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
};

/** Replaces the scheduled Pro notifications with what the current Pro state and switches call for. */
export async function syncProNotices(db: AppDb, now = Date.now()): Promise<void> {
  await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  if (PRO_PAUSED) return; // Nothing is sold in the first release: no renewal / trial notices.
  const settings = getSettings(db);
  const plan = proNotificationPlan(getProState(db), now, {
    proRenewal: settings.notify.proRenewal,
    trialEnding: settings.notify.trialEnding,
    price: priceText(lastPrice, settings.region ?? 'UK'),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    t: (key, vars) => t(`pro.notify.${key}`, vars),
  });
  if (plan.length === 0 || !(await allowed())) return;
  await ensureChannel();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { url: n.url }, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: PRO_CHANNEL },
    });
  }
}
