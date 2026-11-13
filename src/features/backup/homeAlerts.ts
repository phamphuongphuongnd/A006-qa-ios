import type { AppSettings } from '@/db/settingsRepo';
import { showBackupBanner } from '@/features/entries/logic';

/** Nightly-backup failures that raise the Home "Backups are failing" card (P1-7). */
export const BACKUP_FAILS_FOR_ALERT = 3;

/**
 * Backup signals for the Home alert card (features/home/alerts.ts). Owned by S4: also count "no nightly run for
 * > 24 h" as a failure (the background task needs a network, PLAN-v2 risk notes).
 */
export function backupAlertSignals(
  s: Pick<AppSettings, 'backupNightly' | 'backupFailCount' | 'lastBackupAt' | 'backupReminder' | 'backupBannerSnoozedUntil'>,
  entryCount: number,
  now: number,
): { failing: boolean; old: boolean } {
  return {
    failing: s.backupNightly && s.backupFailCount >= BACKUP_FAILS_FOR_ALERT,
    // The old "Last backup 34 days ago" banner only while nightly backup is off.
    old: !s.backupNightly && showBackupBanner(s, entryCount, now),
  };
}
