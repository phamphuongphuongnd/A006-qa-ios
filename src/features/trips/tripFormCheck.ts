import type { RoutePlace, TripRoute } from '@/db/tripsRepo';
import { haversine, metersToMiles, odometerMiles } from '@/domain/mileage';
import type { Scope } from '@/domain/types';
import { t } from '@/i18n';

import { inputToMiles, parseNumberInput, type DistanceUnit } from './format';
import { SAME_PLACE_M } from './route/places';

export type TripInputMode = 'odometer' | 'distance' | 'route';

/** A → B part of the form (Q25). `meters` = one-way driving distance once the route is known. */
export interface RouteFormState {
  from: RoutePlace | null;
  to: RoutePlace | null;
  roundTrip: boolean;
  meters: number | null;
}

export const EMPTY_ROUTE: RouteFormState = { from: null, to: null, roundTrip: false, meters: null };

export const samePlace = (a: RoutePlace, b: RoutePlace) =>
  a.label.trim().toLowerCase() === b.label.trim().toLowerCase() || haversine(a, b) < SAME_PLACE_M;

/** Miles saved for an A → B trip: one way, × 2 for a round trip, to 0.1 mi. */
export const routeMiles = (meters: number, roundTrip: boolean) => Math.round(metersToMiles(meters) * (roundTrip ? 2 : 1) * 10) / 10;

export interface TripFormValues {
  mode: TripInputMode;
  start: string;
  end: string;
  distance: string;
  date: number;
  scope: Scope;
  purpose: string;
  route?: RouteFormState;
}

export interface TripFormResult {
  date: number;
  scope: Scope;
  purpose: string;
  miles: number;
  odoStart?: number;
  odoEnd?: number;
  /** A → B ends (route mode), null = not an A → B trip, undefined = the form had no A → B option. */
  route?: TripRoute | null;
}

type Check =
  | { ok: true; miles: number; odo?: { start: number; end: number }; route?: TripRoute }
  | { ok: false; error: string | null };

/** Validates the form; `error` is null while a field is just empty (no red text yet). */
export function checkTripForm(v: TripFormValues, unit: DistanceUnit): Check {
  if (v.mode === 'route') {
    const r = v.route ?? EMPTY_ROUTE;
    if (!r.from || !r.to) return { ok: false, error: null };
    if (samePlace(r.from, r.to)) return { ok: false, error: t('autoTrip.route.samePlace') };
    if (r.meters === null) return { ok: false, error: null };
    const miles = routeMiles(r.meters, r.roundTrip);
    if (!(miles > 0)) return { ok: false, error: t('autoTrip.route.samePlace') };
    return { ok: true, miles, route: { from: r.from, to: r.to, roundTrip: r.roundTrip } };
  }
  if (v.mode === 'odometer') {
    const s = parseNumberInput(v.start);
    const e = parseNumberInput(v.end);
    if (v.start.trim() === '' || v.end.trim() === '') return { ok: false, error: null };
    if (s === null || e === null) return { ok: false, error: t('trip.invalidNumber') };
    const r = odometerMiles(s, e);
    if (!r.ok) return { ok: false, error: r.reason === 'end_before_start' ? t('miles.endBeforeStart') : t('trip.invalidNumber') };
    return { ok: true, miles: inputToMiles(r.miles, unit), odo: { start: s, end: e } };
  }
  if (v.distance.trim() === '') return { ok: false, error: null };
  const d = parseNumberInput(v.distance);
  if (d === null || d <= 0) return { ok: false, error: t('trip.invalidNumber') };
  return { ok: true, miles: inputToMiles(d, unit) };
}
