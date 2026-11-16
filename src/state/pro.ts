import { db } from '@/db/client';
import { getProState, photosUsedThisMonth } from '@/db/proRepo';
import { hasPro, monthOf, photoAllowance, proStatus, type ProStatus } from '@/domain/pro';
import { useNow } from '@/features/entries/useNow';

import { useLive } from './useLive';

/**
 * Pro status for screens: re-reads when pro_state changes and every minute (a trial ends on its own).
 * Background code (trip detection, recurring generator, rules) calls `getProStatus(db)` from db/proRepo instead.
 */
export function usePro(): { status: ProStatus; pro: boolean } {
  'use no memo';
  const now = useNow(60_000);
  const row = useLive(() => getProState(db), [], ['pro_state', 'settings']);
  const status = proStatus(row, now);
  return { status, pro: hasPro(status) };
}

/** "18 of 20 photos left this month" (P1-4). */
export function usePhotoAllowance() {
  'use no memo';
  const { pro } = usePro();
  const monthStart = monthOf(useNow(60_000)).start;
  const used = useLive(() => photosUsedThisMonth(db), [monthStart], ['receipts']);
  return photoAllowance(used, pro);
}
