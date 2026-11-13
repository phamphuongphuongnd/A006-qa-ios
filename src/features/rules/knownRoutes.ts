import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { knownRoutes, tripPoints, type KnownRouteRow } from '@/db/schema';
import { newId, type AppDb } from '@/db/types';
import { MAX_ACCURACY_M } from '@/domain/mileage';
import type { Scope } from '@/domain/types';

/**
 * Known routes (P1-2, F-07 "Chuyến chắc chắn"): start / end areas the driver sorted the same way. Once a pair has
 * been sorted Work (or Personal) `ROUTE_SURE` times with no conflicting votes, automatic trips between the same areas
 * get that scope without asking (S1 calls `knownRouteScope`; classifiedBy = 'route').
 * Endpoints only (no polyline in the table): either direction counts as the same route.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Areas closer than this are "the same place" (a depot yard, a street of drops). */
export const ROUTE_RADIUS_M = 400;
/** Sorted the same way this many times → sure. */
export const ROUTE_SURE = 3;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

type RouteEnds = Pick<KnownRouteRow, 'startLat' | 'startLng' | 'endLat' | 'endLng'>;

/** Same pair of areas, in either direction. */
export function sameRoute(r: RouteEnds, start: LatLng, end: LatLng, radius = ROUTE_RADIUS_M): boolean {
  const s = { lat: r.startLat, lng: r.startLng };
  const e = { lat: r.endLat, lng: r.endLng };
  const near = (a: LatLng, b: LatLng) => distanceM(a, b) <= radius;
  return (near(s, start) && near(e, end)) || (near(s, end) && near(e, start));
}

/**
 * Scope the known routes agree on for a trip from `start` to `end`, or null when not sure:
 * one side has ≥ ROUTE_SURE sorts and the other side at most a third of that.
 */
export function routeScope(routes: (RouteEnds & { scope: Scope; count: number })[], start: LatLng, end: LatLng): Scope | null {
  const votes = { work: 0, personal: 0 };
  for (const r of routes) if (sameRoute(r, start, end)) votes[r.scope] += r.count;
  const [win, lose]: [Scope, Scope] = votes.work >= votes.personal ? ['work', 'personal'] : ['personal', 'work'];
  if (votes[win] < ROUTE_SURE) return null;
  return votes[lose] * 3 <= votes[win] ? win : null;
}

/** First and last usable GPS fix of a trip; null when it has fewer than two. */
export function tripEnds(db: AppDb, tripId: string): { start: LatLng; end: LatLng } | null {
  const ok = and(eq(tripPoints.tripId, tripId), sql`${tripPoints.accuracy} <= ${MAX_ACCURACY_M}`);
  const first = db.select().from(tripPoints).where(ok).orderBy(asc(tripPoints.ts)).get();
  const last = db.select().from(tripPoints).where(ok).orderBy(desc(tripPoints.ts)).get();
  if (!first || !last || first.id === last.id) return null;
  return { start: { lat: first.lat, lng: first.lng }, end: { lat: last.lat, lng: last.lng } };
}

/** S1: scope for an automatic trip between these points, from the driver's own sorting. */
export function knownRouteScope(db: AppDb, start: LatLng, end: LatLng): Scope | null {
  return routeScope(db.select().from(knownRoutes).all(), start, end);
}

/** Receipt for `forgetKnownRoute` (Undo). */
export type RouteRecord = { id: string; created: boolean } | null;

/**
 * The driver sorted this trip as `scope` (Sort trip card; Miles swipe may call it too): count one more vote for its
 * start / end pair. Returns null when the trip has no usable GPS ends (manual trips).
 */
export function recordKnownRoute(db: AppDb, tripId: string, scope: Scope, now = Date.now()): RouteRecord {
  const ends = tripEnds(db, tripId);
  if (!ends) return null;
  const existing = db
    .select()
    .from(knownRoutes)
    .where(eq(knownRoutes.scope, scope))
    .all()
    .find((r) => sameRoute(r, ends.start, ends.end));
  if (existing) {
    db.update(knownRoutes)
      .set({ count: existing.count + 1, lastSeenAt: now })
      .where(eq(knownRoutes.id, existing.id))
      .run();
    return { id: existing.id, created: false };
  }
  const id = newId();
  db.insert(knownRoutes)
    .values({ id, startLat: ends.start.lat, startLng: ends.start.lng, endLat: ends.end.lat, endLng: ends.end.lng, scope, count: 1, lastSeenAt: now })
    .run();
  return { id, created: true };
}

/** Undo of `recordKnownRoute`. */
export function forgetKnownRoute(db: AppDb, rec: RouteRecord): void {
  if (!rec) return;
  if (rec.created) {
    db.delete(knownRoutes).where(eq(knownRoutes.id, rec.id)).run();
    return;
  }
  db.update(knownRoutes)
    .set({ count: sql`MAX(1, ${knownRoutes.count} - 1)` })
    .where(eq(knownRoutes.id, rec.id))
    .run();
}
