import { totalsFor, unsortedCount } from '@/db/entriesRepo';
import { getSettings } from '@/db/settingsRepo';
import { getActiveTrip } from '@/db/tripsRepo';
import type { AppDb } from '@/db/types';
import { formatMoney } from '@/domain/money';
import { currencyOf } from '@/domain/types';
import { weekOf } from '@/domain/week';
import { formatDistance } from '@/features/trips/format';
import { t } from '@/i18n';

/** Everything a home-screen widget shows, already formatted (shared by Android and iOS). */
export interface WidgetSnapshot {
  /** False before onboarding / when the DB can't be read: widget shows "Open Sunday Sort to set up". */
  ready: boolean;
  toSort: number;
  toSortText: string;
  netText: string;
  weekLine: string;
  trip: 'none' | 'running' | 'paused';
  tripDistance: string;
}

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  ready: false,
  toSort: 0,
  toSortText: '',
  netText: '',
  weekLine: t('widget.setup'),
  trip: 'none',
  tripDistance: '',
};

/** This week (Mon–Sun): unsorted count, net (work entries, like Home), running trip. */
export function widgetSnapshot(db: AppDb, now = Date.now()): WidgetSnapshot {
  try {
    const s = getSettings(db);
    if (!s.onboarded || !s.region) return EMPTY_SNAPSHOT;
    const week = weekOf(now);
    const toSort = unsortedCount(db, week);
    const net = totalsFor(db, week, 'work').netMinor;
    const netText = formatMoney(net, currencyOf(s.region));
    const trip = getActiveTrip(db);
    const toSortText = toSort > 0 ? t('widget.toSort', { count: toSort > 99 ? '99+' : toSort }) : t('widget.allSorted');
    return {
      ready: true,
      toSort,
      toSortText,
      netText,
      weekLine: `${t('widget.weekNet', { amount: netText })} · ${toSortText}`,
      trip: trip ? (trip.status === 'paused' ? 'paused' : 'running') : 'none',
      tripDistance: trip ? formatDistance(trip.distanceM, s.distanceUnit) : '',
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/** Deep links the widget buttons open (expo-router paths under the `sundaysort://` scheme). */
export const WIDGET_LINKS = {
  expense: 'sundaysort://capture?type=expense',
  income: 'sundaysort://capture?type=income',
  startTrip: 'sundaysort://trip/active?start=1',
  endTrip: 'sundaysort://trip/active?action=end',
  open: 'sundaysort://',
} as const;
