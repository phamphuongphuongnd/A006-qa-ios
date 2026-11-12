import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Check, ChevronDown, ChevronUp, Download, Info, X } from '@/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { db } from '@/db/client';
import { unsortedCount } from '@/db/entriesRepo';
import type { Region } from '@/domain/types';
import { withLockSuspended } from '@/features/settings/lockState';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, radius, useTheme } from '@/theme';
import { Button, Dialog, IconButton, Toggle, Txt } from '@/ui';

import { buildExport, ExportCancelled, NothingToExport } from './buildExport';
import { DEFAULT_EXPORT, EXPORT_KINDS, type ExportKind } from './exportDocs';
import { periodFor, type PeriodMode, type ReportPeriod } from './period';

const KIND_LABEL: Record<ExportKind, () => string> = {
  entriesCsv: () => t('export.entriesCsv'),
  totalsCsv: () => t('export.totalsCsv'),
  mileageCsv: () => t('export.mileageCsv'),
  pdf: () => t('export.pdf'),
  receiptsZip: () => t('export.receiptsZip'),
};

/**
 * S-10 Export: period, file checklist, "Include personal entries", MTD note (UK), unsorted warning, progress, share.
 * Used inside a bottom sheet on Reports and as the /export screen from Settings.
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
  const { colors } = useTheme();
  const { settings } = useSettings();
  const [period, setPeriod] = useState(initial);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [kinds, setKinds] = useState<ExportKind[]>(DEFAULT_EXPORT);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [unsortedAsk, setUnsortedAsk] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);

  const options = periodOptions(initial, region);
  const toggle = (k: ExportKind) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : EXPORT_KINDS.filter((x) => x === k || ks.includes(x))));

  const start = () => {
    const n = unsortedCount(db, period);
    if (n > 0) setUnsortedAsk(n);
    else run();
  };

  const run = async () => {
    setUnsortedAsk(null);
    cancelled.current = false;
    setBusy(true);
    try {
      const out = await buildExport({ period, kinds, includePersonal, region, settings, isCancelled: () => cancelled.current });
      if (cancelled.current) return;
      if (!(await Sharing.isAvailableAsync())) {
        onClose({ message: t('export.shareUnavailable'), error: true });
        return;
      }
      await withLockSuspended(() =>
        Sharing.shareAsync(out.file.uri, { mimeType: out.mimeType, UTI: out.uti, dialogTitle: t('export.title') }),
      );
      onClose();
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
          {kinds.map((k) => KIND_LABEL[k]()).join(' · ')}
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
        <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {t('export.period')}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('export.period')}, ${period.label}`}
          accessibilityState={{ expanded: periodOpen }}
          onPress={() => setPeriodOpen((o) => !o)}
          style={[styles.select, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
          <Txt style={{ flex: 1, fontFamily: fonts.bold }}>{period.label}</Txt>
          {periodOpen ? <ChevronUp size={18} color={colors.textTertiary} /> : <ChevronDown size={18} color={colors.textTertiary} />}
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

      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {t('export.files')}
      </Txt>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {EXPORT_KINDS.map((k, i) => {
          const on = kinds.includes(k);
          return (
            <Pressable
              key={k}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(k)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}>
              <View
                style={[
                  styles.box,
                  on ? { backgroundColor: colors.primary } : { borderWidth: 2, borderColor: colors.lineStrong },
                ]}>
                {on ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
              </View>
              <Txt style={{ flex: 1, fontFamily: on ? fonts.bold : fonts.regular }}>{KIND_LABEL[k]()}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: 12 }}>
        <Txt style={{ flex: 1 }}>{t('export.includePersonal')}</Txt>
        <Toggle value={includePersonal} onChange={setIncludePersonal} label={t('export.includePersonal')} />
      </View>

      {region === 'UK' ? (
        <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
          <Info size={20} color={colors.textSecondary} />
          <Txt v="caption" c="textSecondary" style={{ flex: 1, fontFamily: fonts.medium }}>
            {t('export.mtdNote')}
          </Txt>
        </View>
      ) : null}

      <Button label={t('export.export')} icon={Download} full disabled={kinds.length === 0} onPress={start} />
      {kinds.length === 0 ? (
        <Txt v="small" c="textSecondary" center>
          {t('export.pickOne')}
        </Txt>
      ) : null}

      <Dialog
        visible={unsortedAsk !== null}
        title={unsortedAsk === 1 ? t('export.unsortedTitleOne') : t('export.unsortedTitle', { count: unsortedAsk ?? 0 })}
        body={t('export.unsortedBody')}
        onClose={() => setUnsortedAsk(null)}
        actions={[
          { label: t('export.exportAnyway'), onPress: run },
          {
            label: t('export.sortFirst'),
            variant: 'sun',
            onPress: () => {
              setUnsortedAsk(null);
              onClose();
              router.push('/sort');
            },
          },
        ]}
      />
    </View>
  );
}

/** The incoming period, the whole tax year and its quarters, plus the previous tax year. */
function periodOptions(initial: ReportPeriod, region: Region): ReportPeriod[] {
  const y = initial.year.startYear;
  const modes: PeriodMode[] = ['year', 'q1', 'q2', 'q3', 'q4'];
  const list = [
    ...(initial.mode === 'custom' ? [initial] : []),
    ...modes.map((m) => periodFor(region, y, m)),
    periodFor(region, y - 1, 'year'),
  ];
  return list;
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
  select: { minHeight: 48, borderRadius: radius.input, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  list: { borderWidth: 1, borderRadius: radius.input, overflow: 'hidden' },
  opt: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  group: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 16 },
  box: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10 },
});
