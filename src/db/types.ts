import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Both drivers we use are synchronous: expo-sqlite on device, better-sqlite3 in Jest.
 * Repositories take this type so the same code runs in both.
 */
export type AppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** Short sortable id: time (base36) + random. Good enough for a single-device log. */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
