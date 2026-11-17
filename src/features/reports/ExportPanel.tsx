import { router } from '@/services/router';
import * as Sharing from 'expo-sharing';
import { Check, ChevronDown, ChevronUp, Download, FileText, Info, Lock, X } from '@/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { db } from '@/db/client';
import { listEntries, unsortedCount } from '@/db/entriesRepo';
import type { Region } from '@/domain/types';
import { openPro } from '@/features/pro/openPro';
import { withLockSuspended } from '@/features/settings/lockState';
import { formatDay } from '@/features/trips/format';
import { t, tn } from '@/i18n';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, radius, useTheme } from '@/theme';
import { Badge, Button, Chip, ChipRow, Dialog, Field, IconButton, Sheet, Toggle, Txt } from '@/ui';

import { buildExport, ExportCancelled, NothingToExport } from './buildExport';
import { exportChanges, markExported } from './exported';
import { defaultExportKinds, FREE_KINDS, isProKind, kindsFor, MTD_KINDS, type ExportKind } from './exportDocs';
import {
  DEFAULT_FREEAGENT_VEHICLE,
  FREEAGENT_ENGINE_TYPES,
  fixEngineSize,
  freeAgentEngineSizes,
  type FreeAgentEngineType,
  type FreeAgentVehicle,
} from './mtdFiles';
import { periodFor, type PeriodMode, type ReportPeriod } from './period';
import { finishedTrips } from './queries';

const LABEL: Record<ExportKind, () => string> = {
  entriesCsv: () => t('mtd.export.entriesCsv'),
  mileageCsv: () => t('mtd.export.mileageCsv'),
  pdf: () => t('mtd.export.pdf'),
  totalsCsv: () => t('mtd.export.totalsCsv'),
  mtdSummary: () => t('mtd.export.mtdSummary'),
  mtdRecords: () => t('mtd.export.mtdRecords'),
  mtdXlsx: () => t('mtd.export.mtdXlsx'),
  freeagent: () => t('mtd.export.freeagent'),
  receiptsZip: () => t('mtd.export.receiptsZip'),
};

function subtitle(k: ExportKind, region: Region, opts: { pro: boolean; photos: number }): string {
  switch (k) {
    case 'entriesCsv':
      return opts.pro ? t('mtd.export.rawSub') : t('mtd.export.entriesCsvSub');
    case 'mileageCsv':
      return opts.pro ? t('mtd.export.rawSub') : t('mtd.export.mileageCsvSub');
    case 'pdf':
      return region === 'UK' ? t('mtd.export.pdfSub') : t('mtd.export.pdfSubUS');
    case 'totalsCsv':
      return region === 'UK' ? t('mtd.export.totalsSubUK') : t('mtd.export.totalsSubUS');
    case 'mtdSummary':
      return t('mtd.export.mtdSummarySub');
    case 'mtdRecords':
      return t('mtd.export.mtdRecordsSub');
    case 'mtdXlsx':
      return t('mtd.export.mtdXlsxSub');
    case 'freeagent':
      return t('mtd.export.freeagentSub');
    case 'receiptsZip':
      if (!opts.pro) return t('mtd.export.receiptsSub');
      return opts.photos === 1 ? t('mtd.export.receiptsOne') : t('mtd.export.receiptsN', { count: opts.photos });
  }
}

const savedVehicle = (v: { engineType: string; engineSize: string } | null): FreeAgentVehicle | null =>
  v && FREEAGENT_ENGINE_TYPES.includes(v.engineType as FreeAgentEngineType)
    ? fixEngineSize({ engineType: v.engineType as FreeAgentEngineType, engineSize: v.engineSize })
    : null;

/**
 * S-10 Export: period, files (raw CSVs free; PDF / tax-line totals / MTD / FreeAgent / photos Pro — locked rows open
 * S-19), "Include personal entries", unsorted handling (MTD: "Leave them out" / "Sort now"), FreeAgent name once,
 * progress, share. Inside a bottom sheet on Reports and as the /export screen from Settings.
 * `onClose(message)` closes the host; a message is shown as a snackbar once the sheet is gone.
 */
