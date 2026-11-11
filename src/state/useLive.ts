import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

let version = 0;
const subs = new Set<() => void>();
let scheduled = false;
let started = false;

function start() {
  if (started) return;
  started = true;
  // Fires for every row write on the connection (client.ts opens it with enableChangeListener).
  addDatabaseChangeListener(() => {
    if (scheduled) return;
    scheduled = true;
    // Coalesce a burst of row changes (e.g. a transaction) into one re-render.
    setTimeout(() => {
      scheduled = false;
      version++;
      subs.forEach((s) => s());
    }, 16);
  });
}

/** Re-renders when any table changes. */
export function useDbVersion(): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    start();
    const s = () => setV(version);
    subs.add(s);
    return () => void subs.delete(s);
  }, []);
  return v;
}

/**
 * Synchronous query that re-runs on every render, and the component re-renders after any DB write:
 * `const rows = useLive(() => listEntries(db, f))`. Repos are synchronous and cheap (local SQLite),
 * so no memo or loading state is needed.
 */
export function useLive<T>(query: () => T): T {
  useDbVersion();
  return query();
}
