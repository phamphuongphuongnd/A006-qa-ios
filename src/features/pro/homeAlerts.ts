import { db } from '@/db/client';
import { getProState } from '@/db/proRepo';
import { renewalNoticeAt } from '@/domain/pro';
import { useLive } from '@/state/useLive';

/** Pro renewal card (P1-11): from 7 days before an auto-renewing subscription renews until it renews. */
export function useProRenewalSignal(now: number): { due: boolean; renewsAt: number | null } {
  'use no memo';
  const row = useLive(() => getProState(db), [], ['pro_state']);
  const from = renewalNoticeAt(row);
  const renewsAt = row?.expiresAt ?? null;
  return { due: from !== null && renewsAt !== null && now >= from && now < renewsAt, renewsAt };
}
