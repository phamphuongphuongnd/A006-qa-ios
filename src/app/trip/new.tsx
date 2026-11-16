import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { X } from '@/ui/icons';
import { useState } from 'react';

import { db } from '@/db/client';
import { addManualTrip } from '@/db/tripsRepo';
import { openPro } from '@/features/pro/openPro';
import { formatDistance } from '@/features/trips/format';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { rememberRoute } from '@/features/trips/route/places';
import { useRouteOption } from '@/features/trips/route/useRouteOption';
import { TripForm } from '@/features/trips/TripForm';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useSnackbar } from '@/ui';

/** S-08 Add trip (manual). Optional `?date=<ms>` (from "Add missing miles"). */
export default function NewTripScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const unit = settings.distanceUnit;
  const route = useRouteOption();
  const [initialDate] = useState(() => (date && Number.isFinite(Number(date)) ? Number(date) : Date.now()));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));

  return (
    <TripForm
        header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} title={t('trip.addTitle')} />}
        unit={unit}
        submitLabel={t('trip.save')}
        route={route}
        region={settings.region ?? 'UK'}
        onRouteLocked={() => openPro('route_miles')}
        initial={{ mode: 'odometer', start: '', end: '', distance: '', date: initialDate, scope: 'work', purpose: '' }}
        onSubmit={(r) => {
          const row = addManualTrip(db, r);
          if (r.route) rememberRoute(db, r.route);
          refreshWidgets().catch(() => {});
          snack({ message: t('trip.saved', { distance: formatDistance(row.distanceM, unit) }) });
          close();
        }}
      />
  );
}
