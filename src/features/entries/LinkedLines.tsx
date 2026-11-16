import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { getTrip } from '@/db/tripsRepo';
import { formatClock, formatDay } from '@/features/trips/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Txt } from '@/ui';
import { Car, Upload } from '@/ui/icons';

/**
 * S-05 extra lines (F-23): "From trip · Tue 10 Nov 07:02" for Parking & tolls typed on a trip (Q28, opens S-07c) and
 * "Exported on 12 Nov" once the entry went into an export file (Q29).
 */
export function LinkedLines({ entry }: { entry: { tripId: string | null; exportedAt: number | null } }) {
  'use no memo';
  const { colors } = useTheme();
  const trip = useLive(() => (entry.tripId ? (getTrip(db, entry.tripId) ?? null) : null), [entry.tripId], ['trips']);
  if (!trip && !entry.exportedAt) return null;
  return (
    <View style={{ gap: 8 }}>
      {trip ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/trip/${trip.id}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <Car size={18} color={colors.work} />
          <Txt style={{ fontFamily: fonts.semibold, color: colors.work, flexShrink: 1 }}>
            {t('s6.fromTrip', { date: `${formatDay(trip.startedAt)} ${formatClock(trip.startedAt)}` })}
          </Txt>
        </Pressable>
      ) : null}
      {entry.exportedAt ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Upload size={18} color={colors.textSecondary} />
          <Txt v="small" c="textSecondary" style={{ flexShrink: 1 }}>
            {t('s6.exportedOn', { date: formatDay(entry.exportedAt) })}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
