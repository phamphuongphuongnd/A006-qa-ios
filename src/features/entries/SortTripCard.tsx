import { Home, MapPin, SkipForward, Split, Truck } from '@/ui/icons';
import { useRef, useState, type ComponentRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { tripPointsOf } from '@/db/tripsRepo';
import type { Scope } from '@/domain/types';
import { distanceValue, formatClock, formatDay, type DistanceUnit } from '@/features/trips/format';
import { RouteSketch } from '@/features/trips/RouteSketch';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Badge, Button, Card, Txt } from '@/ui';

/**
 * S-06 trip card (P1-2): an automatic trip the app couldn't classify. One tap "Work" / "Personal" = done;
 * "Split trip" opens the trip (S-07c) to cut off a Personal segment.
 */
export function SortTripCard({
  trip,
  unit,
  stacked,
  onSort,
  onSkip,
}: {
  trip: TripRow;
  unit: DistanceUnit;
  stacked: boolean;
  onSort: (scope: Scope) => void;
  onSkip: () => void;
}) {
  const { colors, dark } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const points = useLive(() => tripPointsOf(db, trip.id), [trip.id], ['trip_points']);
  const value = distanceValue(trip.distanceM, unit);
  const end = trip.endedAt ?? trip.lastPointAt ?? trip.startedAt;

  const go = (to: number, after: () => void) => {
    if (busy.current) return;
    busy.current = true;
    Animated.timing(x, { toValue: to, duration: 200, useNativeDriver: true }).start(after);
  };
  const sort = (scope: Scope) => go(-480, () => onSort(scope));
  const skip = () =>
    go(480, () => {
      busy.current = false;
      x.setValue(0);
      onSkip();
    });

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: stacked ? 16 : 0, bottom: 0 }, { transform: [{ translateX: x }] }]}>
      <Card style={[styles.card, { shadowColor: '#161D2B' }]}>
        {/* B-43: when the card scrolls, show it (Android keeps the bar; iOS flashes it once the content is taller). */}
        <ScrollView
          nestedScrollEnabled
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          persistentScrollbar
          onContentSizeChange={() => scrollRef.current?.flashScrollIndicators()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color={colors.text} />
            <Txt style={{ fontSize: 15, fontFamily: fonts.bold }}>{t('sortV2.trip')}</Txt>
            {trip.startedBy === 'auto' ? <Badge kind="auto" label={t('sortV2.autoLabel')} /> : null}
            {trip.source === 'gap' ? <Badge kind="neutral" label={t('tripCheck.estimated')} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt v="amount" style={{ fontSize: 44, lineHeight: 50 }}>
              {value.toFixed(1)}
            </Txt>
            <Txt style={{ fontSize: 22, fontFamily: fonts.bold }} c="textSecondary">
              {unit}
            </Txt>
          </View>
          <Txt v="h3">{t('sortV2.tripWhen', { day: formatDay(trip.startedAt), from: formatClock(trip.startedAt), to: formatClock(end) })}</Txt>
          {points.length > 1 ? (
            <View style={[styles.sketch, { backgroundColor: dark ? colors.background : colors.surfaceAlt }]}>
              <RouteSketch points={points} height={150} live={false} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <BigScope label={t('common.work')} icon={Truck} bg={colors.workFill} onPress={() => sort('work')} />
            <BigScope label={t('common.personal')} icon={Home} bg={colors.personalFill} onPress={() => sort('personal')} />
          </View>
        </ScrollView>
        {/* B-43: pinned under the scrolling part — the route sketch never pushes it out of sight. */}
        <View testID="sort-card-actions" style={styles.footer}>
          <Button label={t('sortV2.splitTrip')} icon={Split} variant="text" size="sm" onPress={() => router.push(`/trip/${trip.id}`)} />
          <Button label={t('sort.skip')} icon={SkipForward} variant="text" size="sm" onPress={skip} />
        </View>
      </Card>
    </Animated.View>
  );
}

function BigScope({ label, icon: Icon, bg, onPress }: { label: string; icon: typeof Truck; bg: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.big, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }]}>
      <Icon size={24} color={colors.onScope} />
      <Txt style={{ fontSize: 18, fontFamily: fonts.bold, color: colors.onScope }}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 0, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 6 },
  body: { flexGrow: 1, gap: 14, padding: 20, paddingBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  sketch: { height: 150, borderRadius: 16, overflow: 'hidden' },
  big: { flex: 1, minHeight: 64, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
