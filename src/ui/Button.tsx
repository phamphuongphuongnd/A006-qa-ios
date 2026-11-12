import type { LucideIcon } from '@/ui/icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, radius, touch, useTheme, type ColorName } from '@/theme';

export type ButtonVariant = 'primary' | 'outline' | 'text' | 'danger' | 'dangerOutline' | 'income' | 'expense' | 'sun';
export type ButtonSize = 'md' | 'sm' | 'big';

const SKIN: Record<ButtonVariant, { bg: ColorName | null; fg: ColorName; border?: ColorName; borderW?: number }> = {
  primary: { bg: 'primary', fg: 'onPrimary' },
  outline: { bg: null, fg: 'text', border: 'lineStrong', borderW: 1.5 },
  text: { bg: null, fg: 'primaryText' },
  danger: { bg: 'error', fg: 'onError' },
  dangerOutline: { bg: null, fg: 'expenseText', border: 'expenseText', borderW: 2 },
  income: { bg: 'incomeButton', fg: 'onIncomeButton' },
  expense: { bg: 'expenseButton', fg: 'onExpenseButton' },
  sun: { bg: 'sun', fg: 'primary' },
};

/** `.btn` from sunday.css. `big` = the 72dp Expense / Income capture buttons. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled,
  loading,
  full,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const s = SKIN[variant];
  const fg = colors[s.fg];
  const h = size === 'big' ? touch.bigCapture : size === 'sm' ? touch.min : touch.primary;
  const r = size === 'big' ? radius.bigCapture : size === 'sm' ? radius.buttonSmall : radius.button;
  const fontSize = size === 'big' ? 20 : size === 'sm' ? 15 : 17;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: h,
          borderRadius: r,
          paddingHorizontal: size === 'big' ? 12 : variant === 'text' ? 14 : size === 'sm' ? 18 : 24,
          backgroundColor: s.bg ? colors[s.bg] : 'transparent',
          borderColor: s.border ? colors[s.border] : 'transparent',
          borderWidth: s.borderW ?? 0,
          opacity: disabled ? 0.36 : pressed ? 0.85 : 1,
        },
        full && { alignSelf: 'stretch' },
        size === 'big' && { flex: 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={size === 'big' ? 28 : 22} color={fg} strokeWidth={2.2} />}
          <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ color: fg, fontSize, fontFamily: fonts.bold }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** `.ib` round 48dp icon button; `filled` = `.ib.f` (surface + hairline). */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  filled,
  color,
  size = 48,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  filled?: boolean;
  color?: ColorName;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        filled && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
      ]}>
      <Icon size={24} color={colors[color ?? 'text']} strokeWidth={2} />
    </Pressable>
  );
}

/** `.rb` + `.rbl`: 56dp round outlined button with a caption under it (Quick capture row). */
export function RoundButton({
  icon: Icon,
  label,
  onPress,
  active,
  activeColor = 'primary',
  onLongPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  active?: boolean;
  activeColor?: ColorName;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.rbl}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.rb,
              {
                backgroundColor: active ? colors[activeColor] : colors.surface,
                borderColor: active ? colors[activeColor] : colors.lineStrong,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Icon size={24} color={active ? colors.onPrimary : colors.text} strokeWidth={2} />
          </View>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={{ maxWidth: 96, textAlign: 'center', fontSize: 13, fontFamily: fonts.semibold, color: colors.textSecondary }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rbl: { alignItems: 'center', gap: 6, minWidth: 64 },
  rb: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
