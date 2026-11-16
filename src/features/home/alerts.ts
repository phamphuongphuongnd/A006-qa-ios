/**
 * Home alert card (product.md F-03 §2, design/components/AlertCard.md): at most one card, in this priority. Each
 * feature only says whether its alert is due (signals from features/trips, features/backup, features/pro); Home
 * picks and draws the card (features/home/HomeAlert.tsx).
 */
export const HOME_ALERT_ORDER = [
  'tripStopped',
  'autoPaused',
  'noTrips',
  // S1c: Missing trips (Q26), odometer off by the threshold (Q27), odometer reading due (Q27).
  'missingTrips',
  'odometer',
  'odometerDue',
  'backupFailing',
  'proRenews',
  'oldBackup',
] as const;
export type HomeAlertId = (typeof HOME_ALERT_ORDER)[number];

/** ✕ hides a card for 7 days (not the first one: a stopped trip must be answered). */
export const ALERT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const alertCanHide = (id: HomeAlertId) => id !== 'tripStopped';

export function pickHomeAlert(
  due: Partial<Record<HomeAlertId, boolean>>,
  snoozedUntil: Partial<Record<string, number>>,
  now: number,
): HomeAlertId | null {
  for (const id of HOME_ALERT_ORDER) {
    if (!due[id]) continue;
    const until = snoozedUntil[id];
    if (alertCanHide(id) && until !== undefined && now < until) continue;
    return id;
  }
  return null;
}

/** "Tue or Wed" / "Mon, Tue or Wed" for the no-trips card. */
export function joinDays(days: string[]): string {
  if (days.length <= 1) return days[0] ?? '';
  return `${days.slice(0, -1).join(', ')} or ${days[days.length - 1]}`;
}
