import { Platform } from 'react-native';

import { db } from '@/db/client';
import { entryCount } from '@/db/entriesRepo';
import { PRO_FALLBACK_PRICE } from '@/domain/pro';
import { backupAlertSignals } from '@/features/backup/homeAlerts';
import { dayMonth } from '@/features/entries/format';
import { BACKUP_SNOOZE_MS, daysSince } from '@/features/entries/logic';
import { openManageSubscription } from '@/features/pro/manage';
import { useProRenewalSignal } from '@/features/pro/homeAlerts';
import { dismissNoTrips, useTripAlertSignals } from '@/features/trips/homeAlerts';
import { InterruptedTripCard } from '@/features/trips/TripCards';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { AlertCard } from '@/ui';
import { CalendarClock, CloudUpload, MapPin, ShieldAlert } from '@/ui/icons';

import { ALERT_SNOOZE_MS, joinDays, pickHomeAlert, type HomeAlertId } from './alerts';

/** S-02 §2: the one alert card under the Home header (or nothing). */
export function HomeAlert({ now }: { now: number }) {
  'use no memo';
  const { settings, update } = useSettings();
  const trip = useTripAlertSignals();
  const renewal = useProRenewalSignal(now);
  const count = useLive(() => entryCount(db), [], ['entries']);
  const backup = backupAlertSignals(settings, count, now);

  const id = pickHomeAlert(
    {
      tripStopped: trip.tripStopped,
      autoPaused: trip.autoPaused,
      noTrips: trip.noTripsDays.length > 0,
      backupFailing: backup.failing,
      proRenews: renewal.due,
      // Its own snooze key (bản 1 banner), checked inside showBackupBanner.
      oldBackup: backup.old,
    },
    settings.alertSnoozedUntil,
    now,
  );
  if (!id) return null;

  const hide = (which: HomeAlertId) => update({ alertSnoozedUntil: { ...settings.alertSnoozedUntil, [which]: now + ALERT_SNOOZE_MS } });

  switch (id) {
    case 'tripStopped':
      return <InterruptedTripCard />;
    case 'autoPaused':
      return (
        <AlertCard
          tone="warn"
          icon={ShieldAlert}
          title={t('homeV2.alert.autoPausedTitle')}
          body={trip.samsung ? t('homeV2.alert.autoPausedBodySamsung') : t('homeV2.alert.autoPausedBody')}
          action={t('homeV2.alert.fixNow')}
          onAction={() => router.push('/trip/battery')}
          secondary={t('homeV2.alert.later')}
          onSecondary={() => hide('autoPaused')}
          onClose={() => hide('autoPaused')}
        />
      );
    case 'noTrips':
      return (
        <AlertCard
          tone="warn"
          icon={MapPin}
          title={t('homeV2.alert.noTripsTitle', { days: joinDays(trip.noTripsDays) })}
          body={t('homeV2.alert.noTripsBody')}
          action={t('homeV2.alert.addMiles')}
          onAction={() => router.push('/trip/new')}
          secondary={t('homeV2.alert.notDriving')}
          onSecondary={() => dismissNoTrips(trip.noTripsDays)}
          onClose={() => hide('noTrips')}
        />
      );
    case 'backupFailing':
      return (
        <AlertCard
          tone="warn"
          icon={CloudUpload}
          title={t('homeV2.alert.backupFailingTitle')}
          body={t('homeV2.alert.backupFailingBody')}
          action={t('homeV2.alert.checkBackup')}
          onAction={() => router.push('/backup')}
          onClose={() => hide('backupFailing')}
        />
      );
    case 'proRenews':
      return (
        <AlertCard
          tone="info"
          icon={CalendarClock}
          title={t('homeV2.alert.renewTitle', {
            date: renewal.renewsAt ? dayMonth(renewal.renewsAt) : '',
            price: PRO_FALLBACK_PRICE[settings.region === 'US' ? 'US' : 'UK'],
          })}
          body={Platform.OS === 'ios' ? t('homeV2.alert.renewBodyIOS') : t('homeV2.alert.renewBodyAndroid')}
          action={t('homeV2.alert.manage')}
          onAction={() => void openManageSubscription()}
          secondary={t('homeV2.alert.ok')}
          onSecondary={() => hide('proRenews')}
          onClose={() => hide('proRenews')}
        />
      );
    case 'oldBackup':
      return (
        <AlertCard
          tone="warn"
          icon={CloudUpload}
          title={
            settings.lastBackupAt === null
              ? t('homeV2.alert.oldBackupNever')
              : t('homeV2.alert.oldBackupTitle', { days: daysSince(settings.lastBackupAt, now) })
          }
          body=""
          action={t('homeV2.alert.turnOnNightly')}
          onAction={() => router.push('/backup')}
          secondary={t('homeV2.alert.backUpNow')}
          onSecondary={() => router.push('/backup')}
          onClose={() => update({ backupBannerSnoozedUntil: now + BACKUP_SNOOZE_MS })}
        />
      );
  }
}
