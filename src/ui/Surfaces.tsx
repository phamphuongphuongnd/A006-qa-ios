import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, useTheme } from '@/theme';

export type CardVariant = 'default' | 'sun' | 'navy' | 'warn';

/** `.card` (+ `.sun` / `.navy` / `.warn`). Pass onPress to make the whole card tappable. */
export function Card({
  children,
  variant = 'default',
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const skin: ViewStyle =
    variant === 'sun'
      ? { backgroundColor: colors.sunSoft, borderColor: 'rgba(245,184,65,0.7)', borderWidth: 1.5 }
      : variant === 'navy'
        ? { backgroundColor: colors.navyCard, borderWidth: 0 }
        : variant === 'warn'
          ? { backgroundColor: colors.expenseSoft, borderColor: colors.expense, borderWidth: 1.5 }
          : { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, skin, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, skin, style]}>{children}</View>;
}

/** `.hr` hairline. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.line }, style]} />;
}

/** `.grp` settings group: rounded surface whose children are separated by hairlines. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={[styles.grp, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** `.dot` — the yellow "unsorted" dot. */
export function Dot({ color }: { color?: string }) {
  const { colors } = useTheme();
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color ?? colors.sun }} />;
}

/** `.prog` — yellow progress bar (0..1). */
export function Progress({ value }: { value: number }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={{ height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: 5, backgroundColor: colors.sun }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 16 },
  grp: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
});
