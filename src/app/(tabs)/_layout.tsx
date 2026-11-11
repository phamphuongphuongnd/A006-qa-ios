import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { db } from '@/db/client';
import { unsortedCount } from '@/db/entriesRepo';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const unsorted = unsortedCount(db);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), headerShown: false, tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="entries" options={{ title: t('tabs.entries'), tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen
        name="sort"
        options={{
          title: t('tabs.sort'),
          tabBarIcon: icon('layers-outline'),
          tabBarBadge: unsorted > 0 ? (unsorted > 99 ? '99+' : unsorted) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.sunday, color: '#1A1D24' },
        }}
      />
      <Tabs.Screen name="miles" options={{ title: t('tabs.miles'), tabBarIcon: icon('speedometer-outline') }} />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports'), tabBarIcon: icon('bar-chart-outline') }} />
    </Tabs>
  );
}
