import type { LucideIcon } from '@/ui/icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, radius, touch, useTheme } from '@/theme';

import { useReportFabTop } from './Overlays';
import { Txt } from './Txt';

/**
 * Screen shell matching the mockup `.top` + `.scr`: big h1 title (or custom header), scrolling body, optional
 * fixed bottom area (e.g. Home capture buttons). Tab screens keep the tab bar below.
 */
export function Screen({
  title,
  subtitle,
  headerRight,
  headerLeft,
  header,
  children,
  bottom,
  scroll = true,
  contentStyle,
  topInset = true,
  bottomInset = false,
  fab,
  onEndReached,
  avoidKeyboard = false,
  scrollRef,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  headerLeft?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  bottom?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  topInset?: boolean;
  /** Pad the bottom bar above the system navigation bar (screens outside the tab bar, B-15). */
  bottomInset?: boolean;
  /** Floating button over the content, bottom-right (above `bottom` when both are set). */
  fab?: ReactNode;
  /** Scrolled to within one screen of the bottom (grow a long list in steps). */
  onEndReached?: () => void;
  /** Shrink above the on-screen keyboard so the `bottom` bar (e.g. Save) stays visible while typing (B-36). */
  avoidKeyboard?: boolean;
  /** The ScrollView (e.g. Miles scrolls to a row opened from a Home card). */
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // QA-100 (B-85 follow-up): in a short window (split screen, ~436dp) the floating "+" sat on the content's own
  // buttons ("Sort now") — leave it out there; Home's buttons and the widget still add entries.
  const { height } = useWindowDimensions();
  const showFab = !!fab && height >= 520;
  // With a FAB the last rows scroll clear of it (64dp button + 16dp margin + gap).
  const body = [{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: showFab ? 100 : 20, gap: 14 }, contentStyle];
  return (
    <KeyboardAvoidingView
      enabled={avoidKeyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset ? insets.top : 0 }}>
      {header ??
        (title || headerRight || headerLeft ? (
          <View style={[styles.top, { paddingHorizontal: GUTTER }]}>
            {headerLeft}
            <View style={{ flex: 1, minWidth: 0 }}>
              {title ? (
                // B-54: at 200% text a narrow title shrinks instead of breaking inside a word ("Mor / ning").
                <Txt v="h1" accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {title}
                </Txt>
              ) : null}
              {subtitle ? (
                <Txt v="small" c="textSecondary">
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            {headerRight ? <View style={{ flexShrink: 1, maxWidth: '62%' }}>{headerRight}</View> : null}
          </View>
        ) : null)}
      <View style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={body}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={onEndReached ? 200 : undefined}
            onScroll={
              onEndReached
                ? ({ nativeEvent: e }) => {
                    if (e.contentOffset.y + 2 * e.layoutMeasurement.height >= e.contentSize.height) onEndReached();
                  }
                : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, body]}>{children}</View>
        )}
        {showFab ? fab : null}
      </View>
      {bottom ? (
        <View
          style={[
            styles.bottom,
            { paddingHorizontal: GUTTER, borderTopColor: colors.line, backgroundColor: colors.background },
            bottomInset ? { paddingBottom: 12 + insets.bottom } : null,
          ]}>
          {bottom}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** `.gh` — section header row: title left, optional link right. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.gh}>
      <Txt v="h3" accessibilityRole="header">
        {title}
      </Txt>
      {action ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
          <Txt v="h3" c="primaryText">
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** `.li` — list row: leading avatar, title + subtitle, trailing content. */
export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
  divider,
  accessibilityLabel,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  divider?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.li,
        divider && { borderTopWidth: 1, borderTopColor: colors.line },
        pressed && onPress && { opacity: 0.7 },
      ]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="h3" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="small" c="textSecondary" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ? <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>{right}</View> : null}
    </Pressable>
  );
}

/** `.fab` — 64dp rounded-square floating action button above the tab bar. */
export function Fab({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const reportTop = useReportFabTop();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const focused = useRef(false);
  const measure = useCallback(() => {
    if (focused.current) ref.current?.measureInWindow((_x, y) => reportTop(y));
  }, [reportTop]);
  // Only the FAB of the screen in front counts: tab screens stay mounted behind each other.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      measure();
      return () => {
        focused.current = false;
        reportTop(null);
      };
    }, [measure, reportTop]),
  );
  return (
    <Pressable
      ref={ref}
      onLayout={measure}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { right: GUTTER, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Icon size={30} color={colors.onPrimary} strokeWidth={2.4} />
    </Pressable>
  );
}

/** `.rc` — receipt thumbnail: the real photo when there is one, otherwise the drawn paper slip. */
export function ReceiptThumb({ uri, size = 56, large, onPress }: { uri?: string | null; size?: number; large?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const box: ViewStyle = large
    ? { width: '100%', height: 168, borderRadius: 16 }
    : { width: size, height: size, borderRadius: 12 };
  const inner = uri ? (
    <Image source={{ uri }} style={[StyleSheet.absoluteFill]} resizeMode="cover" accessibilityIgnoresInvertColors />
  ) : (
    <View style={[styles.slip, large ? { left: '32%', right: '32%', top: 16 } : { left: size * 0.25, right: size * 0.25, top: 8 }]}>
      {Array.from({ length: large ? 9 : 5 }).map((_, i) => (
        <View key={i} style={{ height: 1.5, backgroundColor: '#DCD6CA', marginTop: large ? 10 : 6 }} />
      ))}
    </View>
  );
  const style = [box, { backgroundColor: colors.receiptPaper, overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.line }];
  return onPress ? (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel="Receipt photo" onPress={onPress} style={style}>
      {inner}
    </Pressable>
  ) : (
    <View style={style}>{inner}</View>
  );
}

/** Centered empty state: illustration slot, title, body, optional action. */
export function EmptyState({ art, title, body, action }: { art?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 }}>
      {art}
      <Txt v="h2" center accessibilityRole="header">
        {title}
      </Txt>
      {body ? (
        <Txt v="body" c="textSecondary" center>
          {body}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: 8, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 6 },
  bottom: { paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
  gh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  fab: {
    position: 'absolute',
    bottom: 16,
    width: touch.fab,
    height: touch.fab,
    borderRadius: radius.fab,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F2A44',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  slip: { position: 'absolute', bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 4, borderTopColor: '#FFFFFF', transform: [{ rotate: '-4deg' }], elevation: 2 },
});
