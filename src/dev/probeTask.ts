import * as BackgroundTask from 'expo-background-task';
import { Directory } from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';

/**
 * P3 device check (dev builds only): can a background task write into the folder picked with the system picker
 * (Google Drive / SAF) while the app is closed? The same path S4's nightly backup will take.
 */
export const PROBE_TASK = 'sundaysort-p3-probe-write';

export function writeProbeFile(tag: string): string {
  const folder = getSettings(db).backupFolder;
  if (!folder) throw new Error('no folder picked');
  const name = `probe-${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const f = new Directory(folder.uri).createFile(name, 'text/plain');
  f.write(`Sunday Sort P3 probe (${tag}) ${new Date().toString()}\n`);
  return name;
}

if (!TaskManager.isTaskDefined(PROBE_TASK)) {
  TaskManager.defineTask(PROBE_TASK, async () => {
    try {
      const name = writeProbeFile('background');
      console.log('[probe] background write ok', name);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (e) {
      console.warn('[probe] background write failed', e);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}
