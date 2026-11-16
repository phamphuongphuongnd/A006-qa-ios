// Known routes (P1-2) live in S2's `src/features/rules/knownRoutes.ts`; trips call them through here.
import type { AppDb } from '@/db/types';
import type { Scope } from '@/domain/types';
import { knownRouteScope, recordKnownRoute } from '@/features/rules/knownRoutes';

import type { LatLng } from './classify';

/** Scope of a known route between these ends (≥ 3 sorts the same way), or null. */
export function routeScopeFor(db: AppDb, start: LatLng, end: LatLng): Scope | null {
  try {
    return knownRouteScope(db, start, end);
  } catch {
    return null;
  }
}

/** The driver sorted this trip by hand (Miles swipe, Trip detail, End sheet): teach the known routes. */
export function recordRoute(db: AppDb, tripId: string, scope: Scope): void {
  try {
    recordKnownRoute(db, tripId, scope);
  } catch {
    // Learning a route never blocks sorting the trip.
  }
}
