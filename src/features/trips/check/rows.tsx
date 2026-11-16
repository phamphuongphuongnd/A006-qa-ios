import { forwardRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import type { OdometerReadingRow } from '@/db/schema';
import { metersToMiles } from '@/domain/mileage';
import { dayMonth, milesLabel } from '@/features/entries/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { fonts, useTheme } from '@/theme';
import { Button, Txt, useSnackbar } from '@/ui';
import { Gauge, MapPin } from '@/ui/icons';

import { formatDistance, type DistanceUnit } from '../format';
import type { TripGap } from './gaps';
import type { GapDistance } from './hooks';
import type { OdometerResult } from './odometer';
import { answerGap, unanswerGap } from './repo';

/** Route to S-08 prefilled from a gap (Unsorted, source = gap, "Estimated"). */
export function openGapAdd(g: TripGap, d: GapDistance) {
  router.push({
    pathname: '/trip/new',
    params: { gap: g.key, gapMiles: String(Math.round(metersToMiles(d.meters) * 10) / 10), from: String(g.from), to: String(g.to) },
  });
}

/**
 * F-13 (Q26): dashed row between the two trips — "Missing trip? ≈ 6.2 mi · Depot → Tesco Extra" · "Add" / "Not a trip".
 * Not swipeable. `ref` lets Miles scroll to it ("Review" on the Home card).
 */
export const GapRow = forwardRef<ComponentRef<typeof View>, { gap: TripGap; distance: GapDistance; labels: { from: string; to: string }; unit: DistanceUnit }>(
  function GapRow({ gap, distance, labels, unit }, ref) {
    const { colors } = useTheme();
    const snack = useSnackbar();
    const dist = formatDistance(distance.meters, unit);
    const amount = distance.routed ? t('tripCheck.gapRouted', { distance: dist }) : t('tripCheck.gapEstimate', { distance: dist });
    const sub = `${amount} · ${t('tripCheck.gapBetween', labels)}`;
    const notATrip = () => {
      answerGap(db, gap.prevId, gap.nextId, 'dismissed');
      snack({ message: t('tripCheck.notATripDone'), actionLabel: t('tripCheck.undo'), onAction: () => unanswerGap(db, gap.nextId) });
    };
    return (
      <View ref={ref} style={[styles.gap, { borderColor: colors.lineStrong }]}>
        <View
          accessible
          accessibilityLabel={t('tripCheck.gapA11y', { distance: dist, ...labels })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.av, { borderColor: colors.lineStrong }]}>
            <MapPin size={20} color={colors.textSecondary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt v="h3">{t('tripCheck.gapTitle')}</Txt>
            <Txt v="small" c="textSecondary" numberOfLines={2}>
              {sub}
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 56 }}>
          <Button label={t('tripCheck.add')} size="sm" onPress={() => openGapAdd(gap, distance)} />
          <Button label={t('tripCheck.notATrip')} size="sm" variant="text" onPress={notATrip} />
        </View>
      </View>
    );
  },
);

/** Short status for a reading row / sheet. */
export function readingStatus(r: OdometerResult, unit: DistanceUnit): { text: string; tone: 'ok' | 'warn' | 'plain' } {
  const d = (mi: number) => formatDistance(mi * 1609.344, unit, 0);
  switch (r.kind) {
    case 'start':
      return { text: t('tripCheck.odoRowStart'), tone: 'plain' };
    case 'match':
      return { text: t('tripCheck.odoRowMatch'), tone: 'ok' };
    case 'missing':
      return { text: t('tripCheck.odoRowMissing', { distance: d(r.diffMiles) }), tone: 'warn' };
    case 'over':
      return { text: t('tripCheck.odoRowOver', { distance: d(r.diffMiles) }), tone: 'warn' };
  }
}

/** "48,210" in the unit it was typed in. */
export const readingValue = (r: Pick<OdometerReadingRow, 'value'>) => milesLabel(r.value);

/** F-13 (Q27): marker row "Odometer 48,210 · 1 Nov" + "✓ matches" / "114 mi not logged". Tap → the reading. */
export function OdometerRow({ reading, result, unit, divider }: { reading: OdometerReadingRow; result: OdometerResult; unit: DistanceUnit; divider: boolean }) {
  const { colors } = useTheme();
  const title = t('tripCheck.odoRow', { value: readingValue(reading), date: dayMonth(reading.readAt) });
  const st = readingStatus(result, unit);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${st.text}`}
      onPress={() => router.push({ pathname: '/trip/odometer', params: { id: reading.id } })}
      style={({ pressed }) => [styles.li, divider && { borderTopWidth: 1, borderTopColor: colors.line }, pressed && { opacity: 0.7 }]}>
      <View style={[styles.av, { borderStyle: 'solid', borderWidth: 0, backgroundColor: colors.surfaceAlt }]}>
        <Gauge size={20} color={colors.textSecondary} strokeWidth={2} />
      </View>
      <Txt v="body" style={{ flex: 1, fontFamily: fonts.semibold }} numberOfLines={1}>
        {title}
      </Txt>
      <Txt v="small" c={st.tone === 'ok' ? 'incomeText' : st.tone === 'warn' ? 'expenseText' : 'textSecondary'} style={{ fontFamily: fonts.bold }}>
        {st.text}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 12, gap: 8, marginVertical: 8 },
  av: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
});
