// Frequent places for A → B trips (Q25): kept on the phone in `places`, shown as chips on S-08.
import { eq } from 'drizzle-orm';

import { places, type PlaceRow } from '@/db/schema';
import { newId, type AppDb } from '@/db/types';
import { haversine } from '@/domain/mileage';

/** Two picks closer than this are the same place (a depot gate vs its car park). */
export const SAME_PLACE_M = 150;
const DAY = 86_400_000;

/** Chip order: used often first, with a boost for places used this week / this month. */
export function placeScore(p: Pick<PlaceRow, 'useCount' | 'lastUsedAt'>, now: number): number {
  const age = now - p.lastUsedAt;
  const recent = age <= 7 * DAY ? 3 : age <= 30 * DAY ? 1 : 0;
  return p.useCount + recent;
}

export function rankPlaces<T extends Pick<PlaceRow, 'useCount' | 'lastUsedAt'>>(rows: T[], now: number, limit = 6): T[] {
  return [...rows]
    .sort((a, b) => placeScore(b, now) - placeScore(a, now) || b.lastUsedAt - a.lastUsedAt)
    .slice(0, limit);
}

export const listPlaces = (db: AppDb, now = Date.now(), limit = 6) => rankPlaces(db.select().from(places).all(), now, limit);

/** Same label (any case) or within SAME_PLACE_M. */
function findSame(db: AppDb, p: { label: string; lat: number; lng: number }): PlaceRow | undefined {
  const key = p.label.trim().toLowerCase();
  return db
    .select()
    .from(places)
    .all()
    .find((x) => x.label.toLowerCase() === key || haversine(x, p) < SAME_PLACE_M);
}

/** Called when an A → B trip is saved: +1 use for a known place, else a new one. */
export function rememberPlace(db: AppDb, p: { label: string; address?: string; lat: number; lng: number }, now = Date.now()): PlaceRow {
  const same = findSame(db, p);
  if (same) {
    const next = { ...same, useCount: same.useCount + 1, lastUsedAt: now };
    db.update(places).set({ useCount: next.useCount, lastUsedAt: now }).where(eq(places.id, same.id)).run();
    return next;
  }
  const row: PlaceRow = { id: newId(), label: p.label.trim(), address: (p.address ?? '').trim(), lat: p.lat, lng: p.lng, useCount: 1, lastUsedAt: now };
  db.insert(places).values(row).run();
  return row;
}

export const forgetPlace = (db: AppDb, id: string) => db.delete(places).where(eq(places.id, id)).run();

/** Both ends of a saved A → B trip count as used. */
export function rememberRoute(db: AppDb, r: { from: { label: string; lat: number; lng: number }; to: { label: string; lat: number; lng: number } }, now = Date.now()) {
  rememberPlace(db, r.from, now);
  rememberPlace(db, r.to, now);
}
