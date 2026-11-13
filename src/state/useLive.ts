// expo-router vendors React Navigation; its context is the one the app's navigators provide. Read optionally
// (undefined outside a screen, e.g. root services), which the public `useNavigation()` can't do — it throws.
import { NavigationContext } from 'expo-router/build/react-navigation/core/NavigationContext.js';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useContext, useEffect, useReducer, useRef, type DependencyList } from 'react';

/** SQLite tables a live query can depend on (names as in `src/db/schema.ts`). */
export type LiveTable =
  | 'entries'
  | 'receipts'
  | 'categories'
  | 'trips'
  | 'trip_points'
  | 'settings'
  | 'trip_stops'
  | 'trip_segments'
  | 'rules'
  | 'rule_offers'
  | 'recurring'
  | 'known_routes'
  | 'pro_state';

const versions = new Map<string, number>();
const subs = new Map<string, Set<() => void>>();
let pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function flush() {
  timer = null;
  const changed = pending;
  pending = new Set();
  const notify = new Set<() => void>();
  for (const t of changed) {
    versions.set(t, (versions.get(t) ?? 0) + 1);
    subs.get(t)?.forEach((s) => notify.add(s));
  }
  notify.forEach((s) => s());
}

/** Record a change by hand (tests, or writes made outside the change-listener connection). */
export function markTablesChanged(tables: readonly string[]) {
  tables.forEach((t) => pending.add(t));
  timer ??= setTimeout(flush, 16);
}

function start() {
  if (started) return;
  started = true;
  // Fires once per row write on the connection (client.ts opens it with enableChangeListener).
  // A burst (transaction, restore) is coalesced into one notification per table.
  addDatabaseChangeListener((e) => markTablesChanged([e.tableName]));
}

/** Exported for tests. */
export function subscribe(tables: readonly string[], cb: () => void): () => void {
  for (const t of tables) {
    let set = subs.get(t);
    if (!set) subs.set(t, (set = new Set()));
    set.add(cb);
  }
  return () => tables.forEach((t) => subs.get(t)?.delete(cb));
}

/** Exported for tests. */
export const stampOf = (tables: readonly string[]) => tables.map((t) => versions.get(t) ?? 0).join(',');

function sameDeps(a: DependencyList, b: DependencyList) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

/** Re-renders when any of `tables` changes (no query); returns a value that changes with them. */
export function useTablesVersion(tables: readonly LiveTable[]): string {
  return useLive(() => stampOf(tables), [], tables);
}

/**
 * Synchronous SQLite query cached per component:
 * `const rows = useLive(() => listEntries(db, f), [f], ['entries', 'receipts'])`.
 * Re-runs only when `deps` change or one of `tables` was written — not on every render. While its screen is not
 * focused (another tab, or a screen pushed on top) a write only marks it stale; it refreshes when focused again.
 */
export function useLive<T>(query: () => T, deps: DependencyList, tables: readonly LiveTable[]): T {
  // Opt out of React Compiler: caching here is by `deps` + table versions, not by the closure.
  'use no memo';
  const navigation = useContext(NavigationContext);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const stamp = stampOf(tables);
  // Render-time cache keyed by the tables' versions + the caller's deps (a variable-length useMemo).
  // Recomputing during render is pure: same stamp + deps → same rows.
  const cache = useRef<{ deps: DependencyList; stamp: string; value: T } | null>(null);
  /* eslint-disable react-hooks/refs */
  let c = cache.current;
  if (!c || c.stamp !== stamp || !sameDeps(c.deps, deps)) {
    c = { deps, stamp, value: query() };
    cache.current = c;
  }
  const value = c.value;
  /* eslint-enable react-hooks/refs */

  const rendered = useRef(stamp);
  useEffect(() => {
    rendered.current = stamp;
  });

  const key = tables.join(',');
  useEffect(() => {
    start();
    const list = key.split(',');
    let stale = false;
    const onChange = () => {
      if (navigation && !navigation.isFocused()) {
        stale = true;
        return;
      }
      rerender();
    };
    const off = subscribe(list, onChange);
    const offFocus = navigation?.addListener('focus', () => {
      if (stale || rendered.current !== stampOf(list)) {
        stale = false;
        rerender();
      }
    });
    // A write may have landed between render and subscribing.
    if (rendered.current !== stampOf(list)) onChange();
    return () => {
      off();
      offFocus?.();
    };
  }, [key, navigation]);

  return value; // eslint-disable-line react-hooks/refs -- the cached query result, see above
}
