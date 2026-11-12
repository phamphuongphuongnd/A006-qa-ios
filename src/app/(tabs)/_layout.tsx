import { Tabs } from 'expo-router';

import { db } from '@/db/client';
import { unsortedCount } from '@/db/entriesRepo';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  const unsorted = useLive(() => unsortedCount(db), [], ['entries']);
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="entries" options={{ title: t('tabs.entries') }} />
      <Tabs.Screen
        name="sort"
        options={{ title: t('tabs.sort'), tabBarBadge: unsorted > 0 ? (unsorted > 99 ? '99+' : unsorted) : undefined }}
      />
      <Tabs.Screen name="miles" options={{ title: t('tabs.miles') }} />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports') }} />
    </Tabs>
  );
}
