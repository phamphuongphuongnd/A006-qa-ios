import type { TripRow } from '@/db/schema';
import { tripRoute } from '@/db/tripsRepo';
import { usePro } from '@/state/pro';

import type { RouteOption } from '../TripForm';
import { EMPTY_ROUTE, type RouteFormState } from '../tripFormCheck';
import { hasRouteService } from './ors';

/** S-08 A → B option for this build / plan (Q25): hidden without a service key, locked on the free plan. */
export function useRouteOption(): RouteOption {
  const { pro } = usePro();
  if (!hasRouteService()) return 'hidden';
  return pro ? 'available' : 'locked';
}

/** Form state for an existing A → B trip: one-way metres from the stored (maybe doubled) distance. */
export function routeFormOf(trip: TripRow): RouteFormState {
  const r = tripRoute(trip);
  if (!r) return EMPTY_ROUTE;
  return { from: r.from, to: r.to, roundTrip: r.roundTrip, meters: trip.distanceM / (r.roundTrip ? 2 : 1) };
}
