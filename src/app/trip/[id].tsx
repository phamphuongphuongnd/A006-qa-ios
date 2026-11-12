import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Trash2, X } from '@/ui/icons';
import { useState } from 'react';

import { db } from '@/db/client';
import { deleteTrip, getTrip, updateManualTrip, updateTrip } from '@/db/tripsRepo';
import { distanceValue, formatClock, formatDay, inputToMiles } from '@/features/trips/format';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { TripForm } from '@/features/trips/TripForm';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { Button, Dialog, EmptyState, IconButton, Screen, Txt, useSnackbar } from '@/ui';

const trim = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Edit a trip from the Miles list. Manual trips: everything as in S-08. GPS trips: Work/Personal, purpose,
 * and a hand-typed distance (marks the trip "Edited").
 */
export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const unit = settings.distanceUnit;
  // Read once: the form keeps its own state while editing.
  const [trip] = useState(() => (id ? getTrip(db, id) : undefined));
  const [askDelete, setAskDelete] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));

  if (trip && (trip.status === 'running' || trip.status === 'paused')) return <Redirect href="/trip/active" />;

  const header = (
    <ModalHeader
      icon={X}
      iconLabel={t('trip.close')}
      onIcon={close}
      title={t('trip.editTitle')}
      right={trip ? <IconButton icon={Trash2} label={t('trip.deleteTrip')} color="error" onPress={() => setAskDelete(true)} /> : null}
    />
  );

  if (!trip) {
    return (
      <Screen header={header}>
        <EmptyState title={t('trip.notFound')} action={<Button label={t('trip.close')} variant="outline" full onPress={close} />} />
      </Screen>
    );
  }

  const gps = trip.source === 'gps';
  const odo = !gps && trip.odoStart !== null && trip.odoEnd !== null && unit === 'mi';

  return (
    <Screen header={header}>
      <TripForm
        unit={unit}
        gpsOnly={gps}
        submitLabel={t('common.save')}
        initial={{
          mode: odo ? 'odometer' : 'distance',
          start: odo ? trim(trip.odoStart!) : '',
          end: odo ? trim(trip.odoEnd!) : '',
          distance: trim(distanceValue(trip.distanceM, unit)),
          date: trip.startedAt,
          scope: trip.scope,
          purpose: trip.purpose,
        }}
        extra={
          gps ? (
            <Txt v="small" c="textSecondary">
              {t('trip.gpsEditNote', { time: `${formatDay(trip.startedAt)} ${formatClock(trip.startedAt)}` })}
            </Txt>
          ) : null
        }
        onSubmit={(r) => {
          if (gps) {
            // Untouched field (same rounded number as shown) keeps the exact GPS distance and no "Edited" tag.
            const shownMiles = inputToMiles(Number(trim(distanceValue(trip.distanceM, unit))), unit);
            const milesChanged = Math.abs(r.miles - shownMiles) > 1e-6;
            updateTrip(db, trip.id, { scope: r.scope, purpose: r.purpose, ...(milesChanged ? { miles: r.miles } : {}) });
          } else {
            updateManualTrip(db, trip.id, r);
          }
          refreshWidgets().catch(() => {});
          snack({ message: t('trip.updated') });
          close();
        }}
      />
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
    </Screen>
  );
}
