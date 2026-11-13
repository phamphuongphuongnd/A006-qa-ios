import type { AppSettings } from '@/db/settingsRepo';
import { showBackupBanner } from '@/features/entries/logic';

import { backupFailures } from './nightly';

/** Nightly-backup failures that raise the Home "Backups are failing" card (P1-7). */
export const BACKUP_FAILS_FOR_ALERT = 3;

/**
 * Backup signals for the Home alert card (features/home/alerts.ts). A whole day with no good nightly run counts as a
 * failure too (the background task needs a network and may be held back by battery saver) — see backupFailures.
 */
export function backupAlertSignals(
  s: Pick<
    AppSettings,
    'backupNightly' | 'backupFailCount' | 'lastAutoBackupAt' | 'lastBackupAt' | 'backupReminder' | 'backupBannerSnoozedUntil'
  >,
  entryCount: number,
  now: number,
): { failing: boolean; old: boolean } {
  return {
    failing: backupFailures(s, now) >= BACKUP_FAILS_FOR_ALERT,
    // The old "Last backup 34 days ago" banner only while nightly backup is off.
    old: !s.backupNightly && showBackupBanner(s, entryCount, now),
  };
}
