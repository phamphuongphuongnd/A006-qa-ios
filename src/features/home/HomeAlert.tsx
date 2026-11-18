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
import { recentGaps } from '@/features/trips/check/gaps';
import { useGapDistances, useMissingTrips, useOdometerSignal } from '@/features/trips/check/hooks';
import { acceptReading } from '@/features/trips/check/repo';
import { formatDistance } from '@/features/trips/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { AlertCard } from '@/ui';
import { CalendarClock, CloudUpload, Gauge, MapPin, ShieldAlert } from '@/ui/icons';

import { ALERT_SNOOZE_MS, joinDays, pickHomeAlert, type HomeAlertId } from './alerts';

/** S-02 §2: the one alert card under the Home header (or nothing). */
export function HomeAlert({ now }: { now: number }) {
  'use no memo';
  const { settings, update } = useSettings();
  const trip = useTripAlertSignals();
  const renewal = useProRenewalSignal(now);
  const count = useLive(() => entryCount(db), [], ['entries']);
  const backup = backupAlertSignals(settings, count, now);
  const gaps = recentGaps(useMissingTrips(), now);
  const gapDist = useGapDistances(gaps);
  const gapMeters = gaps.reduce((sum, g) => sum + (gapDist.get(g.key)?.meters ?? g.estimateM), 0);
  const odo = useOdometerSignal(now);
  const unit = settings.distanceUnit;
  const dist0 = (miles: number) => formatDistance(miles * 1609.344, unit, 0);

  const id = pickHomeAlert(
    {
      tripStopped: trip.tripStopped,
      autoPaused: trip.autoPaused,
      noTrips: trip.noTripsDays.length > 0,
      missingTrips: gaps.length > 0,
      odometer: odo?.kind === 'missing' || odo?.kind === 'over',
      odometerDue: odo?.kind === 'due',
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
          body={
            Platform.OS === 'ios'
              ? t('homeV2.alert.autoPausedBodyIos')
              : trip.samsung
                ? t('homeV2.alert.autoPausedBodySamsung')
                : t('homeV2.alert.autoPausedBody')
          }
          action={t('homeV2.alert.fixNow')}
          onAction={() => router.push(Platform.OS === 'ios' ? '/trip/setup' : '/trip/battery')}
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
    case 'missingTrips':
      return (
        <AlertCard
          tone="warn"
          icon={MapPin}
          title={gaps.length === 1 ? t('tripCheck.homeGapsTitleOne') : t('tripCheck.homeGapsTitle', { count: gaps.length })}
          body={t('tripCheck.homeGapsBody', { distance: formatDistance(gapMeters, unit) })}
          action={t('tripCheck.review')}
          onAction={() => router.navigate({ pathname: '/miles', params: { review: 'gaps' } })}
          secondary={t('tripCheck.later')}
          onSecondary={() => hide('missingTrips')}
          onClose={() => hide('missingTrips')}
        />
      );
    case 'odometer': {
      if (!odo || (odo.kind !== 'missing' && odo.kind !== 'over')) return null;
      const r = odo.check.result;
      const prev = odo.check.prev;
      const compare =
        r.kind === 'missing' && prev ? t('tripCheck.odoCompare', { odo: dist0(r.odoMiles), date: dayMonth(prev.readAt), app: dist0(r.appMiles) }) : '';
      const reading = odo.check.reading;
      return r.kind === 'missing' ? (
        <AlertCard
          tone="warn"
          icon={Gauge}
          title={t('tripCheck.odoMissingTitle', { distance: dist0(r.diffMiles) })}
          body={compare}
          action={t('tripCheck.addMissing')}
          onAction={() =>
            router.push({
              pathname: '/trip/new',
              params: { odoMiles: String(Math.round(r.diffMiles * 10) / 10), date: String(reading.readAt - 60_000) },
            })
          }
          secondary={t('tripCheck.thatsFine')}
          onSecondary={() => acceptReading(db, reading.id)}
          onClose={() => hide('odometer')}
        />
      ) : (
        <AlertCard
          tone="warn"
          icon={Gauge}
          title={t('tripCheck.odoOverTitle')}
          body={t('tripCheck.odoOverBody')}
          action={t('tripCheck.reviewTrips')}
          onAction={() => router.navigate('/miles')}
          secondary={t('tripCheck.thatsFine')}
          onSecondary={() => acceptReading(db, reading.id)}
          onClose={() => hide('odometer')}
        />
      );
    }
    case 'odometerDue':
      return (
        <AlertCard
          tone="info"
          icon={Gauge}
          title={t('tripCheck.odoDueTitle')}
          body={t('tripCheck.odoDueBody')}
          action={t('tripCheck.enterReading')}
          onAction={() => router.push('/trip/odometer')}
          secondary={t('tripCheck.later')}
          onSecondary={() => hide('odometerDue')}
          onClose={() => hide('odometerDue')}
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
