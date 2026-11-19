import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Polyline, Text as SvgText } from 'react-native-svg';

import { formatMoney } from '@/domain/money';
import type { Currency, Minor } from '@/domain/types';
import { t } from '@/i18n';
import { chartHues, fonts, useTheme } from '@/theme';
import { Dot, Txt, useStackedRows } from '@/ui';

import { linePoints, type MonthPoint } from './series';

export interface Bar {
  key: string;
  name: string;
  totalMinor: Minor;
  unsorted: boolean;
  onPress?: () => void;
}

/** "Expenses by category": name · amount · % with a horizontal bar scaled to the largest (mockup S-09). */
export function CategoryBars({ bars, currency }: { bars: Bar[]; currency: Currency }) {
  const { colors } = useTheme();
  const total = bars.reduce((n, b) => n + b.totalMinor, 0);
  const max = Math.max(1, ...bars.map((b) => b.totalMinor));
  // B-110 v2: big text on a narrow phone — name, then amount, then % each get the full width.
  const stacked = useStackedRows();
  return (
    <View style={{ gap: 8 }}>
      {bars.map((b) => {
        const pct = total > 0 ? (b.totalMinor / total) * 100 : 0;
        const amount = formatMoney(b.totalMinor, currency);
        return (
          <Pressable
            key={b.key}
            accessibilityRole="button"
            accessibilityLabel={`${b.name}, ${amount}, ${pct.toFixed(1)}%`}
            accessibilityHint={t('reports.barHint')}
            onPress={b.onPress}
            style={({ pressed }) => [{ gap: 4, paddingVertical: 4, opacity: pressed ? 0.7 : 1 }]}>
            {/* QA-100 A37-9: at 320dp + 200% the name was cut to "Eq..": it keeps a usable width (2 lines) and the
                amount + % move under it when the row is too narrow. */}
            <View style={stacked ? { gap: 2 } : { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, flexShrink: 1, flexBasis: stacked ? 'auto' : 130 }}>
                {b.unsorted ? <Dot /> : null}
                <Txt v="small" numberOfLines={stacked ? 3 : 2} style={{ flexShrink: 1, fontFamily: fonts.bold }}>
                  {b.name}
                </Txt>
              </View>
              <View style={stacked ? { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 } : { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <Txt v="small" style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}>
                  {amount}
                </Txt>
                <Txt v="small" c="textTertiary" style={stacked ? { fontVariant: ['tabular-nums'] } : { minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                  {pct.toFixed(1)}%
                </Txt>
              </View>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.max(2, (b.totalMinor / max) * 100)}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: b.unsorted ? colors.sun : chartHues.expense,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const H = 150;
const TOP = 10;
const BOTTOM = 130;
const PAD = 20;

/** "Income vs expenses by month" line chart (mockup S-09 scrolled). */
export function MonthlyLines({ months, currency }: { months: MonthPoint[]; currency: Currency }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...months.map((m) => Math.max(m.incomeMinor, m.expenseMinor)));
  const box = { width, top: TOP, bottom: BOTTOM, padX: PAD };
  const inc = linePoints(months.map((m) => m.incomeMinor), max, box);
  const exp = linePoints(months.map((m) => m.expenseMinor), max, box);
  const last = (pts: string) => pts.split(' ').pop()?.split(',').map(Number) ?? [0, 0];
  const step = months.length > 1 ? (width - PAD * 2) / (months.length - 1) : 0;
  // Label every 3rd month plus the last one, skipping a label that would collide with the last.
  const labelAt = (i: number) => i === months.length - 1 || (i % 3 === 0 && months.length - 1 - i >= 2);
  const lastM = months[months.length - 1];
  const summary = lastM
    ? `${lastM.label}: ${t('reports.income')} ${formatMoney(lastM.incomeMinor, currency)}, ${t('reports.expenses')} ${formatMoney(lastM.expenseMinor, currency)}`
    : '';

  return (
    <View style={{ gap: 10 }} accessible accessibilityLabel={`${t('reports.byMonth')}. ${summary}`}>
      <View style={{ height: H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={H}>
            <Path d={`M0 ${BOTTOM}h${width}M0 70h${width}M0 ${TOP}h${width}`} stroke={colors.line} strokeWidth={1} />
            <Polyline points={inc} fill="none" stroke={chartHues.income} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points={exp} fill="none" stroke={chartHues.expense} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={last(inc)[0]} cy={last(inc)[1]} r={4.5} fill={chartHues.income} />
            <Circle cx={last(exp)[0]} cy={last(exp)[1]} r={4.5} fill={chartHues.expense} />
            {months.map((m, i) =>
              labelAt(i) ? (
                <SvgText
                  key={m.start}
                  x={months.length > 1 ? PAD + i * step : width / 2}
                  y={H - 3}
                  fill={colors.textTertiary}
                  fontSize={11}
                  fontFamily={fonts.medium}
                  textAnchor="middle">
                  {m.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Legend color={chartHues.income} label={t('reports.income')} />
        <Legend color={chartHues.expense} label={t('reports.expenses')} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: color }} />
      <Txt v="small">{label}</Txt>
    </View>
  );
}
