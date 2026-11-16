import { useState } from 'react';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { getTrip, tripRoute, updateManualTrip } from '@/db/tripsRepo';
import { pickerScope , currencyOf } from '@/domain/types';
import { distanceValue, type DistanceUnit } from '@/features/trips/format';
import { openPro } from '@/features/pro/openPro';
import { useAmountExpr } from '@/features/ocr/useAmountExpr';
import { deleteTripToTrash } from '@/features/trips/deleteTrip';
import { TripDeleteDialog } from '@/features/trips/detail/TripDeleteDialog';
import { parkingNoteFor, setTripParking, tripParkingMinor } from '@/features/trips/parking';
import { ParkingField } from '@/features/trips/ParkingField';
import { SaveRegularSheet } from '@/features/savedTrips/ui';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { rememberRoute } from '@/features/trips/route/places';
import { routeFormOf, useRouteOption } from '@/features/trips/route/useRouteOption';
import { useSettings } from '@/state/settings';
import { TripForm } from '@/features/trips/TripForm';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { Button, IconButton, useSnackbar } from '@/ui';
import { Repeat, Trash2, X } from '@/ui/icons';

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
  const currency = currencyOf(settings.region ?? 'UK');
  const [parkingSaved] = useState(() => tripParkingMinor(db, trip.id));
  const parking = useAmountExpr(parkingSaved);
  const [saveRegular, setSaveRegular] = useState(false);

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
      extra={
        <>
          <ParkingField amount={parking} currency={currency} />
          <Button label={t('s6.saveRegular')} icon={Repeat} variant="outline" full onPress={() => setSaveRegular(true)} />
        </>
      }
      onSubmit={(r) => {
        // Estimated gap trips keep their span (moved with the day).
        const span = trip.source === 'gap' && trip.endedAt !== null ? trip.endedAt - trip.startedAt : 0;
        updateManualTrip(db, trip.id, span > 0 ? { ...r, endedAt: r.date + span } : r);
        const before = tripRoute(trip);
        if (r.route && (!before || before.from.label !== r.route.from.label || before.to.label !== r.route.to.label)) rememberRoute(db, r.route);
        const after = getTrip(db, trip.id);
        if (after && parking.minor !== parkingSaved) setTripParking(db, after, parking.minor, currency, parkingNoteFor(after));
        refreshWidgets().catch(() => {});
        snack({ message: t('trip.updated') });
        close();
      }}>
      {saveRegular ? (
        <SaveRegularSheet
          trip={trip}
          unit={unit}
          visible
          onClose={() => setSaveRegular(false)}
          onSaved={() => {
            setSaveRegular(false);
            snack({ message: t('s6.regularSaved') });
          }}
        />
      ) : null}
      <TripDeleteDialog
        visible={askDelete}
        parkingMinor={parkingSaved}
        currency={currency}
        onClose={() => setAskDelete(false)}
        onDelete={(deleteParking) => {
          setAskDelete(false);
          const undo = deleteTripToTrash(db, trip.id, deleteParking);
          refreshWidgets().catch(() => {});
          snack({
            message: t('trip.deleted'),
            actionLabel: t('autoTrip.undo'),
            onAction: () => {
              undo?.();
              refreshWidgets().catch(() => {});
            },
          });
          close();
        }}
      />
    </TripForm>
  );
}
