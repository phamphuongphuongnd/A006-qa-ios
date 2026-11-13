// Pure: Work / Personal for an automatic trip (P1-2, P1-3) and the work-hours / known-route helpers behind it.
import { haversine } from '@/domain/mileage';
import type { Scope, TripClassifiedBy } from '@/domain/types';

export interface WorkHoursCfg {
  on: boolean;
  /** 0 = Sunday … 6. */
  days: number[];
  /** Minutes after midnight; endMin ≤ startMin means the shift runs past midnight. */
  startMin: number;
  endMin: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface KnownRoute {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  scope: Scope;
  count: number;
}

/** Start / end within this distance of a known route's ends = the same route (either direction). */
export const ROUTE_RADIUS_M = 400;
/** A route needs this many trips sorted the same way before it decides on its own (P1-2). */
export const ROUTE_MIN_COUNT = 3;

/** Is `at` (local time) inside the work hours? */
export function inWorkHours(wh: WorkHoursCfg, at: number): boolean {
  const d = new Date(at);
  const min = d.getHours() * 60 + d.getMinutes();
  if (wh.endMin > wh.startMin) return wh.days.includes(d.getDay()) && min >= wh.startMin && min < wh.endMin;
  // Overnight shift: the part after midnight belongs to the previous day's shift.
  if (min >= wh.startMin) return wh.days.includes(d.getDay());
  if (min < wh.endMin) return wh.days.includes((d.getDay() + 6) % 7);
  return false;
}

/** Known route matching this start → end (or end → start), most-used first. */
export function matchRoute(routes: KnownRoute[], start: LatLng, end: LatLng): KnownRoute | undefined {
  const near = (a: LatLng, lat: number, lng: number) => haversine(a, { lat, lng }) <= ROUTE_RADIUS_M;
  return routes
    .filter(
      (r) =>
        (near(start, r.startLat, r.startLng) && near(end, r.endLat, r.endLng)) ||
        (near(start, r.endLat, r.endLng) && near(end, r.startLat, r.startLng)),
    )
    .sort((a, b) => b.count - a.count)[0];
}

export interface ClassifyInput {
  startedAt: number;
  endedAt: number;
  start: LatLng | null;
  end: LatLng | null;
  /** The van Bluetooth connected during (or just before) the trip. */
  vanConnected: boolean;
  workHours: WorkHoursCfg;
  routes: KnownRoute[];
}

/**
 * Sure → a scope and why; not sure → 'unsorted' (waits in the Sort queue). Order:
 * outside work hours → Personal (P1-3: still recorded) · known route (≥ 3 sorted the same way) · van Bluetooth → Work ·
 * inside work hours → Work.
 */
export function classifyTrip(i: ClassifyInput): { scope: Scope | 'unsorted'; by: TripClassifiedBy | null } {
  const wh = i.workHours;
  if (wh.on && !inWorkHours(wh, i.startedAt)) return { scope: 'personal', by: 'work_hours' };
  if (i.start && i.end) {
    const r = matchRoute(i.routes, i.start, i.end);
    if (r && r.count >= ROUTE_MIN_COUNT) return { scope: r.scope, by: 'route' };
  }
  if (i.vanConnected) return { scope: 'work', by: 'bluetooth' };
  if (wh.on) return { scope: 'work', by: 'work_hours' };
  return { scope: 'unsorted', by: null };
}
