import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { t } from '@/i18n';

/**
 * App-icon long-press shortcuts (F-02): New expense / New income / Start trip.
 * Mounted on Home (always mounted after onboarding, inside the router), which also routes the tapped action.
 */
export function useAppShortcuts() {
  useEffect(() => {
    QuickActions.setItems([
      {
        id: 'expense',
        title: t('capture.quickExpense'),
        icon: Platform.OS === 'ios' ? 'symbol:minus.circle' : undefined,
        params: { href: '/capture?type=expense' },
      },
      {
        id: 'income',
        title: t('capture.quickIncome'),
        icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : undefined,
        params: { href: '/capture?type=income' },
      },
      {
        id: 'trip',
        title: t('capture.quickTrip'),
        icon: Platform.OS === 'ios' ? 'symbol:flag' : undefined,
        params: { href: '/trip/active?start=1' },
      },
    ]).catch(() => {
      // Not supported (e.g. web / old launcher): nothing to do.
    });
  }, []);
  useQuickActionRouting();
}
