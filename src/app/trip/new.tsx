import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { X } from '@/ui/icons';
import { useState } from 'react';

import { db } from '@/db/client';
import { addManualTrip } from '@/db/tripsRepo';
import { openPro } from '@/features/pro/openPro';
import { answerGap } from '@/features/trips/check/repo';
import { distanceValue, formatDistance } from '@/features/trips/format';
import { milesToMeters } from '@/domain/mileage';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { rememberRoute } from '@/features/trips/route/places';
import { useRouteOption } from '@/features/trips/route/useRouteOption';
import { TripForm } from '@/features/trips/TripForm';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useSnackbar } from '@/ui';
import { currencyOf } from '@/domain/types';
import { useAmountExpr } from '@/features/ocr/useAmountExpr';
import { parkingNoteFor, setTripParking } from '@/features/trips/parking';
import { ParkingField, ParkingKeyBar } from '@/features/trips/ParkingField';
import type { SavedTripRow } from '@/db/schema';
import { getSavedTrip, markSavedTripUsed, savedMiles, savedRoute } from '@/features/savedTrips/repo';
import { RegularTripChips } from '@/features/savedTrips/ui';

const num = (s: string | undefined) => (s !== undefined && s !== '' && Number.isFinite(Number(s)) ? Number(s) : null);

/**
 * S-08 Add trip (manual). Optional `?date=<ms>` (from "Add missing miles"). Estimated trips (saved with source = gap,
 * Unsorted, label "Estimated"): `?gap=<prevId>><nextId>&gapMiles=&from=&to=` from a Missing trip row (Q26), or
 * `?odoMiles=&date=` from an odometer check (Q27).
 */
export default function NewTripScreen() {
  const p = useLocalSearchParams<{
    date?: string;
    gap?: string;
    gapMiles?: string;
    from?: string;
    to?: string;
    odoMiles?: string;
    saved?: string;
  }>();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const unit = settings.distanceUnit;
  const route = useRouteOption();
  const gapFrom = num(p.from);
  const gapTo = num(p.to);
  const [prevId, nextId] = (p.gap ?? '').split('>');
  const gap = p.gap && prevId && nextId && gapFrom !== null && gapTo !== null ? { prevId, nextId, from: gapFrom, to: gapTo } : null;
  const estMiles = gap ? num(p.gapMiles) : num(p.odoMiles);
  const estimated = gap !== null || estMiles !== null;
  const [initialDate] = useState(() => gap?.from ?? num(p.date) ?? Date.now());
  const trim1 = (n: number) => String(Math.round(n * 10) / 10);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));
  const [parkingEditing, setParkingEditing] = useState(false);
  const parking = useAmountExpr(0);
  const currency = currencyOf(settings.region ?? 'UK');
  // Q31: a Regular trip picked from the chips (or "See all" → ?saved=<id>) refills the form (new key).
  const [picked, setPicked] = useState<{ saved: SavedTripRow; roundTrip: boolean; key: number } | null>(() => {
    const s = p.saved ? getSavedTrip(db, p.saved) : undefined;
    return s ? { saved: s, roundTrip: s.roundTrip, key: 1 } : null;
  });
  const pick = (saved: SavedTripRow, roundTrip = saved.roundTrip) => setPicked((x) => ({ saved, roundTrip, key: (x?.key ?? 0) + 1 }));

  return (
    <TripForm
        key={picked?.key ?? 0}
        bottomExtra={parkingEditing ? <ParkingKeyBar amount={parking} currency={currency} /> : null}
        top={
          estimated ? undefined : (
            <RegularTripChips
              unit={unit}
              picked={picked?.saved.id ?? null}
              roundTrip={picked?.roundTrip ?? false}
              onPick={(s) => pick(s)}
              onRoundTrip={(rt) => picked && pick(picked.saved, rt)}
            />
          )
        }
        header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} title={t('trip.addTitle')} />}
        unit={unit}
        submitLabel={t('trip.save')}
        route={route}
        region={settings.region ?? 'UK'}
        onRouteLocked={() => openPro('route_miles')}
        hint={
          gap ? t('tripCheck.gapHint') : estimated ? t('tripCheck.odoHint') : picked ? t('s6.regularFilled', { name: picked.saved.label }) : undefined
        }
        extra={<ParkingField amount={parking} currency={currency} onEditingChange={setParkingEditing} />}
        initial={
          picked
            ? {
                mode: 'distance',
                start: '',
                end: '',
                distance: trim1(distanceValue(milesToMeters(savedMiles(picked.saved, picked.roundTrip)), unit)),
                date: initialDate,
                scope: picked.saved.scope,
                purpose: picked.saved.purpose,
              }
            : {
                mode: estimated ? 'distance' : 'odometer',
                start: '',
                end: '',
                distance: estMiles !== null ? trim1(distanceValue(milesToMeters(estMiles), unit)) : '',
                date: initialDate,
                scope: estimated ? 'unsorted' : 'work',
                purpose: '',
              }
        }
        onSubmit={(r) => {
          // A gap trip keeps the gap's times (shifted with the day if the driver changed the date).
          const extra = estimated && !r.route ? { source: 'gap' as const, ...(gap ? { endedAt: r.date + (gap.to - gap.from) } : {}) } : {};
          // A regular trip keeps its A → B ends (free: the distance was saved, nothing is routed again).
          const fromSaved = picked && !r.route ? savedRoute(picked.saved, picked.roundTrip) : null;
          const row = addManualTrip(db, { ...r, ...extra, ...(fromSaved ? { route: fromSaved } : {}) });
          if (picked) markSavedTripUsed(db, picked.saved.id);
          if (gap) answerGap(db, gap.prevId, gap.nextId, 'added');
          if (r.route) rememberRoute(db, r.route);
          if (parking.minor > 0) setTripParking(db, row, parking.minor, currency, parkingNoteFor(row));
          refreshWidgets().catch(() => {});
          snack({ message: t('trip.saved', { distance: formatDistance(row.distanceM, unit) }) });
          close();
        }}
      />
  );
}
