import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

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
  const trip = useLive(() => getActiveTrip(db), [], ['trips']);
  const last = useLive(() => (trip ? lastPoint(db, trip.id) : undefined), [trip?.id], ['trip_points']);
  const now = useNow(trip ? 10_000 : 60_000);
  return { trip, now, gps: gpsQuality(last, now) };
}

export const useInterruptedTrip = () => useLive(() => latestInterrupted(db), [], ['trips']);

/**
 * Foreground location permission, read again whenever the screen gets focus and when the app comes back to the
 * foreground (B-09: the user may deny on S-07a or flip it in system Settings while this tab stays mounted).
 */
export function useLocationPermission() {
  const [perm, setPerm] = useState<Location.LocationPermissionResponse | null>(null);
  const refresh = useCallback(() => {
    Location.getForegroundPermissionsAsync()
      .then(setPerm)
      .catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  const request = useCallback(async () => {
    const r = await Location.requestForegroundPermissionsAsync();
    setPerm(r);
    return r;
  }, []);
  return [perm, request] as const;
}
