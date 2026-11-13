import { router } from '@/services/router';
import { CloudUpload, Flag, Minus, Pause, Play, Plus, Settings, Square, Check, X } from '@/ui/icons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { entryCount, listEntries, totalsFor, unsortedCount } from '@/db/entriesRepo';
import type { TripRow } from '@/db/schema';
import { getActiveTrip, mileageTotals } from '@/db/tripsRepo';
import { KM_PER_MILE, metersToMiles } from '@/domain/mileage';
import { formatMoney } from '@/domain/money';
import { taxYearOf } from '@/domain/taxYear';
import { currencyOf, type Currency } from '@/domain/types';
import { weekLabel, weekOf } from '@/domain/week';
import { DownArrowArt, ReceiptCheckArt } from '@/features/entries/art';
import { EntryRow } from '@/features/entries/EntryRow';
import { durationLabel, greetingKey, milesLabel, sortMinutes } from '@/features/entries/format';
import { BACKUP_SNOOZE_MS, daysSince, showBackupBanner } from '@/features/entries/logic';
import { InterruptedTripCard } from '@/features/trips/TripCards';
import { useAppShortcuts } from '@/features/entries/quickActions';
import { useNow } from '@/features/entries/useNow';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Avatar, Button, Card, IconButton, Screen, SectionHeader, Txt } from '@/ui';

/** S-02 Home: greeting, backup banner, this week, to-sort, trip, recent; Expense / Income fixed above the tab bar. */
export default function HomeScreen() {
  const { settings, update } = useSettings();
  const now = useNow(30_000);
  useAppShortcuts();
  // Card text beside a button: with large text or a narrow screen the button drops below instead of squeezing the
  // text into a one-word column ("bu / siness", B-34).
  const { fontScale } = useWindowDimensions();
  const rowText = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 110 * Math.min(fontScale, 1.6) };

  const region = settings.region ?? 'UK';
  const currency = currencyOf(region);
  const week = weekOf(now);

  const data = useLive(
    () => ({
      count: entryCount(db),
      unsorted: unsortedCount(db),
      totals: totalsFor(db, week, 'work'),
      recent: listEntries(db, { limit: 5 }),
    }),
    [week.start],
    ['entries', 'receipts'],
  );
  const tripData = useLive(() => ({ miles: mileageTotals(db, week).work, trip: getActiveTrip(db) }), [week.start], ['trips']);
  const cats = useLive(() => listCategories(db, { includeHidden: true }), [], ['categories']);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const empty = data.count === 0;
  const banner = showBackupBanner(settings, data.count, now);

  const capture = (type: 'expense' | 'income') => router.push(`/capture?type=${type}&from=home`);

  return (
    <Screen
      title={t(`home.${greetingKey(now)}`)}
      subtitle={t('home.taxYear', { label: taxYearOf(now, region).label })}
      headerRight={<IconButton icon={Settings} label={t('home.settings')} filled onPress={() => router.push('/settings')} />}
      contentStyle={empty ? { flexGrow: 1 } : undefined}
      bottom={
        <>
          <Button label={t('home.newExpense')} icon={Minus} variant="expense" size="big" onPress={() => capture('expense')} accessibilityLabel={t('capture.quickExpense')} />
          <Button label={t('home.newIncome')} icon={Plus} variant="income" size="big" onPress={() => capture('income')} accessibilityLabel={t('capture.quickIncome')} />
        </>
      }>
      {banner ? (
        <BackupBanner
          lastBackupAt={settings.lastBackupAt}
          now={now}
          onBackup={() => router.push('/backup')}
          onHide={() => update({ backupBannerSnoozedUntil: now + BACKUP_SNOOZE_MS })}
        />
      ) : null}

      <InterruptedTripCard />
      {tripData.trip ? <TripCard trip={tripData.trip} now={now} unit={settings.distanceUnit} /> : null}

      <Card onPress={() => router.push({ pathname: '/reports', params: { from: String(week.start), to: String(week.end) } })} accessibilityLabel={t('home.thisWeek')} style={{ gap: 10 }}>
        <Txt v="label" c="textTertiary">
          {t('home.thisWeekLabel', { range: weekLabel(week) })}
        </Txt>
        <View>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {t('home.net')}
          </Txt>
          <Txt v="amount" c={empty ? 'textTertiary' : 'text'} style={{ fontSize: 36, lineHeight: 42 }} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(data.totals.netMinor, currency)}
          </Txt>
        </View>
        <StatRow
          items={[
            { label: t('home.in'), value: formatMoney(data.totals.incomeMinor, currency), c: empty ? 'textSecondary' : 'incomeText' },
            { label: t('home.out'), value: formatMoney(data.totals.expenseMinor, currency), c: empty ? 'textSecondary' : 'expenseText' },
            // Follows Settings → Distance unit like Miles / Reports (B-13).
            settings.distanceUnit === 'km'
              ? { label: t('home.businessKmLabel'), value: milesLabel(tripData.miles * KM_PER_MILE), c: empty ? 'textSecondary' : 'text' }
              : { label: t('home.businessMilesLabel'), value: milesLabel(tripData.miles), c: empty ? 'textSecondary' : 'text' },
          ]}
        />
      </Card>

      {!empty ? (
        data.unsorted > 0 ? (
          <Card variant="sun" style={styles.rowCard}>
            <View style={[rowText, { gap: 2 }]}>
              <Txt v="h2">{data.unsorted === 1 ? t('home.toSortOne') : t('home.toSort', { count: data.unsorted })}</Txt>
              <Txt v="small" c="sunText">
                {sortMinutes(data.unsorted) === 1 ? t('home.toSortSubOne') : t('home.toSortSub', { minutes: sortMinutes(data.unsorted) })}
              </Txt>
            </View>
            <Button label={t('home.sortNow')} size="sm" onPress={() => router.navigate('/sort')} />
          </Card>
        ) : (
          <Card style={styles.rowCard}>
            <Avatar kind="income" icon={Check} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t('home.allSorted')}</Txt>
              <Txt v="small" c="textSecondary">
                {t('home.allSortedSub')}
              </Txt>
            </View>
          </Card>
        )
      ) : null}

      {!tripData.trip ? (
        <Card style={styles.rowCard}>
          <Avatar kind="work" icon={Flag} />
          <Txt v="small" c="textSecondary" style={rowText}>
            {t('home.startTripSub')}
          </Txt>
          <Button label={t('home.startTrip')} variant="outline" size="sm" onPress={() => router.push('/trip/active?start=1')} />
        </Card>
      ) : null}

      {empty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 6 }}>
          <ReceiptCheckArt />
          <Txt v="h2" center>
            {t('home.emptyFirst')}
          </Txt>
          <DownArrowArt />
        </View>
      ) : (
        <>
          <SectionHeader title={t('home.recent')} action={t('home.seeAll')} onAction={() => router.navigate('/entries')} />
          <Card style={{ paddingVertical: 0, paddingHorizontal: 14 }}>
            {data.recent.map((e, i) => (
              <EntryRow
                key={e.id}
                variant="home"
                entry={e}
                category={e.categoryId ? catById.get(e.categoryId) : undefined}
                currency={e.currency as Currency}
                divider={i > 0}
                onPress={() => router.push(`/entry/${e.id}`)}
              />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function StatRow({ items }: { items: { label: string; value: string; c: 'text' | 'incomeText' | 'expenseText' | 'textSecondary' }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flex: 1, minWidth: 0 }}>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }} numberOfLines={2} maxFontSizeMultiplier={1.6}>
            {it.label}
          </Txt>
          <Txt v="amount" c={it.c} size={17} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function BackupBanner({ lastBackupAt, now, onBackup, onHide }: { lastBackupAt: number | null; now: number; onBackup: () => void; onHide: () => void }) {
  const { colors } = useTheme();
  return (
    <Card variant="warn" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 6 }}>
      <CloudUpload size={24} color={colors.expenseText} />
      <View style={{ flex: 1 }}>
        <Txt style={{ fontFamily: fonts.bold }}>
          {lastBackupAt === null ? t('home.backupNever') : t('home.backupDays', { days: daysSince(lastBackupAt, now) })}
        </Txt>
        <Pressable accessibilityRole="link" onPress={onBackup} hitSlop={8} style={{ minHeight: 28, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.expenseText, textDecorationLine: 'underline' }}>{t('home.backupNow')}</Txt>
        </Pressable>
      </View>
      <IconButton icon={X} label={t('home.hideBanner')} onPress={onHide} />
    </Card>
  );
}

