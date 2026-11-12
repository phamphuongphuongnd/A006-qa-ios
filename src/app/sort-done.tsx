import { router, useLocalSearchParams } from 'expo-router';
import { CloudUpload } from '@/ui/icons';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { entryCount, totalsFor } from '@/db/entriesRepo';
import { mileageTotals } from '@/db/tripsRepo';
import { formatMoney } from '@/domain/money';
import { currencyOf } from '@/domain/types';
import { weekOf } from '@/domain/week';
import { SunDoneArt } from '@/features/entries/art';
import { milesLabel } from '@/features/entries/format';
import { backupDue, daysSince } from '@/features/entries/logic';
import { useNow } from '@/features/entries/useNow';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Card, Txt } from '@/ui';

/** S-06c Week sorted. Param `week` = week start (ms). Shows the week's work totals and a backup nudge when due. */
export default function SortDoneScreen() {
  const params = useLocalSearchParams<{ week?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const now = useNow();
  const currency = currencyOf(settings.region ?? 'UK');
  const week = weekOf(params.week ? Number(params.week) : now);

  const data = useLive(
    () => ({
      totals: totalsFor(db, week, 'work'),
      miles: mileageTotals(db, week).work,
      count: entryCount(db),
    }),
    [week.start],
    ['entries', 'trips'],
  );
  const showBackup = backupDue(settings, data.count, now);

  const done = () => (router.canGoBack() ? router.back() : router.replace('/sort'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 72, paddingBottom: 20, gap: 18, alignItems: 'center' }}>
        <SunDoneArt />
        <Txt v="h1" accessibilityRole="header" center style={{ fontSize: 34, lineHeight: 40 }}>
          {t('sort.weekSorted')}
        </Txt>
        <Card style={{ alignSelf: 'stretch', flexDirection: 'row', gap: 6 }}>
          <Stat label={t('sort.inLabel')} value={formatMoney(data.totals.incomeMinor, currency)} c="incomeText" />
          <Stat label={t('sort.outLabel')} value={formatMoney(data.totals.expenseMinor, currency)} c="expenseText" />
          <Stat label={t('sort.businessLabel')} value={t('common.miles', { miles: milesLabel(data.miles) })} c="text" />
        </Card>
        {showBackup ? (
          <Card variant="sun" style={{ alignSelf: 'stretch', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CloudUpload size={24} color={colors.text} />
              <Txt v="h3">{t('sort.backupTitle')}</Txt>
            </View>
            <Txt v="small" c="sunText">
              {settings.lastBackupAt === null ? t('sort.backupNever') : t('sort.backupDays', { days: daysSince(settings.lastBackupAt, now) })}
            </Txt>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button label={t('sort.backupNow')} size="sm" onPress={() => router.push('/backup')} />
            </View>
          </Card>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 20, paddingTop: 8 }}>
        <Button label={t('common.done')} variant="outline" full onPress={done} />
      </View>
    </View>
  );
}

function Stat({ label, value, c }: { label: string; value: string; c: 'incomeText' | 'expenseText' | 'text' }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {label}
      </Txt>
      <Txt v="amount" c={c} size={18} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}
