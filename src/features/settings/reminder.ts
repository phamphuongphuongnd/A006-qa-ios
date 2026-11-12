/** weekday: 0 = Sunday … 6 = Saturday (JS Date convention, same as AppSettings.reminder). */
export interface ReminderTime {
  weekday: number;
  hour: number;
  minute: number;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Next local time strictly after `now` that matches the weekday/hour/minute. */
export function nextReminderAt(r: ReminderTime, now = Date.now()): number {
  const d = new Date(now);
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((r.weekday - d.getDay() + 7) % 7), r.hour, r.minute, 0, 0);
  if (candidate.getTime() <= now) candidate.setDate(candidate.getDate() + 7);
  return candidate.getTime();
}

/** About 12 seconds per entry, at least one minute: 14 entries → "About 3 minutes". */
export const sortMinutes = (count: number) => Math.max(1, Math.round(count / 5));

/** Notification text (mockup F-17). Null when nothing waits — no reminder is sent then. */
export function reminderContent(unsorted: number): { title: string; body: string } | null {
  if (unsorted <= 0) return null;
  const minutes = sortMinutes(unsorted);
  return {
    title: unsorted === 1 ? '1 entry to sort' : `${unsorted} entries to sort`,
    body: `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. Tap to sort your week.`,
  };
}

export const timeLabel = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/** Days since the last backup, or null if never. */
export const daysSince = (at: number | null, now = Date.now()) => (at === null ? null : Math.max(0, Math.floor((now - at) / 86_400_000)));

/** Home banner / Settings tag: backup reminder on and last backup older than 30 days (or never, once there is data). */
export function backupDue(s: { backupReminder: boolean; lastBackupAt: number | null }, hasData: boolean, now = Date.now()): boolean {
  if (!s.backupReminder || !hasData) return false;
  const days = daysSince(s.lastBackupAt, now);
  return days === null || days > 30;
}
