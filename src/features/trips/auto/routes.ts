// Seam to S2's known routes (P1-2): `src/features/rules/knownRoutes.ts` lives on branch s2-sort.
// TODO(merge S2): replace both bodies with calls to knownRouteScope / recordKnownRoute from '@/features/rules/knownRoutes'.
import type { AppDb } from '@/db/types';
import type { Scope } from '@/domain/types';

import type { LatLng } from './classify';

/** Scope of a known route between these ends (≥ 3 sorts the same way), or null. */
export function routeScopeFor(_db: AppDb, _start: LatLng, _end: LatLng): Scope | null {
  return null;
}

/** The driver sorted this trip by hand (Miles swipe, Trip detail, End sheet): teach the known routes. */
export function recordRoute(_db: AppDb, _tripId: string, _scope: Scope): void {}
