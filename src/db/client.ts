import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import type { AppDb } from './types';

export const DB_NAME = 'sundaysort.db';

const sqlite = openDatabaseSync(DB_NAME, { enableChangeListener: true });
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const expoDb = drizzle(sqlite, { schema });
export const db = expoDb as unknown as AppDb;
export { sqlite };
