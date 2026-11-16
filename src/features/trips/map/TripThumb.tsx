import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import type { TripRow } from '@/db/schema';
import { useTheme } from '@/theme';

import { ensureThumb, THUMB_DP, thumbUri } from './thumbs';

/**
 * Miles row picture: the trip's map thumbnail once it exists, else `placeholder` (the old icon circle) while it is
 * made in the background or when there is no internet.
 */
export function TripThumb({ trip, placeholder }: { trip: TripRow; placeholder: ReactNode }) {
  const { colors, dark } = useTheme();
  const key = `${trip.id}|${trip.startedAt}|${trip.endedAt}|${trip.distanceM}|${trip.scope}|${dark}`;
  const [made, setMade] = useState<{ key: string; uri: string } | null>(null);
  const have = thumbUri(trip, dark);
  const uri = have ?? (made?.key === key ? made.uri : null);

  useEffect(() => {
    if (thumbUri(trip, dark)) return;
    let alive = true;
    ensureThumb(trip, dark, { work: colors.workFill, personal: colors.personalFill }).then((u) => {
      if (alive && u) setMade({ key, uri: u });
    });
    return () => {
      alive = false;
    };
    // `key` covers every trip field the picture depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!uri) return <>{placeholder}</>;
  return (
    <View style={{ width: THUMB_DP, height: THUMB_DP, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
      <Image source={{ uri }} style={{ width: THUMB_DP, height: THUMB_DP }} contentFit="cover" transition={150} recyclingKey={trip.id} />
    </View>
  );
}
