import { router } from 'expo-router';
import { BarChart3, ChevronDown, Download } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { entryCount } from '@/db/entriesRepo';
import { formatMoney } from '@/domain/money';
import { UNSORTED_NAME } from '@/domain/report';
import { taxYearOf } from '@/domain/taxYear';
import type { Period, Region } from '@/domain/types';
import { CategoryBars, MonthlyLines, type Bar } from '@/features/reports/charts';
import { ExportPanel } from '@/features/reports/ExportPanel';
import { availableTaxYears, endOfDay, PERIOD_MODES, periodFor, startOfDay, type PeriodMode, type ReportPeriod } from '@/features/reports/period';
import { oldestRecordAt } from '@/features/reports/queries';
import { useReport } from '@/features/reports/useReport';
import { DateField } from '@/features/settings/DateField';
import { formatDate, OptionSheet } from '@/features/settings/ui';
import { shortTaxLine } from '@/features/settings/categoryIcons';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Avatar, Button, Card, Chip, ChipRow, Divider, EmptyState, Screen, Sheet, Tag, Txt, useSnackbar } from '@/ui';

const MODE_LABEL: Record<PeriodMode, () => string> = {
  year: () => t('reports.year'),
  q1: () => 'Q1',
  q2: () => 'Q2',
  q3: () => 'Q3',
  q4: () => 'Q4',
  custom: () => t('reports.custom'),
};

