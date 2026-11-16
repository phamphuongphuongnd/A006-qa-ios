import { router } from '@/services/router';
import { ChevronDown, ChevronRight, Flag, Gauge, LocateFixed, MapPin, MoreHorizontal, Plus, Smartphone, Truck } from '@/ui/icons';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { businessTripMiles, listTrips, mileageTotals, routeTitle } from '@/db/tripsRepo';
import { formatRate, mileageEstimateByDate, periodsIn } from '@/domain/mileage';
import { formatMoney } from '@/domain/money';
import { taxYearFor, taxYearOf } from '@/domain/taxYear';
import { currencyOf, type Region, type Scope } from '@/domain/types';
import { setTripScope, restoreTripScope } from '@/features/trips/auto/repo';
import { autoTripState } from '@/features/trips/autoState';
import { formatClock, formatDay, formatDistance, groupByMonth, type DistanceUnit } from '@/features/trips/format';
import { sweepThumbs } from '@/features/trips/map/thumbs';
import { TripThumb } from '@/features/trips/map/TripThumb';
import { TripSwipeRow } from '@/features/trips/TripSwipeRow';
import { refreshWidgets } from '@/features/widgets/refresh';
import { usePro } from '@/state/pro';
import { useLocationPermission } from '@/features/trips/hooks';
import { ActiveTripCard, InterruptedTripCard } from '@/features/trips/TripCards';
import { CaptureFab } from '@/features/entries/CaptureFab';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Badge, Button, Card, Chip, ChipRow, Divider, IconButton, Screen, Sheet, StatusDot, Tag, Txt, useSnackbar } from '@/ui';

/** S-07 Miles: tax-year totals + estimate, running trip, trips by month. */
/** Trip rows drawn per step while scrolling Miles. */
const ROWS_STEP = 30;

/** Months with only the first `limit` trip rows across them (`items` stays whole for the month total). */
function visibleMonths<M extends { items: TripRow[] }>(months: M[], limit: number): (M & { rows: TripRow[] })[] {
  const out: (M & { rows: TripRow[] })[] = [];
  let left = limit;
  for (const m of months) {
    if (left <= 0) break;
    const rows = m.items.slice(0, left);
    left -= rows.length;
    out.push({ ...m, rows });
  }
  return out;
}

