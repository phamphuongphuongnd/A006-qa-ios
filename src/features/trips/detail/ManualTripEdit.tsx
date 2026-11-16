import { useState } from 'react';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { deleteTrip, tripRoute, updateManualTrip } from '@/db/tripsRepo';
import { pickerScope } from '@/domain/types';
import { distanceValue, type DistanceUnit } from '@/features/trips/format';
import { openPro } from '@/features/pro/openPro';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { rememberRoute } from '@/features/trips/route/places';
import { routeFormOf, useRouteOption } from '@/features/trips/route/useRouteOption';
import { useSettings } from '@/state/settings';
import { TripForm } from '@/features/trips/TripForm';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { Dialog, IconButton, useSnackbar } from '@/ui';
import { Trash2, X } from '@/ui/icons';

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** Edit a manual (odometer / typed distance) trip — S-08 form, as in bản 1. GPS trips use Trip detail (S-07c). */
export function ManualTripEdit({ trip, unit, close }: { trip: TripRow; unit: DistanceUnit; close: () => void }) {
  const snack = useSnackbar();
  const [askDelete, setAskDelete] = useState(false);
  const { settings } = useSettings();
  const odo = trip.odoStart !== null && trip.odoEnd !== null && unit === 'mi';
  const route = useRouteOption();
  // Without the service (no key) an A → B trip opens as Distance and keeps its From / To.
  const isRoute = tripRoute(trip) !== null && route !== 'hidden';

  return (
    <TripForm
      header={
        <ModalHeader
          icon={X}
          iconLabel={t('trip.close')}
          onIcon={close}
          title={t('trip.editTitle')}
          right={<IconButton icon={Trash2} label={t('trip.deleteTrip')} color="error" onPress={() => setAskDelete(true)} />}
        />
      }
      unit={unit}
      submitLabel={t('common.save')}
      route={route}
      region={settings.region ?? 'UK'}
      onRouteLocked={() => openPro('route_miles')}
      initial={{
        mode: isRoute ? 'route' : odo ? 'odometer' : 'distance',
        route: routeFormOf(trip),
        start: odo ? trim(trip.odoStart!) : '',
        end: odo ? trim(trip.odoEnd!) : '',
        distance: trim(distanceValue(trip.distanceM, unit)),
        date: trip.startedAt,
        // Estimated trips may still be Unsorted; typed-in trips always have a side.
        scope: trip.source === 'gap' ? trip.scope : pickerScope(trip.scope),
        purpose: trip.purpose,
      }}
      hint={trip.source === 'gap' ? t('tripCheck.estimated') : undefined}
      onSubmit={(r) => {
        // Estimated gap trips keep their span (moved with the day).
        const span = trip.source === 'gap' && trip.endedAt !== null ? trip.endedAt - trip.startedAt : 0;
        updateManualTrip(db, trip.id, span > 0 ? { ...r, endedAt: r.date + span } : r);
        const before = tripRoute(trip);
        if (r.route && (!before || before.from.label !== r.route.from.label || before.to.label !== r.route.to.label)) rememberRoute(db, r.route);
        refreshWidgets().catch(() => {});
        snack({ message: t('trip.updated') });
        close();
      }}>
      <Dialog
        visible={askDelete}
        title={t('trip.deleteConfirm')}
        body={t('trip.deleteBody')}
        onClose={() => setAskDelete(false)}
        actions={[
          { label: t('common.cancel'), onPress: () => setAskDelete(false) },
          {
            label: t('common.delete'),
            variant: 'danger',
            onPress: () => {
              setAskDelete(false);
              deleteTrip(db, trip.id);
              refreshWidgets().catch(() => {});
              snack({ message: t('trip.deleted') });
              close();
            },
          },
        ]}
      />
    </TripForm>
  );
}
