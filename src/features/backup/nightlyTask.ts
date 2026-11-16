import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { syncProNotices } from '@/features/pro/notices';
import { generateDueRecurring } from '@/features/recurring/repo';
import { notifyBackupNeedsTap, syncReminders } from '@/features/settings/notifications';
import { purgeExpiredTrash } from '@/features/trash/purge';

import { runNightlyNow } from './folder';
import { nightlyDue } from './nightly';

/**
 * One periodic background task for S4 (imported from index.ts so it is defined at bundle load, also headless):
 * recurring entries that came due, moving the reminder window on (the Sunday reminder never stops after 4 weeks),
 * and the nightly backup when due. WorkManager / BGTaskScheduler pick the exact time; Android needs a network.
 * Force a run on a device: `adb shell cmd jobscheduler run -f -n androidx.work.systemjobscheduler <pkg> <jobId>`.
 */
export const NIGHTLY_TASK = 'sundaysort-nightly';
/** Minutes between wake-ups (inexact). The backup itself runs once a night — see nightlyDue. */
const INTERVAL_MIN = 180;

export async function runBackgroundWork(now = Date.now(), opts: { notifyOnFail: boolean } = { notifyOnFail: true }) {
  try {
    generateDueRecurring(db, now);
  } catch (e) {
    console.warn('[nightly] recurring failed', e);
  }
  try {
    purgeExpiredTrash(now);
  } catch (e) {
    console.warn('[nightly] trash purge failed', e);
  }
  try {
    await syncReminders(db, now);
  } catch (e) {
    console.warn('[nightly] reminders failed', e);
  }
  try {
    await syncProNotices(db, now);
  } catch (e) {
    console.warn('[nightly] pro notices failed', e);
  }
  const s = getSettings(db);
  if (!nightlyDue(s, now)) return null;
  const r = await runNightlyNow({ now });
  if (r?.status === 'failed' && opts.notifyOnFail && s.notify.backupTap !== false) await notifyBackupNeedsTap().catch(() => {});
  return r;
}

if (!TaskManager.isTaskDefined(NIGHTLY_TASK)) {
  TaskManager.defineTask(NIGHTLY_TASK, async () => {
    try {
      const r = await runBackgroundWork();
      console.log('[nightly] done', r?.status ?? 'not due');
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (e) {
      console.warn('[nightly] failed', e);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Registers the periodic task once (kept by the OS across restarts). */
export async function registerNightlyTask() {
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(NIGHTLY_TASK)) return;
  await BackgroundTask.registerTaskAsync(NIGHTLY_TASK, { minimumInterval: INTERVAL_MIN });
}
