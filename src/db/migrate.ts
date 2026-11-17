import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../drizzle/migrations';
import { expoDb } from './client';

let running: Promise<void> | null = null;

/**
 * Runs the bundled migrations once per JS runtime (QA-100 OLD-4). Not only the screens need this: Android starts the
 * JS runtime headless for the GPS foreground service, automatic-trip signals, the nightly task and widgets — on a
 * fresh install before the first screen, and after an app update before the driver opens the app. Every entry point
 * awaits this before touching the database. A failure is retried on the next call.
 */
export function ensureMigrated(): Promise<void> {
  running ??= migrate(expoDb, migrations).catch((e: unknown) => {
    running = null;
    throw e;
  });
  return running;
}
