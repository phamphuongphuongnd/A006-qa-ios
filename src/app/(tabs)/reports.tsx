import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { BarChart3, ChevronDown, Download, Truck } from '@/ui/icons';
import { useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';

import { db } from '@/db/client';
import { entryCount } from '@/db/entriesRepo';
import { changeVehicleCostMethod } from '@/db/vehicleCostsRepo';
import { formatMoney } from '@/domain/money';
import { MILEAGE_ID, mtdRowLabel, UNSORTED_NAME } from '@/domain/report';
import { taxYearOf } from '@/domain/taxYear';
import type { Period, Region, VehicleCostMethod } from '@/domain/types';
import { CategoryBars, MonthlyLines, type Bar } from '@/features/reports/charts';
import { ExportPanel } from '@/features/reports/ExportPanel';
import {
  availableTaxYears,
  endOfDay,
  PERIOD_MODES,
  REPORT_MIN_AT,
  saneReportRange,
  periodFor,
  startOfDay,
  type MtdPeriodKind,
  type PeriodMode,
  type ReportPeriod,
} from '@/features/reports/period';
import { oldestRecordAt } from '@/features/reports/queries';
import { useReport } from '@/features/reports/useReport';
import { DateField } from '@/features/settings/DateField';
import { formatDate, OptionSheet } from '@/features/settings/ui';
import { shortTaxLine } from '@/features/settings/categoryIcons';
import { CaptureFab } from '@/features/entries/CaptureFab';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, touch, useTheme } from '@/theme';
import { Avatar, Button, Card, Chip, ChipRow, Dialog, Divider, EmptyState, Progress, Screen, Segmented, Sheet, Tag, Toggle, Txt, useSnackbar } from '@/ui';

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

function linkedPeriod(p: { from?: string; to?: string }): Period | null {
  const start = Number(p.from);
  const end = Number(p.to);
  return p.from && p.to && saneReportRange(start, end) ? { start, end } : null;
}

/**
 * S-09 Reports: tax year + Year/Q1–Q4/Custom (UK quarters: MTD Standard | Calendar periods, Year to date), totals
 * (work only) by the vehicle cost method, by category (+ "Covered by mileage rate"), SA103 | MTD categories, mileage
 * or business use, by month.
 */
