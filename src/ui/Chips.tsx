import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, useTheme, type ColorName } from '@/theme';

export type ChipState = 'default' | 'on' | 'best';

/** `.chip` — default / `.on` (selected, navy) / `.best` (top suggestion, yellow ring). Sizes s=36, md=44, lg=52. */
export function Chip({
  label,
  onPress,
  state = 'default',
  size = 'md',
  icon: Icon,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  state?: ChipState;
  size?: 's' | 'md' | 'lg';
  icon?: LucideIcon;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const h = size === 's' ? 36 : size === 'lg' ? 52 : 44;
  const bg = state === 'on' ? colors.primary : state === 'best' ? colors.sunSoft : colors.surface;
  const fg = state === 'on' ? colors.onPrimary : colors.text;
  const border = state === 'on' ? 'transparent' : state === 'best' ? colors.sun : colors.lineStrong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: state === 'on' }}
      onPress={onPress}
      hitSlop={size === 's' ? 6 : 2}
      style={({ pressed }) => [
        styles.chip,
        {
          height: h,
          borderRadius: h / 2,
          paddingHorizontal: size === 's' ? 12 : size === 'lg' ? 18 : 16,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: state === 'best' ? 2.5 : 1.5,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {Icon && <Icon size={size === 's' ? 16 : 18} color={fg} strokeWidth={2} />}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.6}
        style={{ color: fg, fontSize: size === 's' ? 14 : size === 'lg' ? 16 : 15, fontFamily: state === 'best' ? fonts.bold : fonts.semibold }}>
        {label}
      </Text>
    </Pressable>
  );
}

export type TagKind = 'work' | 'personal' | 'unsorted' | 'neutral';

const TAG: Record<TagKind, { bg: ColorName; fg: ColorName }> = {
  work: { bg: 'workSoft', fg: 'work' },
  personal: { bg: 'personalSoft', fg: 'personal' },
  unsorted: { bg: 'sunSoft', fg: 'sunText' },
  neutral: { bg: 'surfaceAlt', fg: 'textSecondary' },
};

/** `.tag` — 24dp pill label. */
export function Tag({ kind, label }: { kind: TagKind; label: string }) {
  const { colors } = useTheme();
  const t = TAG[kind];
  return (
    <View style={[styles.tag, { backgroundColor: colors[t.bg] }]}>
      <Text maxFontSizeMultiplier={1.6} style={{ color: colors[t.fg], fontSize: 12, fontFamily: fonts.bold }}>
        {label}
      </Text>
    </View>
  );
}

export type AvatarKind = 'unsorted' | 'expense' | 'income' | 'neutral' | 'work';

const AV: Record<AvatarKind, { bg: ColorName; fg: ColorName }> = {
  unsorted: { bg: 'sunSoft', fg: 'sunText' },
  expense: { bg: 'expenseSoft', fg: 'expenseText' },
  income: { bg: 'incomeSoft', fg: 'incomeText' },
  neutral: { bg: 'surfaceAlt', fg: 'textSecondary' },
  work: { bg: 'workSoft', fg: 'work' },
};

/** `.av` — 44dp round icon holder. Unsorted shows "?". `tint` overrides with a category colour. */
export function Avatar({ kind, icon: Icon, tint, size = 44 }: { kind: AvatarKind; icon?: LucideIcon; tint?: string; size?: number }) {
  const { colors } = useTheme();
  const a = AV[kind];
  const fg = tint ?? colors[a.fg];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint ? `${tint}22` : colors[a.bg],
      }}>
      {kind === 'unsorted' && !Icon ? (
        <Text style={{ color: fg, fontSize: 18, fontFamily: fonts.extrabold }}>?</Text>
      ) : Icon ? (
        <Icon size={22} color={fg} strokeWidth={2} />
      ) : null}
    </View>
  );
}

/** Horizontal wrap of chips (`.chips`). */
export function ChipRow({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8 }}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { height: 24, borderRadius: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});
