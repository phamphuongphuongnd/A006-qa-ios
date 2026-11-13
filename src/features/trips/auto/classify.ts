// Pure: Work / Personal for an automatic trip (P1-2, P1-3) and the work-hours helper behind it.
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

export interface ClassifyInput {
  startedAt: number;
  endedAt: number;
  /** Known route between the trip's ends (S2 `knownRouteScope`, ≥ 3 sorts the same way), or null. */
  routeScope: Scope | null;
  /** The van Bluetooth connected during (or just before) the trip. */
  vanConnected: boolean;
  workHours: WorkHoursCfg;
}

/**
 * Sure → a scope and why; not sure → 'unsorted' (waits in the Sort queue). Order:
 * outside work hours → Personal (P1-3: still recorded) · known route · van Bluetooth → Work ·
 * inside work hours → Work.
 */
export function classifyTrip(i: ClassifyInput): { scope: Scope | 'unsorted'; by: TripClassifiedBy | null } {
  const wh = i.workHours;
  if (wh.on && !inWorkHours(wh, i.startedAt)) return { scope: 'personal', by: 'work_hours' };
  if (i.routeScope) return { scope: i.routeScope, by: 'route' };
  if (i.vanConnected) return { scope: 'work', by: 'bluetooth' };
  if (wh.on) return { scope: 'work', by: 'work_hours' };
  return { scope: 'unsorted', by: null };
}
