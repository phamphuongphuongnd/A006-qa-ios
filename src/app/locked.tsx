import { LockedView } from '@/features/settings/LockedView';
import { goBack } from '@/features/settings/ui';

/**
 * S-13 as a route (preview / deep link). The real lock is the overlay in `LockGate` (src/services/data.tsx),
 * which keeps the screens underneath mounted.
 */
export default function LockedScreen() {
  return <LockedView onUnlock={goBack} />;
}
