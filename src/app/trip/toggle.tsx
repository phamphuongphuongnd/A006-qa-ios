import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { getActiveTrip } from '@/db/tripsRepo';
import { endActiveTrip, startBlocker, startGpsTrip } from '@/features/trips/controller';
import { formatDistance } from '@/features/trips/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSnackbar } from '@/ui';

/**
 * `sundaysort://trip/toggle` — NFC sticker (Android tag intent / iPhone Shortcuts): no trip → start one, running →
 * end it (saved; Work / Personal stays as it is). Works behind the app lock: nothing of the log is shown.
 */
export default function TripToggleLink() {
  const snack = useSnackbar();
  useEffect(() => {
    let done = false;
    (async () => {
      const active = getActiveTrip(db);
      try {
        if (active) {
          const trip = await endActiveTrip();
          if (trip) snack({ message: t('autoTrip.nfcSaved', { distance: formatDistance(trip.distanceM, getSettings(db).distanceUnit) }) });
        } else if ((await startBlocker()) === null) {
          await startGpsTrip({ startedBy: 'nfc' });
          snack({ message: t('autoTrip.nfcStarted') });
        } else {
          // Needs location permission / GPS: the Active trip screen walks through it.
          done = true;
          router.replace('/trip/active?start=1');
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        // fall through to Home
      }
      if (!done) router.replace('/');
    })();
  }, [snack]);
  return <View style={{ flex: 1 }} />;
}
