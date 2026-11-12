import type { BottomTabBarProps } from 'expo-router/tabs';
import { BarChart3, Gauge, Home, Layers, List, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/theme';

const ICONS: Record<string, LucideIcon> = { index: Home, entries: List, sort: Layers, miles: Gauge, reports: BarChart3 };

/**
 * `.tabs` from the mockup: 5 equal columns, active tab gets a yellow pill behind its icon and bold label;
 * badge = `tabBarBadge` option (Sort tab: unsorted count).
 */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // A screen can hide the bar (Entries multi-select shows its own action bar there).
  const focusedStyle = StyleSheet.flatten(descriptors[state.routes[state.index].key]?.options.tabBarStyle);
  if (focusedStyle?.display === 'none') return null;
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const on = state.index === i;
        const Icon = ICONS[route.name] ?? Home;
        const label = (options.title ?? route.name) as string;
        const badge = options.tabBarBadge;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={badge ? `${label}, ${badge} to sort` : label}
            onPress={() => navigateToTab(route.key)}
            style={styles.tab}>
            <View style={[styles.pill, on && { backgroundColor: colors.sunSoft }]}>
              <Icon size={24} color={on ? colors.text : colors.textTertiary} strokeWidth={2} />
            </View>
            <Text
              maxFontSizeMultiplier={1.4}
              numberOfLines={1}
              style={{ fontSize: 12, lineHeight: 16, color: on ? colors.text : colors.textTertiary, fontFamily: on ? fonts.extrabold : fonts.semibold }}>
              {label}
            </Text>
            {badge !== undefined ? (
              <View style={[styles.badge, { backgroundColor: colors.sun, borderColor: colors.surface }]}>
                <Text style={{ fontSize: 12, color: '#1F2A44', fontFamily: fonts.extrabold }}>{String(badge)}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 6, paddingHorizontal: 4, borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56 },
  pill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    left: '50%',
    marginLeft: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
