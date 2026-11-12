import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import { getActiveTrip, lastPoint, latestInterrupted } from '@/db/tripsRepo';
import { useLive } from '@/state/useLive';

import { gpsQuality } from './sketch';

/** Current time, refreshed every `ms` (durations on running trips). */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** The running / paused trip (live), with GPS quality from its last fix. */
export function useActiveTrip() {
  const trip = useLive(() => getActiveTrip(db));
  const last = useLive(() => (trip ? lastPoint(db, trip.id) : undefined));
  const now = useNow(trip ? 10_000 : 60_000);
  return { trip, now, gps: gpsQuality(last, now) };
}

export const useInterruptedTrip = () => useLive(() => latestInterrupted(db));
