import { t } from '@/i18n';
import { router } from '@/services/router';
import { Fab } from '@/ui';
import { Plus } from '@/ui/icons';

/** FAB "+" on every tab except Home: opens Quick capture as an expense (product.md §4, F-02). */
export function CaptureFab() {
  return <Fab icon={Plus} label={t('entries.newEntry')} onPress={() => router.push('/capture?type=expense')} />;
}
