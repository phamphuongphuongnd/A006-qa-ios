import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';

import { db } from '@/db/client';
import { addManualTrip } from '@/db/tripsRepo';
import { formatDistance } from '@/features/trips/format';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { TripForm } from '@/features/trips/TripForm';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { Screen, useSnackbar } from '@/ui';

/** S-08 Add trip (manual). Optional `?date=<ms>` (from "Add missing miles"). */
export default function NewTripScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const unit = settings.distanceUnit;
  const [initialDate] = useState(() => (date && Number.isFinite(Number(date)) ? Number(date) : Date.now()));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));

  return (
    <Screen header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} title={t('trip.addTitle')} />}>
      <TripForm
        unit={unit}
        submitLabel={t('trip.save')}
        initial={{ mode: 'odometer', start: '', end: '', distance: '', date: initialDate, scope: 'work', purpose: '' }}
        onSubmit={(r) => {
          const row = addManualTrip(db, r);
          refreshWidgets().catch(() => {});
          snack({ message: t('trip.saved', { distance: formatDistance(row.distanceM, unit) }) });
          close();
        }}
      />
    </Screen>
  );
}