export default function ReportsScreen() {
  const { settings, update } = useSettings();
  const region: Region = settings.region ?? 'UK';
  // `?from=&to=` (ms, end exclusive — e.g. Home's "This week" card) opens a custom period; new params reset it.
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const linked = linkedPeriod(params);
  const paramKey = `${params.from ?? ''}|${params.to ?? ''}`;
  const [startYear, setStartYear] = useState(() => taxYearOf(linked?.start ?? nowMs(), region).startYear);
  const [mode, setMode] = useState<PeriodMode>(linked ? 'custom' : 'year');
  const [custom, setCustom] = useState<Period | undefined>(linked ?? undefined);
  const [ytd, setYtd] = useState(false);
  const [seenKey, setSeenKey] = useState(paramKey);
  if (seenKey !== paramKey) {
    setSeenKey(paramKey);
    if (linked) {
      setStartYear(taxYearOf(linked.start, region).startYear);
      setCustom(linked);
      setMode('custom');
    }
  }
  const [yearSheet, setYearSheet] = useState(false);
  const [customSheet, setCustomSheet] = useState<Period | null>(null);
  /** >0 = export sheet open; the number remounts the panel each time. */
  const [exportOpen, setExportOpen] = useState(0);
  const snack = useSnackbar();
  const period = periodFor(region, startYear, mode, custom, { mtd: settings.mtdPeriod, ytd });
  const mtdQuarter = period.mtd !== null;

  const { colors } = useTheme();
  const firstAt = useLive(() => oldestRecordAt(db), [], ['entries', 'trips']);
  const years = availableTaxYears(region, firstAt);

  const pickMode = (m: PeriodMode) => {
    if (m === 'custom') setCustomSheet(mode === 'custom' && custom ? custom : { start: period.start, end: Math.min(period.end, endOfDay(nowMs())) });
    else setMode(m);
  };

  return (
    <Screen
      header={
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Txt v="h1" accessibilityRole="header">
            {t('reports.title')}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('reports.taxYear', { label: period.year.label })}, ${t('reports.chooseYear')}`}
            onPress={() => setYearSheet(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 48,
              paddingHorizontal: 16,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: colors.lineStrong,
            }}>
            <Txt style={{ fontFamily: fonts.semibold }}>{t('reports.taxYear', { label: period.year.label })}</Txt>
            <ChevronDown size={20} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        </View>
      }
      fab={<CaptureFab />}
      bottom={<Button label={t('reports.export')} icon={Download} full style={{ flex: 1 }} onPress={() => setExportOpen((n) => n + 1)} />}>
      <ChipRow wrap={false}>
        {PERIOD_MODES.map((m) => (
          <Chip key={m} size="s" label={MODE_LABEL[m]()} state={m === mode ? 'on' : 'default'} onPress={() => pickMode(m)} />
        ))}
      </ChipRow>
      {mtdQuarter ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt v="small" c="textSecondary" style={{ flexShrink: 1 }}>
              {t('mtd.reports.mtdPeriods')}
            </Txt>
            <View style={{ flex: 1 }}>
              <Segmented<MtdPeriodKind>
                accessibilityLabel={t('mtd.reports.mtdPeriods')}
                options={[
                  { value: 'standard', label: t('mtd.reports.standard') },
                  { value: 'calendar', label: t('mtd.reports.calendar') },
                ]}
                value={settings.mtdPeriod}
                onChange={(v) => update({ mtdPeriod: v })}
              />
            </View>
          </View>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t('mtd.reports.ytd')}</Txt>
              <Txt v="small" c="textSecondary">
                {ytd ? (period.range ?? '') : `${period.range ?? ''} · ${t('mtd.reports.ytdOff')}`}
              </Txt>
            </View>
            <Toggle value={ytd} onChange={setYtd} label={t('mtd.reports.ytd')} />
          </Card>
        </>
      ) : period.range || mode === 'custom' ? (
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
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const narrow = useWindowDimensions().width < 420;
  const { report, months, currency, miles, mileageEstimateMinor, ratesText, entries, method, treatment, trips, businessUse } = useReport(
    period,
    settings,
    region,
  );
  const anyData = useLive(() => entryCount(db) > 0, [], ['entries']);
  const [lineTab, setLineTab] = useState<'form' | 'mtd'>('form');
  const [methodSheet, setMethodSheet] = useState(false);
  const [methodAsk, setMethodAsk] = useState<VehicleCostMethod | null>(null);
  const range = { from: String(period.start), to: String(period.end) };

  const pickMethod = (to: VehicleCostMethod, confirmed = false) => {
    const res = changeVehicleCostMethod(db, to, { confirmed });
    if (res.status === 'needs_confirm') setTimeout(() => setMethodAsk(to), Platform.OS === 'ios' ? 400 : 0);
    else if (res.status === 'saved') update({ vehicleCostMethod: to });
  };

  const totalMiles = trips.workMiles + trips.personalMiles + trips.unsortedMiles;
  if (entries.length === 0 && totalMiles === 0) {
    return (
      <EmptyState
        art={<Avatar kind="neutral" icon={BarChart3} size={64} />}
        title={t('reports.empty')}
        body={anyData ? undefined : t('reports.emptySub')}
      />
    );
  }

  const unit = settings.distanceUnit;
  const dist = (mi: number) =>
    unit === 'km' ? t('reports.kmValue', { km: grouped(mi * KM_PER_MILE) }) : t('reports.milesValue', { miles: grouped(mi) });

  const bars: Bar[] = report.byCategory
    .filter((c) => c.type === 'expense')
    .map((c) => ({
      key: c.categoryId ?? 'unsorted',
      name: c.categoryId === MILEAGE_ID ? t('mtd.reports.mileageRow', { miles: dist(miles) }) : c.categoryId ? c.name : UNSORTED_NAME,
      totalMinor: c.totalMinor,
      unsorted: c.categoryId === null,
      onPress: () =>
        c.categoryId === MILEAGE_ID
          ? router.push('/miles')
          : router.push({
              pathname: '/entries',
              params: c.categoryId ? { categoryId: c.categoryId, ...range } : { unsorted: '1', ...range },
            }),
    }));

  const formLabel = region === 'UK' ? 'SA103' : 'Schedule C';
  const unsortedText = (() => {
    if (trips.unsortedCount === 0) {
      return report.unsortedCount === 1 ? t('reports.unsortedWarnOne') : t('reports.unsortedWarn', { count: report.unsortedCount });
    }
    const e = report.unsortedCount === 1 ? t('mtd.reports.entriesOne') : t('mtd.reports.entriesN', { count: report.unsortedCount });
    const tr = trips.unsortedCount === 1 ? t('mtd.reports.tripsOne') : t('mtd.reports.tripsN', { count: trips.unsortedCount });
    if (report.unsortedCount === 0) return trips.unsortedCount === 1 ? t('mtd.reports.unsortedTripOne') : t('mtd.reports.unsortedOnly', { what: tr });
    return t('mtd.reports.unsortedEntriesTrips', { entries: e, trips: tr });
  })();
  const toSort = report.unsortedCount + trips.unsortedCount;
  const mtdRows = report.byMtd.filter((m) => m.totalMinor !== 0 || m.mtdCategory !== null);

  return (
    <>
      {toSort > 0 ? (
        // QA-100 A37-4: at 200% text on a narrow phone the sentence was squeezed to one word per line — wrap the button
        // under the text instead (the badge grows with the text).
        <Card variant="sun" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <View style={{ minWidth: 40, minHeight: 40, paddingHorizontal: 6, borderRadius: 20, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="h3" maxFontSizeMultiplier={1.4} style={{ color: '#1F2A44' }}>
              {toSort > 99 ? '99+' : toSort}
            </Txt>
          </View>
          <Txt v="small" style={{ flex: 1, minWidth: 150, fontFamily: fonts.bold }}>
            {unsortedText}
          </Txt>
          <Button label={t('reports.sortNow')} size="sm" onPress={() => router.push('/sort')} style={{ paddingHorizontal: 14 }} />
        </Card>
      ) : null}

      {treatment.nudgeToChoose ? (
        <View style={{ borderRadius: 16, padding: 16, gap: 10, backgroundColor: colors.warnSoft }} accessibilityRole="alert">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Truck size={24} color={colors.warnText} strokeWidth={1.75} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">{t('mtd.reports.chooseTitle')}</Txt>
              <Txt c="textSecondary">{t('mtd.reports.chooseBody')}</Txt>
            </View>
          </View>
          {/* B-60: on narrow phones the floating "+" sat on top of "Actual costs" — stack the two and keep clear of it. */}
          <View style={narrow ? { gap: 10, marginRight: touch.fab - 8 } : { flexDirection: 'row', gap: 10 }}>
            <Button label={t('mtd.reports.mileageRate')} size="sm" style={narrow ? undefined : { flex: 1 }} onPress={() => pickMethod('mileage')} />
            <Button label={t('mtd.reports.actualCosts')} size="sm" variant="outline" style={narrow ? undefined : { flex: 1 }} onPress={() => pickMethod('actual')} />
          </View>
        </View>
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
        {!treatment.nudgeToChoose ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Txt style={{ flex: 1 }}>{method === 'actual' ? t('mtd.reports.usingActual') : t('mtd.reports.usingMileage')}</Txt>
            <Button label={t('mtd.reports.change')} variant="text" size="sm" onPress={() => setMethodSheet(true)} />
          </View>
        ) : null}
      </Card>

      {bars.length || report.coveredByCategory.length ? (
        <Card style={{ gap: 12 }}>
          <Txt v="h3" accessibilityRole="header">
            {t('reports.expensesByCategory')}
          </Txt>
          {bars.length ? <CategoryBars bars={bars} currency={currency} /> : null}
          {report.coveredByCategory.length ? (
            <View style={{ gap: 6, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong, paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt v="small" c="textSecondary" style={{ flex: 1, fontFamily: fonts.bold }}>
                  {t('vehicle.coveredGroup')}
                </Txt>
                <Txt v="small" c="textSecondary" style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>
                  {formatMoney(report.coveredMinor, currency)}
                </Txt>
              </View>
              {report.coveredByCategory.map((c) => (
                <View key={c.categoryId ?? 'x'} style={{ flexDirection: 'row', gap: 8 }}>
                  <Txt v="caption" c="textTertiary" style={{ flex: 1 }}>
                    {c.name}
                  </Txt>
                  <Txt v="caption" c="textTertiary" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatMoney(c.totalMinor, currency)}
                  </Txt>
                </View>
              ))}
              <Txt v="caption" c="textTertiary">
                {t('vehicle.coveredNote')}
              </Txt>
            </View>
          ) : null}
        </Card>
      ) : null}

      {report.byTaxLine.length ? (
        <>
          {region === 'UK' ? (
            <Segmented<'form' | 'mtd'>
              accessibilityLabel={t('reports.byTaxLine')}
              options={[
                { value: 'form', label: t('mtd.reports.sa103') },
                { value: 'mtd', label: t('mtd.reports.mtdCategories') },
              ]}
              value={lineTab}
              onChange={setLineTab}
            />
          ) : null}
          <Card style={{ paddingVertical: 6 }}>
            {lineTab === 'form' || region !== 'UK' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                  <Txt v="h3" accessibilityRole="header">
                    {t('reports.byTaxLine')}
                  </Txt>
                  <Tag kind="neutral" label={formLabel} />
                </View>
                {report.byTaxLine.map((l, i) => (
                  <LineRow key={`${l.type}:${l.taxLine}`} first={i === 0} label={shortTaxLine(l.taxLine)} income={l.type === 'income'} value={formatMoney(l.totalMinor, currency)} />
                ))}
              </>
            ) : (
              mtdRows.map((m, i) => (
                <LineRow
                  key={`${m.type}:${m.mtdCategory ?? '-'}`}
                  first={i === 0}
                  label={mtdRowLabel(m)}
                  income={m.type === 'income'}
                  value={formatMoney(m.totalMinor, currency)}
                />
              ))
            )}
          </Card>
          {lineTab === 'mtd' && region === 'UK' ? (
            <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.medium }}>
              {t('common.estimateOnly')}
            </Txt>
          ) : null}
        </>
      ) : null}

      {treatment.showsBusinessUse ? (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt v="h3" accessibilityRole="header">
              {t('reports.mileage')}
            </Txt>
            <Tag kind="neutral" label={t('mtd.reports.actualCosts')} />
          </View>
          {businessUse ? (
            <>
              <Txt v="amount" size={40} accessibilityLabel={t('mtd.reports.businessUseA11y', { percent: businessUse.percent })}>
                {businessUse.percent}%
              </Txt>
              <Txt c="textSecondary">{t('mtd.reports.businessUse', { work: dist(trips.workMiles), total: dist(totalMiles) })}</Txt>
              <Progress value={businessUse.share} tone="ok" />
            </>
          ) : (
            <Txt c="textSecondary">{t('mtd.reports.noMiles')}</Txt>
          )}
          <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.medium }}>
            {t('vehicle.accountantNote')}
          </Txt>
        </Card>
      ) : (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt v="h3" accessibilityRole="header">
              {t('reports.mileage')}
            </Txt>
            <Txt v="amount" size={20}>
              {dist(miles)}
            </Txt>
          </View>
          <Txt v="small">
            {region === 'UK'
              ? t('reports.estimateUK', { amount: formatMoney(mileageEstimateMinor, currency), rates: ratesText })
              : t('reports.estimateUS', { amount: formatMoney(mileageEstimateMinor, currency), rates: ratesText })}
          </Txt>
          <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.medium }}>
            {t('common.estimateOnly')}
          </Txt>
        </Card>
      )}

      {months.length > 1 ? (
        <Card style={{ gap: 10 }}>
          <Txt v="h3" accessibilityRole="header">
            {t('reports.byMonth')}
          </Txt>
          <MonthlyLines months={months} currency={currency} />
        </Card>
      ) : null}

      <OptionSheet
        visible={methodSheet}
        title={t('vehicle.title')}
        options={(['mileage', 'actual', 'unsure'] as const).map((m) => ({ value: m, label: t(`vehicle.method.${m}`) }))}
        value={method}
        onPick={(m) => pickMethod(m)}
        onClose={() => setMethodSheet(false)}
      />
      <Dialog
        visible={methodAsk !== null}
        title={t('vehicle.changeTitle')}
        body={region === 'UK' ? t('vehicle.changeBody') : t('vehicle.changeBodyUS')}
        onClose={() => setMethodAsk(null)}
        actions={[
          { label: t('mtd.reports.cancel'), onPress: () => setMethodAsk(null) },
          {
            label: t('vehicle.change'),
            onPress: () => {
              if (methodAsk) pickMethod(methodAsk, true);
              setMethodAsk(null);
            },
          },
        ]}
      />
    </>
  );
}

function LineRow({ label, value, income, first }: { label: string; value: string; income: boolean; first: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 48,
        paddingVertical: 8,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
      }}>
      <Txt v="small" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt v="small" c={income ? 'incomeText' : 'text'} style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: 'incomeText' | 'expenseText' }) {
  return (
    // QA-100 A37-5: "$2,053,740.86" at 200% ran off the card — the amount drops under its label when it doesn't fit.
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8 }}>
      <Txt c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {label}
      </Txt>
      <Txt v="amount" c={color} size={20} style={{ flexShrink: 1, marginLeft: 'auto' }}>
        {value}
      </Txt>
    </View>
  );
}

function CustomPeriodSheet({ initial, onApply, onClose }: { initial: Period; onApply: (p: Period) => void; onClose: () => void }) {
  const [from, setFrom] = useState(new Date(initial.start));
  const [to, setTo] = useState(new Date(initial.end - 1));
  const ordered = startOfDay(from.getTime()) <= startOfDay(to.getTime());
  const valid = ordered && saneReportRange(startOfDay(from.getTime()), endOfDay(to.getTime()));
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
      <DateField label={t('reports.from')} value={from} display={formatDate(from.getTime())} onChange={setFrom} maximumDate={to} minimumDate={new Date(REPORT_MIN_AT)} />
      <DateField label={t('reports.to')} value={to} display={formatDate(to.getTime())} onChange={setTo} minimumDate={from} />
      {!valid ? (
        <Txt v="small" c="error">
          {ordered ? t('reports.customRangeError') : t('reports.customError')}
        </Txt>
      ) : null}
    </Sheet>
  );
}
