import { useWindowDimensions } from 'react-native';

import { t } from '@/i18n';
import { router } from '@/services/router';
import { Fab } from '@/ui';
import { Plus } from '@/ui/icons';

/**
 * FAB "+" on every tab except Home: opens Quick capture as an expense (product.md §4, F-02).
 * QA-100 (B-89 follow-up): left out in a short window (split screen ~436dp) where it covered rows and buttons.
 */
export function CaptureFab() {
  const { height } = useWindowDimensions();
  if (height < 520) return null;
  return <Fab icon={Plus} label={t('entries.newEntry')} onPress={() => router.push('/capture?type=expense')} />;
}
