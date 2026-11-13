import type { ProFeature } from '@/domain/pro';
import { router } from '@/services/router';

/**
 * Open S-19 from a Pro lock ("PRO" label, first touch of a Pro feature). S1–S4 call this; S5 builds the screen and
 * reads `feature` for the sheet subtitle (pro.context.<feature>). Never blocks what the driver was doing.
 */
export function openPro(feature?: ProFeature): void {
  router.push(feature ? `/pro?feature=${feature}` : '/pro');
}