/** Running / paused GPS trip. Buttons only navigate; the trip screen does the work. */
function TripCard({ trip, now, unit }: { trip: TripRow; now: number; unit: 'mi' | 'km' }) {
  const miles = metersToMiles(trip.distanceM);
  const dist = unit === 'km' ? t('common.km', { km: (trip.distanceM / 1000).toFixed(1) }) : t('common.miles', { miles: miles.toFixed(1) });
  const paused = trip.status === 'paused';
  return (
    <Card variant="navy" onPress={() => router.push('/trip/active')} accessibilityLabel={paused ? t('home.paused') : t('home.tripRunning', { miles: dist, duration: durationLabel(now - trip.startedAt) })} style={{ gap: 14, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {paused ? (
          <Pause size={16} color="#F5B841" />
        ) : (
          <View style={styles.redDot} />
        )}
        <Txt style={{ color: '#fff', fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.84 }}>
          {paused ? t('home.paused') : t('home.tripRunningLabel')}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14 }}>
        <Txt v="amount" style={{ color: '#fff', fontSize: 44, lineHeight: 48 }}>
          {dist}
        </Txt>
        <Txt style={{ color: '#C8D0DE' }}>{durationLabel(now - trip.startedAt)}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {paused ? (
          <NavyButton icon={Play} label={t('home.resume')} onPress={() => router.push('/trip/active?action=resume')} />
        ) : (
          <NavyButton icon={Pause} label={t('home.personalStop')} onPress={() => router.push('/trip/active?action=pause')} />
        )}
        <Button label={t('home.endTrip')} icon={Square} variant="sun" size="sm" style={{ flex: 1 }} onPress={() => router.push('/trip/active?action=end')} />
      </View>
    </Card>
  );
}

function NavyButton({ icon: Icon, label, onPress }: { icon: typeof Play; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.navyBtn, pressed && { opacity: 0.8 }]}>
      <Icon size={20} color="#fff" />
      <Txt maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ color: '#fff', fontSize: 15, fontFamily: fonts.bold }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  redDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5A4E', borderWidth: 3, borderColor: 'rgba(255,90,78,0.35)' },
  navyBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#5B6788',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
});
