import { en } from './en';

type Dict = typeof en;
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dict>;

/** t('home.toSort', { count: 14 }) → "14 entries to sort". Missing keys return the key itself. */
/** Counts read "1,620 entries", never "1620 entries" (B-79 Home, B-132 Reports) — years and the like aren't counts. */
const COUNT_PARAMS = new Set(['count', 'total', 'done']);
const param = (k: string, v: string | number) =>
  typeof v === 'number' && COUNT_PARAMS.has(k) && Number.isInteger(v) ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(v);

export function t(key: TKey, params?: Record<string, string | number>): string {
  let node: unknown = en;
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  let s = typeof node === 'string' ? node : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, param(k, v));
  return s;
}

/**
 * Count-aware t(): uses the `<key>One` string when `count` is 1 and one exists (B-42 — never "1 entries").
 * `count` is also passed as `{count}` unless `params` sets it.
 */
export function tn(key: TKey, count: number, params?: Record<string, string | number>): string {
  const one = `${key}One` as TKey;
  const useOne = count === 1 && t(one) !== one;
  return t(useOne ? one : key, { count, ...params });
}