export function ExportPanel({
  initial,
  region,
  onClose,
  showHeader = true,
}: {
  initial: ReportPeriod;
  region: Region;
  onClose: (snack?: { message: string; error?: boolean }) => void;
  showHeader?: boolean;
}) {
  'use no memo';
  const { colors } = useTheme();
  const { settings, update } = useSettings();
  const { pro } = usePro();
  const [period, setPeriod] = useState(initial);
  const [periodOpen, setPeriodOpen] = useState(false);
  const offered = kindsFor(region);
  const defaultsFor = (p: ReportPeriod) => defaultExportKinds(finishedTrips(db, p).length > 0, { pro, region });
  const [kinds, setKinds] = useState<ExportKind[]>(() => defaultsFor(initial));
  // Until the user ticks a box, the defaults follow the chosen period (mileage log on when it has trips).
  const kindsTouched = useRef(false);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [ask, setAsk] = useState<{ kind: 'mtd' | 'plain'; count: number } | null>(null);
  /** "Leave them out" pressed for this period. */
  const [leftOutFor, setLeftOutFor] = useState<string | null>(null);
  /** FreeAgent name + engine sheet: before exporting ('run') or from the "Change" link ('edit'). */
  const [freeagentAsk, setFreeagentAsk] = useState<'run' | 'edit' | null>(null);
  const [busy, setBusy] = useState(false);
  /** QA-100: the share sheet never says whether the file went anywhere — ask before marking the period Exported (Q29). */
  const [sentAsk, setSentAsk] = useState(false);
  const cancelled = useRef(false);

  const chosen = kinds.filter((k) => offered.includes(k) && (pro || !isProKind(k)));
  const wantsMtd = chosen.some((k) => MTD_KINDS.includes(k));
  const unsorted = unsortedCount(db, period);
  const lastExport = settings.exportLog[period.fileStem] ?? null;
  const changes = useLive(() => (lastExport !== null ? exportChanges(db, period, includePersonal) : 0), [lastExport, period.start, period.end, includePersonal], ['entries', 'trips']);
  const periodKey = `${period.start}-${period.end}`;
  const showMtdCard = wantsMtd && unsorted > 0 && leftOutFor !== periodKey;
  const photos = pro && offered.includes('receiptsZip') ? countPhotos(period) : 0;
  const options = periodOptions(initial, region, settings.mtdPeriod);

  const toggle = (k: ExportKind) => {
    if (!pro && isProKind(k)) {
      onClose();
      openPro('tax_files');
      return;
    }
    kindsTouched.current = true;
    setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : offered.filter((x) => x === k || ks.includes(x))));
  };

  const sortNow = () => {
    setAsk(null);
    onClose();
    router.push('/sort');
  };

  const start = () => {
    if (unsorted > 0 && wantsMtd && leftOutFor !== periodKey) setAsk({ kind: 'mtd', count: unsorted });
    else if (unsorted > 0 && !wantsMtd) setAsk({ kind: 'plain', count: unsorted });
    else afterUnsorted();
  };

  const afterUnsorted = () => {
    setAsk(null);
    if (chosen.includes('freeagent') && (!settings.freeagentClaimant.trim() || !savedVehicle(settings.freeagentVehicle))) setFreeagentAsk('run');
    else run();
  };

  const run = async (freeagent?: { claimant: string; vehicle: FreeAgentVehicle }) => {
    setFreeagentAsk(null);
    cancelled.current = false;
    setBusy(true);
    try {
      const out = await buildExport({
        period,
        kinds: chosen,
        includePersonal,
        region,
        settings,
        pro,
        freeagent: freeagent ?? { claimant: settings.freeagentClaimant, vehicle: savedVehicle(settings.freeagentVehicle) },
        isCancelled: () => cancelled.current,
      });
      if (cancelled.current) return;
      if (!(await Sharing.isAvailableAsync())) {
        onClose({ message: t('export.shareUnavailable'), error: true });
        return;
      }
      await withLockSuspended(() =>
        Sharing.shareAsync(out.file.uri, { mimeType: out.mimeType, UTI: out.uti, dialogTitle: t('export.title') }),
      );
      setSentAsk(true);
    } catch (e) {
      if (e instanceof ExportCancelled) return;
      if (e instanceof NothingToExport) onClose({ message: t('export.noReceipts') });
      else onClose({ message: t('export.failed'), error: true });
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <View style={{ alignItems: 'center', gap: 18, paddingTop: 4 }}>
        <Spinner />
        <Txt v="h2" center accessibilityLiveRegion="polite">
          {t('export.preparing')}
        </Txt>
        <Txt v="small" c="textSecondary" center>
          {chosen.map((k) => LABEL[k]()).join(' · ')}
        </Txt>
        <Button
          label={t('export.cancel')}
          variant="text"
          full
          onPress={() => {
            cancelled.current = true;
            setBusy(false);
          }}
        />
      </View>
    );
  }

  const row = (k: ExportKind, i: number) => {
    const locked = !pro && isProKind(k);
    const on = !locked && chosen.includes(k);
    return (
      <Pressable
        key={k}
        accessibilityRole={locked ? 'button' : 'checkbox'}
        accessibilityState={locked ? undefined : { checked: on }}
        accessibilityLabel={`${LABEL[k]()}, ${subtitle(k, region, { pro, photos })}${locked ? `, ${t('pro.badge')}` : ''}`}
        onPress={() => toggle(k)}
        style={({ pressed }) => [
          styles.row,
          i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
          pressed && { backgroundColor: colors.surfaceAlt },
        ]}>
        {locked ? (
          <View style={[styles.box, { backgroundColor: colors.surfaceAlt }]}>
            <Lock size={16} color={colors.textSecondary} strokeWidth={2.2} />
          </View>
        ) : (
          <View style={[styles.box, on ? { backgroundColor: colors.primary } : { borderWidth: 2, borderColor: colors.lineStrong }]}>
            {on ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontFamily: on ? fonts.bold : fonts.semibold }} c={locked ? 'textSecondary' : 'text'}>
            {LABEL[k]()}
          </Txt>
          <Txt v="caption" c="textTertiary">
            {subtitle(k, region, { pro, photos })}
          </Txt>
        </View>
        {locked ? <Badge kind="pro" label={t('pro.badge')} /> : null}
      </Pressable>
    );
  };

  const freeKinds = offered.filter((k) => FREE_KINDS.includes(k));
  const proKinds = offered.filter((k) => isProKind(k));

  return (
    <View style={{ gap: 12 }}>
      {showHeader ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt v="h2" accessibilityRole="header">
            {t('export.title')}
          </Txt>
          <IconButton icon={X} label={t('categories.close')} onPress={() => onClose()} />
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('export.period')}, ${period.exportLabel}`}
          accessibilityState={{ expanded: periodOpen }}
          onPress={() => setPeriodOpen((o) => !o)}
          style={[styles.select, { backgroundColor: colors.surfaceAlt }]}>
          <View style={{ flex: 1 }}>
            <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
              {t('export.period')}
            </Txt>
            <Txt>{period.exportLabel}</Txt>
          </View>
          {periodOpen ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
        </Pressable>
        {periodOpen ? (
          <View style={[styles.list, { borderColor: colors.line }]}>
            {options.map((o, i) => {
              const on = o.start === period.start && o.end === period.end;
              return (
                <Pressable
                  key={`${o.start}-${o.end}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setPeriod(o);
                    if (!kindsTouched.current) setKinds(defaultsFor(o));
                    setPeriodOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.opt,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Txt v="small" style={{ fontFamily: on ? fonts.bold : fonts.regular }}>
                      {o.label}
                    </Txt>
                    {o.range ? (
                      <Txt v="caption" c="textTertiary">
                        {o.range}
                      </Txt>
                    ) : null}
                  </View>
                  {on ? <Check size={18} color={colors.primaryText} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {showMtdCard ? (
        <View style={[styles.warn, { backgroundColor: colors.warnSoft }]} accessibilityRole="alert">
          <Txt v="h3">{mtdTitle(unsorted, period)}</Txt>
          <Txt c="textSecondary">{t('mtd.export.unsortedMtdBody')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            <Button label={t('mtd.export.sortNow')} size="sm" onPress={sortNow} />
            <Button label={t('mtd.export.leaveOut')} size="sm" variant="text" onPress={() => setLeftOutFor(periodKey)} />
          </View>
        </View>
      ) : null}

      {pro ? (
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>{offered.map(row)}</View>
      ) : (
        <>
          <Txt v="overline" c="textSecondary">
            {t('mtd.export.free')}
          </Txt>
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>{freeKinds.map(row)}</View>
          <Txt v="overline" c="textSecondary">
            {t('mtd.export.pro')}
          </Txt>
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>{proKinds.map(row)}</View>
        </>
      )}

      {chosen.includes('freeagent') && settings.freeagentClaimant.trim() ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt v="small" c="textSecondary" style={{ flex: 1 }}>
            {t('mtd.export.freeagentAs', {
              name: settings.freeagentClaimant.trim(),
              engine: (() => {
                const v = savedVehicle(settings.freeagentVehicle) ?? DEFAULT_FREEAGENT_VEHICLE;
                return v.engineSize === 'All' ? v.engineType : `${v.engineType} ${v.engineSize}`;
              })(),
            })}
          </Txt>
          <Button label={t('mtd.export.freeagentChange')} size="sm" variant="text" onPress={() => setFreeagentAsk('edit')} />
        </View>
      ) : null}

      <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Txt style={{ flex: 1 }}>{t('export.includePersonal')}</Txt>
        <Toggle value={includePersonal} onChange={setIncludePersonal} label={t('export.includePersonal')} />
      </View>

      {region === 'UK' ? (
        <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
          <Info size={20} color={colors.textSecondary} />
          <Txt v="caption" c="textSecondary" style={{ flex: 1, fontFamily: fonts.medium }}>
            {t('mtd.export.mtdNote')}
          </Txt>
        </View>
      ) : null}

      {lastExport !== null ? (
        <Txt v="small" c={changes > 0 ? 'sunText' : 'textSecondary'} center style={{ fontFamily: fonts.semibold }} accessibilityLiveRegion="polite">
          {changes > 0
            ? tn('s6.changesSince', changes, { date: formatDay(lastExport) })
            : t('s6.noChangesSince', { date: formatDay(lastExport) })}
        </Txt>
      ) : null}
      <Button
        label={chosen.length === 1 ? t('mtd.export.exportOne') : t('mtd.export.exportN', { count: chosen.length })}
        icon={Download}
        full
        disabled={chosen.length === 0}
        onPress={start}
      />
      {chosen.length === 0 ? (
        <Txt v="small" c="textSecondary" center>
          {t('export.pickOne')}
        </Txt>
      ) : null}

      <Dialog
        visible={ask !== null}
        title={
          ask?.kind === 'mtd'
            ? mtdTitle(ask.count, period)
            : ask?.count === 1
              ? t('export.unsortedTitleOne')
              : t('export.unsortedTitle', { count: ask?.count ?? 0 })
        }
        body={ask?.kind === 'mtd' ? t('mtd.export.unsortedMtdBody') : t('export.unsortedBody')}
        onClose={() => setAsk(null)}
        actions={
          ask?.kind === 'mtd'
            ? [
                {
                  label: t('mtd.export.leaveOut'),
                  onPress: () => {
                    setLeftOutFor(periodKey);
                    afterUnsorted();
                  },
                },
                { label: t('mtd.export.sortNow'), variant: 'sun', onPress: sortNow },
              ]
            : [
                { label: t('export.exportAnyway'), onPress: afterUnsorted },
                { label: t('export.sortFirst'), variant: 'sun', onPress: sortNow },
              ]
        }
      />
      {freeagentAsk ? (
        <FreeAgentSheet
          initialName={settings.freeagentClaimant}
          initialVehicle={savedVehicle(settings.freeagentVehicle) ?? DEFAULT_FREEAGENT_VEHICLE}
          onClose={() => setFreeagentAsk(null)}
          onDone={(claimant, vehicle) => {
            update({ freeagentClaimant: claimant, freeagentVehicle: vehicle });
            if (freeagentAsk === 'run') run({ claimant, vehicle });
            else setFreeagentAsk(null);
          }}
        />
      ) : null}
      <Dialog
        visible={sentAsk}
        title={t('export.sentTitle')}
        body={t('export.sentBody')}
        onClose={() => {
          setSentAsk(false);
          onClose();
        }}
        actions={[
          {
            label: t('export.sentNo'),
            onPress: () => {
              setSentAsk(false);
              onClose();
            },
          },
          {
            label: t('export.sentYes'),
            onPress: () => {
              // Q29: everything of the period in these files is now "Exported".
              markExported(db, period, includePersonal);
              setSentAsk(false);
              onClose();
            },
          },
        ]}
      />
    </View>
  );
}

const mtdTitle = (count: number, p: ReportPeriod) => {
  const name = p.mode === 'year' ? p.year.label : p.mode === 'custom' ? p.label : p.mode.toUpperCase();
  return count === 1 ? t('mtd.export.unsortedMtdTitleOne', { period: name }) : t('mtd.export.unsortedMtdTitle', { count, period: name });
};

function countPhotos(p: ReportPeriod): number {
  return listEntries(db, { period: p, withReceipt: true }).reduce((n, e) => n + e.receiptCount, 0);
}

/** "Your name in FreeAgent" (asked once, saved) + the van's engine for FreeAgent's mileage file. */
function FreeAgentSheet({
  initialName,
  initialVehicle,
  onClose,
  onDone,
}: {
  initialName: string;
  initialVehicle: FreeAgentVehicle;
  onClose: () => void;
  onDone: (claimant: string, vehicle: FreeAgentVehicle) => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);
  const [vehicle, setVehicle] = useState(initialVehicle);
  return (
    <Sheet
      visible
      onClose={onClose}
      footer={<Button label={t('mtd.export.freeagentContinue')} full disabled={!name.trim()} onPress={() => onDone(name.trim(), vehicle)} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.faIcon, { backgroundColor: colors.surfaceAlt }]}>
          <FileText size={22} color={colors.text} />
        </View>
        <Txt v="h2" accessibilityRole="header">
          {t('mtd.export.freeagentTitle')}
        </Txt>
      </View>
      <Field
        label={t('mtd.export.freeagentName')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
      />
      <Txt v="small" c="textSecondary">
        {t('mtd.export.freeagentNameHint')}
      </Txt>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {t('mtd.export.freeagentEngine')}
      </Txt>
      <ChipRow>
        {FREEAGENT_ENGINE_TYPES.map((e) => (
          <Chip key={e} size="s" label={e} state={vehicle.engineType === e ? 'on' : 'default'} onPress={() => setVehicle(fixEngineSize({ ...vehicle, engineType: e }))} />
        ))}
      </ChipRow>
      {freeAgentEngineSizes(vehicle.engineType).length > 1 ? (
        <>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {t('mtd.export.freeagentEngineSize')}
          </Txt>
          <ChipRow>
            {freeAgentEngineSizes(vehicle.engineType).map((s) => (
              <Chip key={s} size="s" label={s} state={vehicle.engineSize === s ? 'on' : 'default'} onPress={() => setVehicle({ ...vehicle, engineSize: s })} />
            ))}
          </ChipRow>
        </>
      ) : null}
      <Txt v="small" c="textSecondary">
        {t('mtd.export.freeagentSaved')}
      </Txt>
    </Sheet>
  );
}

/** The incoming period, the whole tax year and its quarters (MTD periods as chosen), plus the previous tax year. */
function periodOptions(initial: ReportPeriod, region: Region, mtd: 'standard' | 'calendar'): ReportPeriod[] {
  const y = initial.year.startYear;
  const opts = { mtd: initial.mtd ?? mtd, ytd: initial.ytd };
  const modes: PeriodMode[] = ['year', 'q1', 'q2', 'q3', 'q4'];
  const list = modes.map((m) => periodFor(region, y, m, undefined, opts));
  const same = (a: ReportPeriod) => a.start === initial.start && a.end === initial.end;
  return [...(list.some(same) ? [] : [initial]), ...list, periodFor(region, y - 1, 'year')];
}

/** Yellow progress ring with a page in the middle (mockup S-10 "Preparing your files…"). */
function Spinner() {
  const { colors } = useTheme();
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ width: 88, height: 88 }} accessibilityRole="progressbar">
      <Svg width={88} height={88} style={StyleSheet.absoluteFill}>
        <Circle cx={44} cy={44} r={36} fill="none" stroke={colors.surfaceAlt} strokeWidth={8} />
        <Path d="M36 30h12l6 6v22H36z" fill="none" stroke={colors.text} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg width={88} height={88}>
          <Circle
            cx={44}
            cy={44}
            r={36}
            fill="none"
            stroke={colors.sun}
            strokeWidth={8}
            strokeDasharray="226"
            strokeDashoffset={150}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  select: { minHeight: 60, borderRadius: radius.input, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  list: { borderWidth: 1, borderRadius: radius.input, overflow: 'hidden' },
  opt: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  group: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 8 },
  box: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 12, borderRadius: radius.card, borderWidth: 1, paddingHorizontal: 16 },
  note: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10 },
  warn: { borderRadius: 16, padding: 16, gap: 6 },
  faIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
