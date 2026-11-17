import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { getSettings } from '@/db/settingsRepo';
import { getActiveTrip } from '@/db/tripsRepo';
import { MIN_KEPT_TRIP_M, tooShortToKeep } from '@/domain/mileage';
import { discardTrip, endActiveTrip, startBlocker, startGpsTrip } from '@/features/trips/controller';
import { formatDistance } from '@/features/trips/format';
import { drainTripToggles, onTripToggleRequest, type ToggleEnd } from '@/features/trips/toggleQueue';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSnackbar } from '@/ui';

/**
 * `sundaysort://trip/toggle` — NFC sticker (Android tag intent / iPhone Shortcuts): no trip → start one, running →
 * end it (saved; Work / Personal stays as it is). Works behind the app lock: nothing of the log is shown.
 * Each link is counted in `+native-intent` and run here one after another (B-53 part 2: a second tap while the first
 * was still starting GPS used to be lost).
 */
export default function TripToggleLink() {
  const snack = useSnackbar();
  useEffect(() => {
    let alive = true;
    let latest = 0;

    const toggleOnce = async (): Promise<ToggleEnd> => {
      const active = getActiveTrip(db);
      if (active) {
        const trip = await endActiveTrip();
        const unit = getSettings(db).distanceUnit;
        if (trip && tooShortToKeep(trip.distanceM)) {
          // B-50: started and ended without driving (double tap on the tag) — don't leave a 0.0 mi trip in Miles.
          await discardTrip(trip.id);
          snack({ message: t('autoTrip.nfcTooShort', { distance: formatDistance(MIN_KEPT_TRIP_M, unit, 1) }) });
        } else if (trip) snack({ message: t('autoTrip.nfcSaved', { distance: formatDistance(trip.distanceM, unit) }) });
      } else if ((await startBlocker()) === null) {
        await startGpsTrip({ startedBy: 'nfc' });
        snack({ message: t('autoTrip.nfcStarted') });
      } else {
        // Needs location permission / GPS: the Active trip screen walks through it.
        return 'setup';
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return 'home';
    };

    const go = async () => {
      const me = ++latest;
      const end = await drainTripToggles(toggleOnce);
      // Only the last call navigates; a link that arrived meanwhile has already run in the same drain.
      if (!alive || me !== latest) return;
      router.replace(end === 'setup' ? '/trip/active?start=1' : '/');
    };

    const unsub = onTripToggleRequest(() => {
      go();
    });
    go();
    return () => {
      alive = false;
      unsub();
    };
  }, [snack]);
  return <View style={{ flex: 1 }} />;
}
