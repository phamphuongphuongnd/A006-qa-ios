import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { CloudUpload } from '@/ui/icons';
import { Zap } from '@/features/rules/icons';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { totalsFor } from '@/db/entriesRepo';
import { mileageTotals } from '@/db/tripsRepo';
import { formatMoney } from '@/domain/money';
import { currencyOf } from '@/domain/types';
import { weekOf } from '@/domain/week';
import { SunDoneArt } from '@/features/entries/art';
import { milesLabel } from '@/features/entries/format';
import { useNow } from '@/features/entries/useNow';
import { autoCounts } from '@/features/rules/repo';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Card, Txt } from '@/ui';

/**
 * S-06c Week sorted. Param `week` = week start (ms). The week's work totals, "9 auto-sorted · 2 recurring entries
 * added", and a nudge to turn on nightly backup while it is off.
 */
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
      auto: autoCounts(db, week),
    }),
    [week.start],
    ['entries', 'trips'],
  );
  const autoText =
    data.auto.auto > 0 && data.auto.recurring > 0
      ? t('sortV2.autoAndRecurring', data.auto)
      : data.auto.auto > 0
        ? t('sortV2.autoOnly', data.auto)
        : data.auto.recurring > 0
          ? t('sortV2.recurringOnly', data.auto)
          : null;

  const done = () => (router.canGoBack() ? router.back() : router.replace('/sort'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 72, paddingBottom: 20, gap: 18, alignItems: 'center' }}>
        <SunDoneArt />
        <Txt v="h1" accessibilityRole="header" center style={{ fontSize: 34, lineHeight: 40 }}>
          {t('sort.weekSorted')}
        </Txt>
        <Card style={{ alignSelf: 'stretch', gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Stat label={t('sort.inLabel')} value={formatMoney(data.totals.incomeMinor, currency)} c="incomeText" />
            <Stat label={t('sort.outLabel')} value={formatMoney(data.totals.expenseMinor, currency)} c="expenseText" />
          </View>
          <Stat label={t('sort.businessLabel')} value={t('common.miles', { miles: milesLabel(data.miles) })} c="text" />
          {autoText ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
              <Zap size={18} color={colors.sunText} />
              <Txt style={{ flex: 1, fontFamily: fonts.semibold, color: colors.sunText }}>{autoText}</Txt>
            </View>
          ) : null}
        </Card>
        {!settings.backupNightly ? (
          <Card variant="sun" style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <CloudUpload size={24} color={colors.sunText} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t('sortV2.keepSafe')}</Txt>
              <Txt v="small">{t('sortV2.turnOnNightly')}</Txt>
            </View>
            <Button label={t('sortV2.setUp')} variant="outline" size="sm" onPress={() => router.push('/backup')} />
          </Card>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 20, paddingTop: 8 }}>
        <Button label={t('common.done')} full onPress={done} />
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
