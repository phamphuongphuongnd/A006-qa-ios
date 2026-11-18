import { formatCount, formatDateTime } from '@/features/settings/ui';
import { t } from '@/i18n';

import type { BackupListItem } from './nightly';

const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "last night 02:10" / "today 18:22" / "yesterday 18:22" / "10 Nov 2026, 18:22". */
export function whenLabel(at: number, now = Date.now()): string {
  const d = new Date(at);
  const n = new Date(now);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, n)) return d.getHours() < 6 ? t('backupAuto.lastNight', { time: hm(d) }) : t('backupAuto.today', { time: hm(d) });
  const y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
  if (sameDay(d, y)) return t('backupAuto.yesterday', { time: hm(d) });
  return formatDateTime(at);
}

/** "Fri 13 Nov · 02:10" */
export const listDate = (at: number) => {
  const d = new Date(at);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${hm(d)}`;
};

/** "Tue 10 Nov" */
export const shortDate = (at: number) => {
  const d = new Date(at);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${formatCount(n)} ${many}`);

/** "1,204 entries · 318 photos" */
export const countsLabel = (c: { entries: number; photos: number }) => `${plural(c.entries, 'entry', 'entries')} · ${plural(c.photos, 'photo', 'photos')}`;

/** "24.3 MB" */
export function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Second line of a "Restore from backup" row. */
export const itemSub = (i: BackupListItem, ownTag?: string) =>
  `${i.counts ? countsLabel(i.counts) : sizeLabel(i.size)}${ownTag && i.tag && i.tag !== ownTag ? ' · another phone' : ''}`;
