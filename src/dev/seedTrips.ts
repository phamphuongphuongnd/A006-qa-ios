import { eq, like } from 'drizzle-orm';

import { trips } from '@/db/schema';
import { appendPoints, endTrip, startTrip, type PointInput } from '@/db/tripsRepo';

import type { AppDb } from '@/db/types';

/**
 * P5 device tests (dev builds only, from /dev/probe): GPS trips the A13 can't record at a desk — a 100+ mile drive
 * (map fit, thumbnail) and an automatic trip the app couldn't classify (Sort trip card). Purpose starts "ZZ test" so
 * `deleteTestTrips` removes exactly these.
 */
const TAG = 'ZZ test';
const DAY = 24 * 60 * 60 * 1000;

/** Points from A to B with a gentle bend, one every `stepS` seconds at driving speed. */
function drive(from: [number, number], to: [number, number], startTs: number, minutes: number, stepS = 30): PointInput[] {
  const n = Math.max(2, Math.round((minutes * 60) / stepS));
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const bend = Math.sin(f * Math.PI) * 0.15;
    return {
      ts: startTs + i * stepS * 1000,
      lat: from[0] + (to[0] - from[0]) * f + bend * 0.3,
      lng: from[1] + (to[1] - from[1]) * f - bend,
      accuracy: 8,
      speed: 25,
    };
  });
}

function seedOne(db: AppDb, purpose: string, scope: 'work' | 'unsorted', startedBy: 'user' | 'auto', points: PointInput[]) {
  const t = startTrip(db, 'work', points[0].ts, startedBy);
  appendPoints(db, t.id, points);
  endTrip(db, t.id, points[points.length - 1].ts);
  db.update(trips).set({ purpose, scope }).where(eq(trips.id, t.id)).run();
}

export function seedTestTrips(db: AppDb, now = Date.now()): void {
  const yesterday = new Date(now - DAY);
  yesterday.setHours(6, 0, 0, 0);
  const y = yesterday.getTime();
  // Leeds → London (~190 mi) and a short unsorted automatic trip later the same day.
  seedOne(db, `${TAG} long`, 'work', 'user', drive([53.7949, -1.5476], [51.5308, -0.1238], y, 210));
  seedOne(db, `${TAG} auto`, 'unsorted', 'auto', drive([53.7949, -1.5476], [53.8321, -1.4602], y + 6 * 60 * 60 * 1000, 18, 15));
}

export function deleteTestTrips(db: AppDb): number {
  const rows = db.select({ id: trips.id }).from(trips).where(like(trips.purpose, `${TAG}%`)).all();
  for (const r of rows) db.delete(trips).where(eq(trips.id, r.id)).run();
  return rows.length;
}
