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

/** Q22 daily nudge settings, as stored. */
export interface NudgeTime {
  on: boolean;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6. */
  days: number[];
}

/**
 * Days the daily nudge may fire: the driver's work days when work hours are set (S1, P1-3), otherwise its own
 * Mon–Sat list.
 */
export const nudgeDays = (n: NudgeTime, work: { on: boolean; days: number[] }) => (work.on && work.days.length ? work.days : n.days);

/**
 * Next `count` nudge times from `now` (local). Today's is left out once something was logged today — the nudge only
 * comes on a day with nothing logged ("Nothing logged today").
 */
export function nudgeTimes(n: NudgeTime, days: number[], now: number, loggedToday: boolean, count = 7): number[] {
  if (!n.on || days.length === 0) return [];
  const out: number[] = [];
  const d = new Date(now);
  for (let i = 0; out.length < count && i < 14 + count; i++) {
    const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, n.hour, n.minute, 0, 0);
    if (!days.includes(c.getDay())) continue;
    if (c.getTime() <= now) continue;
    if (i === 0 && loggedToday) continue;
    out.push(c.getTime());
  }
  return out;
}

/** Local midnight of `now`'s day. */
export const startOfDay = (now: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** "Mon–Sat", "Mon–Fri", "Sun, Wed", "Every day" for the S-20 subtitle. */
export function daysLabel(days: number[]): string {
  const set = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // Monday first
  if (set.length === 7) return 'Every day';
  if (set.length === 0) return 'No days';
  const mon = set.map((d) => (d + 6) % 7);
  const run = mon.every((v, i) => i === 0 || v === mon[i - 1] + 1);
  if (run && set.length >= 3) return `${WEEKDAYS_SHORT[set[0]]}–${WEEKDAYS_SHORT[set.at(-1)!]}`;
  return set.map((d) => WEEKDAYS_SHORT[d]).join(', ');
}