const KM_PER_MILE = 1.609344;
/** Wall clock, read only from event handlers. */
const nowMs = () => Date.now();
const grouped = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** S-09 Reports: tax year + Year/Q1–Q4/Custom, totals (work only), by category, by tax line, mileage, by month. */
export default function ReportsScreen() {
  const { settings } = useSettings();
  const region: Region = settings.region ?? 'UK';
  const [startYear, setStartYear] = useState(() => taxYearOf(nowMs(), region).startYear);
  const [mode, setMode] = useState<PeriodMode>('year');
  const [custom, setCustom] = useState<Period | undefined>(undefined);
  const [yearSheet, setYearSheet] = useState(false);
  const [customSheet, setCustomSheet] = useState<Period | null>(null);
  /** >0 = export sheet open; the number remounts the panel each time. */
  const [exportOpen, setExportOpen] = useState(0);
  const snack = useSnackbar();
  const period = periodFor(region, startYear, mode, custom);

  const { colors } = useTheme();
  const firstAt = useLive(() => oldestRecordAt(db));
  const years = availableTaxYears(region, firstAt);

  const pickMode = (m: PeriodMode) => {
    if (m === 'custom') setCustomSheet(mode === 'custom' && custom ? custom : { start: period.start, end: Math.min(period.end, endOfDay(nowMs())) });
    else setMode(m);
  };

  return (
    <Screen
      header={
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('reports.taxYear', { label: period.year.label })}, ${t('reports.chooseYear')}`}
            onPress={() => setYearSheet(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, alignSelf: 'flex-start' }}>
            <Txt v="h1" accessibilityRole="header">
              {t('reports.taxYear', { label: period.year.label })}
            </Txt>
            <ChevronDown size={24} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>
      }
      bottom={
        <Button
          label={t('reports.export')}
          icon={Download}
          full
          style={{ flex: 1 }}
          onPress={() => setExportOpen((n) => n + 1)}
        />
      }>
      <ChipRow wrap={false}>
        {PERIOD_MODES.map((m) => (
          <Chip key={m} size="s" label={MODE_LABEL[m]()} state={m === mode ? 'on' : 'default'} onPress={() => pickMode(m)} />
        ))}
      </ChipRow>
      {period.range || mode === 'custom' ? (
        <Txt v="small" c="textSecondary" style={{ marginTop: -4 }}>
          {period.range ?? period.label}
        </Txt>
      ) : null}

      <ReportBody period={period} region={region} />

      <OptionSheet
        visible={yearSheet}
        title={t('reports.chooseYear')}
        options={years.map((y) => ({ value: y.startYear, label: t('reports.taxYear', { label: y.label }) }))}
        value={startYear}
        onPick={(y) => {
          setStartYear(y);
          if (mode === 'custom') setMode('year');
        }}
        onClose={() => setYearSheet(false)}
      />
      <Sheet visible={exportOpen > 0} onClose={() => setExportOpen(0)}>
        {exportOpen > 0 ? (
          <ExportPanel
            key={exportOpen}
            initial={period}
            region={region}
            onClose={(s) => {
              setExportOpen(0);
              if (s) snack({ message: s.message, tone: s.error ? 'error' : 'default' });
            }}
          />
        ) : null}
      </Sheet>
      {customSheet ? (
        <CustomPeriodSheet
          initial={customSheet}
          onClose={() => setCustomSheet(null)}
          onApply={(p) => {
            setCustom(p);
            setMode('custom');
            setCustomSheet(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

function ReportBody({ period, region }: { period: ReportPeriod; region: Region }) {
  const { settings } = useSettings();
  const { colors } = useTheme();
  const { report, months, currency, miles, mileageEstimateMinor, ratesText, entries } = useReport(period, settings, region);
  const anyData = useLive(() => entryCount(db) > 0);
  const range = { start: String(period.start), end: String(period.end) };

  if (entries.length === 0 && miles === 0) {
    return (
      <EmptyState
        art={<Avatar kind="neutral" icon={BarChart3} size={64} />}
        title={t('reports.empty')}
        body={anyData ? undefined : t('reports.emptySub')}
      />
    );
  }

  const bars: Bar[] = report.byCategory
    .filter((c) => c.type === 'expense')
    .map((c) => ({
      key: c.categoryId ?? 'unsorted',
      name: c.categoryId ? c.name : UNSORTED_NAME,
      totalMinor: c.totalMinor,
      unsorted: c.categoryId === null,
      onPress: () =>
        router.push({
          pathname: '/entries',
          params: c.categoryId ? { categoryId: c.categoryId, ...range } : { unsorted: '1', ...range },
        }),
    }));

  const formLabel = region === 'UK' ? 'SA103' : 'Schedule C';
  const distance =
    settings.distanceUnit === 'km'
      ? t('reports.kmValue', { km: grouped(miles * KM_PER_MILE) })
      : t('reports.milesValue', { miles: grouped(miles) });
  const estimate = formatMoney(mileageEstimateMinor, currency);
  const rates = ratesText;

  return (
    <>
      {report.unsortedCount > 0 ? (
        <Card variant="sun" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="h3" style={{ color: '#1F2A44' }}>
              {report.unsortedCount > 99 ? '99+' : report.unsortedCount}
            </Txt>
          </View>
          <Txt v="small" style={{ flex: 1, fontFamily: fonts.bold }}>
            {report.unsortedCount === 1 ? t('reports.unsortedWarnOne') : t('reports.unsortedWarn', { count: report.unsortedCount })}
          </Txt>
          <Button label={t('reports.sortNow')} size="sm" onPress={() => router.push('/sort')} style={{ paddingHorizontal: 14 }} />
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <Row label={t('reports.income')} value={formatMoney(report.incomeMinor, currency)} color="incomeText" />
        <Row label={t('reports.expenses')} value={formatMoney(report.expenseMinor, currency)} color="expenseText" />
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <Txt v="h3">{t('reports.profit')}</Txt>
          <Txt v="amount" size={32} style={{ lineHeight: 38 }} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(report.profitMinor, currency)}
          </Txt>
        </View>
        {report.personalExcludedMinor > 0 ? (
          <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.medium }}>
            {t('reports.personalExcluded', { amount: formatMoney(report.personalExcludedMinor, currency) })}
          </Txt>
        ) : null}
      </Card>

      {bars.length ? (
        <Card style={{ gap: 12 }}>
          <Txt v="h3" accessibilityRole="header">
            {t('reports.expensesByCategory')}
          </Txt>
          <CategoryBars bars={bars} currency={currency} />
        </Card>
      ) : null}

      {report.byTaxLine.length ? (
        <Card style={{ paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
            <Txt v="h3" accessibilityRole="header">
              {t('reports.byTaxLine')}
            </Txt>
            <Tag kind="neutral" label={formLabel} />
          </View>
          {report.byTaxLine.map((l) => (
            <View
              key={`${l.type}:${l.taxLine}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Txt v="small" style={{ flex: 1 }}>
                {shortTaxLine(l.taxLine)}
              </Txt>
              <Txt v="small" c={l.type === 'income' ? 'incomeText' : 'text'} style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>
                {formatMoney(l.totalMinor, currency)}
              </Txt>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt v="h3" accessibilityRole="header">
            {t('reports.mileage')}
          </Txt>
          <Txt v="amount" size={20}>
            {distance}
          </Txt>
        </View>
        <Txt v="small">
          {region === 'UK' ? t('reports.estimateUK', { amount: estimate, rates }) : t('reports.estimateUS', { amount: estimate, rates })}
        </Txt>
        <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.medium }}>
          {t('common.estimateOnly')}
        </Txt>
      </Card>

      {months.length > 1 ? (
        <Card style={{ gap: 10 }}>
          <Txt v="h3" accessibilityRole="header">
            {t('reports.byMonth')}
          </Txt>
          <MonthlyLines months={months} currency={currency} />
        </Card>
      ) : null}
    </>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: 'incomeText' | 'expenseText' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Txt c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {label}
      </Txt>
      <Txt v="amount" c={color} size={20}>
        {value}
      </Txt>
    </View>
  );
}

function CustomPeriodSheet({ initial, onApply, onClose }: { initial: Period; onApply: (p: Period) => void; onClose: () => void }) {
  const [from, setFrom] = useState(new Date(initial.start));
  const [to, setTo] = useState(new Date(initial.end - 1));
  const valid = startOfDay(from.getTime()) <= startOfDay(to.getTime());
  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('reports.customTitle')}
      footer={
        <Button
          label={t('reports.apply')}
          full
          disabled={!valid}
          onPress={() => onApply({ start: startOfDay(from.getTime()), end: endOfDay(to.getTime()) })}
        />
      }>
      <DateField label={t('reports.from')} value={from} display={formatDate(from.getTime())} onChange={setFrom} maximumDate={to} />
      <DateField label={t('reports.to')} value={to} display={formatDate(to.getTime())} onChange={setTo} minimumDate={from} />
      {!valid ? (
        <Txt v="small" c="error">
          {t('reports.customError')}
        </Txt>
      ) : null}
    </Sheet>
  );
}