export default function MilesScreen() {
  const { settings } = useSettings();
  const region: Region = settings.region ?? 'UK';
  const unit = settings.distanceUnit;
  const [currentYear] = useState(() => taxYearOf(Date.now(), region).startYear);
  const [startYear, setStartYear] = useState(currentYear);
  const [pickYear, setPickYear] = useState(false);
  const year = taxYearFor(startYear, region);
  const [perm, requestPerm] = useLocationPermission();
  const { colors } = useTheme();
  const { pro } = usePro();
  const auto = autoTripState(settings, pro);
  const [menu, setMenu] = useState(false);
  const snack = useSnackbar();
  // Swipe right = Work, left = Personal, with Undo (F-13).
  const onScope = (trip: TripRow, scope: Scope) => {
    if (trip.scope === scope) return;
    const prev = setTripScope(db, trip.id, scope);
    refreshWidgets().catch(() => {});
    if (!prev) return;
    snack({
      message: scope === 'work' ? t('autoTrip.markedWork') : t('autoTrip.markedPersonal'),
      actionLabel: t('autoTrip.undo'),
      onAction: () => restoreTripScope(db, trip.id, prev),
    });
  };

  const allTrips = useLive(() => listTrips(db), [], ['trips']);
  const trips = useMemo(
    () => allTrips.filter((x) => x.startedAt >= year.start && x.startedAt < year.end && x.status !== 'running' && x.status !== 'paused'),
    [allTrips, year.start, year.end],
  );
  const totals = useLive(() => mileageTotals(db, year), [year.start, year.end], ['trips']);
  const business = useLive(() => businessTripMiles(db, year), [year.start, year.end], ['trips']);
  const years = useMemo(() => {
    const set = new Set<number>([currentYear, startYear]);
    for (const x of allTrips) set.add(taxYearOf(x.startedAt, region).startYear);
    return [...set].sort((a, b) => b - a);
  }, [allTrips, region, startYear, currentYear]);

  const denied = perm?.status === 'denied';
  const onAllow = async () => {
    if (perm?.canAskAgain) {
      const r = await requestPerm();
      if (!r.granted && !r.canAskAgain) await Linking.openSettings();
    } else await Linking.openSettings();
  };

  const rates = settings.mileageRates[region];
  const estimate = mileageEstimateByDate(business, rates);
  const shownRates = [...new Set(periodsIn(rates, year.start, year.end).flatMap((p) => p.tiers.map((x) => formatRate(x.minorPerMile, currencyOf(region)))))];
  const rateText = region === 'UK' ? t('miles.hmrcRates', { rates: shownRates.join(' / ') }) : t('miles.irsRate', { rate: shownRates.join(' / ') });
  const empty = trips.length === 0;
  // Trip rows are drawn in steps of ROWS_STEP as the list scrolls (a year can hold hundreds); month totals use all trips.
  const [shown, setShown] = useState({ year: startYear, n: ROWS_STEP });
  const shownN = shown.year === startYear ? shown.n : ROWS_STEP;
  const months = useMemo(() => visibleMonths(groupByMonth(trips, (x) => x.startedAt), shownN), [trips, shownN]);
  const showMore = () => {
    if (shownN < trips.length) setShown({ year: startYear, n: shownN + ROWS_STEP });
  };
  // Map thumbnails of deleted / edited trips go once the list has settled (Q25).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sweepThumbs();
      } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [allTrips]);
  const hasMaps = trips.some((x) => x.source === 'gps');

  return (
    <Screen
      header={
        <View style={[styles.top, { paddingHorizontal: GUTTER }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('miles.title')} ${t('miles.header', { label: year.label })}`}
            onPress={() => setPickYear(true)}
            style={styles.flex}>
            <Txt v="h1" accessibilityRole="header">
              {t('miles.title')}
            </Txt>
            <Txt v="small" c="textSecondary" style={{ marginLeft: 6 }}>
              {t('miles.header', { label: year.label })}
            </Txt>
            <ChevronDown size={20} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <IconButton icon={MoreHorizontal} label={t('autoTrip.menu')} onPress={() => setMenu(true)} />
        </View>
      }
      contentStyle={empty ? { flexGrow: 1 } : undefined}
      fab={<CaptureFab />}
      onEndReached={showMore}>
      <InterruptedTripCard />
      {denied ? <DeniedCard onAllow={onAllow} /> : null}
      <ActiveTripCard />
      {auto !== 'off' ? (
        <Card style={[styles.flex, { gap: 12 }]} onPress={() => router.push('/trip/auto')}>
          <View style={{ flex: 1, gap: 2 }}>
            <StatusDot kind={auto === 'on' ? 'ok' : 'warn'} label={auto === 'on' ? t('homeV2.autoOn') : t('homeV2.autoPaused')} />
            {auto === 'on' ? (
              <Txt v="small" c="textSecondary">
                {t('homeV2.autoOnSub')}
              </Txt>
            ) : null}
          </View>
          {auto === 'paused' ? <Button label={t('homeV2.fix')} variant="outline" size="sm" onPress={() => router.push('/trip/battery')} /> : null}
        </Card>
      ) : null}

      {!empty ? (
        <>
          <TotalsCard work={totals.work} personal={totals.personal} unit={unit} estimate={estimate} region={region} rateText={rateText} />
          <ActionButtons />
          {months.map((m) => (
            <View key={m.key} style={{ gap: 10 }}>
              <View style={styles.gh}>
                <Txt v="label" c="textSecondary">
                  {m.label}
                </Txt>
                <Txt v="small" style={{ fontFamily: fonts.bold }}>
                  {formatDistance(
                    m.items.reduce((s, x) => s + x.distanceM, 0),
                    unit,
                    0,
                  )}
                </Txt>
              </View>
              <Card style={{ paddingVertical: 0, paddingHorizontal: 14 }}>
                {m.rows.map((trip, i) => (
                  <TripSwipeRow key={trip.id} onScope={(sc) => onScope(trip, sc)}>
                    <TripRowView trip={trip} unit={unit} divider={i > 0} />
                  </TripSwipeRow>
                ))}
              </Card>
            </View>
          ))}
          {hasMaps ? (
            <Txt v="fine" c="textTertiary" center>
              {t('autoTrip.map.listAttribution')}
            </Txt>
          ) : null}
        </>
      ) : (
        <>
          {!denied ? <ActionButtons /> : null}
          <EmptyArt />
          {denied ? <Button label={t('miles.addManually')} variant="outline" icon={Plus} full onPress={() => router.push('/trip/new')} /> : null}
        </>
      )}

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <MenuRow
          icon={Truck}
          label={t('autoTrip.title')}
          right={!pro ? <Badge kind="pro" label={t('pro.badge')} /> : null}
          onPress={() => {
            setMenu(false);
            router.push('/trip/auto');
          }}
        />
        <Divider />
        <MenuRow
          icon={Smartphone}
          label={t('autoTrip.nfcTitle')}
          onPress={() => {
            setMenu(false);
            router.push('/trip/nfc');
          }}
        />
      </Sheet>

      <Sheet visible={pickYear} onClose={() => setPickYear(false)} title={t('miles.pickYear')}>
        <ChipRow>
          {years.map((y) => (
            <Chip
              key={y}
              label={taxYearFor(y, region).label}
              state={y === startYear ? 'on' : 'default'}
              onPress={() => {
                setStartYear(y);
                setPickYear(false);
              }}
            />
          ))}
        </ChipRow>
      </Sheet>
    </Screen>
  );
}

function ActionButtons() {
  // Side by side when both labels fit, otherwise stacked full width (320dp screens, large text: B-22 / B-24).
  const { fontScale } = useWindowDimensions();
  const btn = { flexGrow: 1, flexBasis: 0, minWidth: 180 * Math.min(fontScale, 1.6) };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Button label={t('miles.startTrip')} icon={Flag} style={btn} onPress={() => router.push('/trip/active?start=1')} />
      <Button label={t('miles.addManually')} icon={Plus} variant="outline" style={btn} onPress={() => router.push('/trip/new')} />
    </View>
  );
}

function TotalsCard({
  work,
  personal,
  unit,
  estimate,
  region,
  rateText,
}: {
  work: number;
  personal: number;
  unit: DistanceUnit;
  estimate: number;
  region: Region;
  rateText: string;
}) {
  const toM = (mi: number) => mi * 1609.344;
  return (
    <Card style={{ gap: 10 }}>
      <Txt v="label" c="textSecondary">
        {t('miles.businessLabel')}
      </Txt>
      <Txt v="amount" size={44} style={{ lineHeight: 50 }} accessibilityLabel={t('miles.business', { miles: formatDistance(toM(work), unit, 0) })}>
        {formatDistance(toM(work), unit, 0)}
      </Txt>
      <View style={[styles.flex, { gap: 8 }]}>
        <Tag kind="personal" label={t('common.personal')} />
        <Txt v="small" c="textSecondary">
          {formatDistance(toM(personal), unit, 0)}
        </Txt>
      </View>
      <Divider />
      <Txt v="body" style={{ fontFamily: fonts.bold }}>
        {t('miles.estimateAmount', { amount: formatMoney(estimate, currencyOf(region)) })}{' '}
        <Txt v="body" c="textSecondary" style={{ fontFamily: fonts.medium }}>
          {t('miles.estimateAt', { rates: rateText })}
        </Txt>
      </Txt>
      <Txt v="caption" c="textTertiary">
        {t('common.estimateOnly')}
      </Txt>
    </Card>
  );
}

function TripRowView({ trip, unit, divider }: { trip: TripRow; unit: DistanceUnit; divider: boolean }) {
  const { colors } = useTheme();
  const gps = trip.source === 'gps';
  const Icon = gps ? LocateFixed : Gauge;
  const personal = trip.scope === 'personal';
  const tint = personal ? colors.personal : gps ? colors.work : colors.textSecondary;
  const bg = trip.scope === 'unsorted' ? colors.sunSoft : personal ? colors.personalSoft : gps ? colors.workSoft : colors.surfaceAlt;
  const title = t('miles.rowLabel', { date: formatDay(trip.startedAt), distance: formatDistance(trip.distanceM, unit) });
  const ab = routeTitle(trip);
  const how = ab
    ? t('autoTrip.route.mode')
    : !gps
      ? t('autoTrip.manual')
      : trip.startedBy === 'auto'
        ? t('autoTrip.auto')
        : trip.startedBy === 'nfc'
          ? t('autoTrip.nfc')
          : t('autoTrip.gps');
  const times = gps && trip.endedAt ? `${formatClock(trip.startedAt)}–${formatClock(trip.endedAt)}` : '';
  const sub = [times, ab ?? how, ab && trip.roundTrip ? t('autoTrip.route.roundTag') : '', trip.purpose].filter(Boolean).join(' · ');
  const scopeLabel = trip.scope === 'unsorted' ? t('autoTrip.unsorted') : personal ? t('common.personal') : t('common.work');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}. ${scopeLabel}${trip.edited ? `. ${t('miles.edited')}` : ''}. ${t('autoTrip.swipeHint')}`}
      onPress={() => router.push(`/trip/${trip.id}`)}
      style={({ pressed }) => [styles.li, divider && { borderTopWidth: 1, borderTopColor: colors.line }, pressed && { opacity: 0.7 }]}>
      {gps ? (
        <TripThumb
          trip={trip}
          placeholder={
            <View style={[styles.av, { backgroundColor: bg }]}>
              <Icon size={22} color={tint} strokeWidth={2} />
            </View>
          }
        />
      ) : (
        <View style={[styles.av, { backgroundColor: bg }]}>
          <Icon size={22} color={tint} strokeWidth={2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="h3" numberOfLines={1}>
          {title}
        </Txt>
        <View style={[styles.flex, { gap: 6 }]}>
          <Txt v="small" c="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {sub}
          </Txt>
          {trip.edited ? <Badge kind="neutral" label={t('miles.edited')} /> : null}
        </View>
      </View>
      {trip.scope === 'unsorted' ? <Badge kind="unsorted" label={scopeLabel} /> : <Tag kind={personal ? 'personal' : 'work'} label={scopeLabel} />}
    </Pressable>
  );
}

function MenuRow({ icon: Icon, label, right, onPress }: { icon: typeof Truck; label: string; right?: React.ReactNode; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.li, pressed && { opacity: 0.7 }]}>
      <Icon size={22} color={colors.textSecondary} strokeWidth={2} />
      <Txt v="body" style={{ flex: 1 }}>
        {label}
      </Txt>
      {right ?? <ChevronRight size={20} color={colors.textTertiary} />}
    </Pressable>
  );
}

function DeniedCard({ onAllow }: { onAllow: () => void }) {
  const { colors } = useTheme();
  return (
    <Card variant="warn" style={{ gap: 10 }}>
      <View style={[styles.flex, { alignItems: 'flex-start', gap: 10 }]}>
        <MapPin size={24} color={colors.expenseText} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">{t('miles.deniedTitle')}</Txt>
          <Txt v="small" c="textSecondary">
            {t('miles.deniedSub')}
          </Txt>
        </View>
      </View>
      <View style={[styles.flex, { gap: 10 }]}>
        <Button label={t('miles.allow')} size="sm" onPress={onAllow} />
        <Button label={t('miles.addManually')} size="sm" variant="outline" onPress={() => router.push('/trip/new')} />
      </View>
    </Card>
  );
}

function EmptyArt() {
  const { colors, dark } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 40, paddingTop: 20 }}>
      <Svg width={180} height={120} viewBox="0 0 180 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d="M20 100c30-10 40-60 80-50s40-30 60-40" fill="none" stroke={colors.lineStrong} strokeDasharray="2 10" strokeLinecap="round" strokeWidth={4} />
        <Circle cx={20} cy={100} r={9} fill={colors.background} stroke={dark ? colors.text : '#1F2A44'} strokeWidth={3} />
        <Path d="M160 4c-10 0-17 7-17 16 0 12 17 26 17 26s17-14 17-26c0-9-7-16-17-16z" fill="#F5B841" stroke="#1F2A44" strokeWidth={3} />
        <Circle cx={160} cy={20} r={5} fill="#1F2A44" />
      </Svg>
      <Txt v="h2" center accessibilityRole="header">
        {t('miles.empty')}
      </Txt>
      <Txt v="body" c="textSecondary" center style={{ maxWidth: 280 }}>
        {t('miles.emptySub')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingBottom: 6, minHeight: 62 },
  flex: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 10 },
  av: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
