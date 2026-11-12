import { backupDue, daysSince, nextReminderAt, reminderContent, sortMinutes, timeLabel } from '../reminder';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('weekly reminder', () => {
  const sun18 = { weekday: 0, hour: 18, minute: 0 };

  it('picks the coming Sunday 18:00', () => {
    // Thu 12 Nov 2026
    expect(nextReminderAt(sun18, at(2026, 11, 12, 9))).toBe(at(2026, 11, 15, 18));
  });

  it('same day: before the time → today, at/after → next week', () => {
    expect(nextReminderAt(sun18, at(2026, 11, 15, 17, 59))).toBe(at(2026, 11, 15, 18));
    expect(nextReminderAt(sun18, at(2026, 11, 15, 18))).toBe(at(2026, 11, 22, 18));
  });

  it('handles another weekday and minutes', () => {
    expect(nextReminderAt({ weekday: 1, hour: 7, minute: 30 }, at(2026, 11, 15, 20))).toBe(at(2026, 11, 16, 7, 30));
  });

  it('content follows the mockup and is skipped when nothing to sort', () => {
    expect(reminderContent(14)).toEqual({ title: '14 entries to sort', body: 'About 3 minutes. Tap to sort your week.' });
    expect(reminderContent(1)).toEqual({ title: '1 entry to sort', body: 'About 1 minute. Tap to sort your week.' });
    expect(reminderContent(0)).toBeNull();
    expect(sortMinutes(40)).toBe(8);
  });

  it('formats time', () => {
    expect(timeLabel(7, 5)).toBe('07:05');
  });
});

describe('backup due', () => {
  const now = at(2026, 11, 12);
  it('counts days and flags > 30', () => {
    expect(daysSince(null, now)).toBeNull();
    expect(daysSince(now - 34 * 86_400_000, now)).toBe(34);
    expect(backupDue({ backupReminder: true, lastBackupAt: now - 31 * 86_400_000 }, true, now)).toBe(true);
    expect(backupDue({ backupReminder: true, lastBackupAt: now - 30 * 86_400_000 }, true, now)).toBe(false);
    expect(backupDue({ backupReminder: true, lastBackupAt: null }, true, now)).toBe(true);
    expect(backupDue({ backupReminder: true, lastBackupAt: null }, false, now)).toBe(false);
    expect(backupDue({ backupReminder: false, lastBackupAt: null }, true, now)).toBe(false);
  });
});
