import { en } from './en';

type Dict = typeof en;
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dict>;

/** t('home.toSort', { count: 14 }) → "14 entries to sort". Missing keys return the key itself. */
export function t(key: TKey, params?: Record<string, string | number>): string {
  let node: unknown = en;
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  let s = typeof node === 'string' ? node : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
