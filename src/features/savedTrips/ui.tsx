import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import type { SavedTripRow, TripRow } from '@/db/schema';
import { routeTitle } from '@/db/tripsRepo';
import { formatDistance, type DistanceUnit } from '@/features/trips/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useLive } from '@/state/useLive';
import { fonts } from '@/theme';
import { Button, Chip, ChipRow, Field, Sheet, Toggle, Txt } from '@/ui';
import { Repeat } from '@/ui/icons';

import { listSavedTrips, oneWayMeters, saveTripAsRegular } from './repo';

const SHOWN = 6;

/** "DLS4 → Tesco Leeds" or "12.4 mi trip" — the name a new regular trip starts with. */
export const defaultRegularName = (trip: TripRow, unit: DistanceUnit) =>
  routeTitle(trip) ?? (trip.purpose.trim() || t('s6.regularDefaultName', { distance: formatDistance(oneWayMeters(trip), unit) }));

/**
 * S-08 top row (Q31): chips of the most used regular trips + "See all", and the Round trip switch once one is picked.
 * Hidden when there are none yet.
 */
export function RegularTripChips({
  unit,
  picked,
  roundTrip,
  onPick,
  onRoundTrip,
}: {
  unit: DistanceUnit;
  picked: string | null;
  roundTrip: boolean;
  onPick: (s: SavedTripRow) => void;
  onRoundTrip: (v: boolean) => void;
}) {
  'use no memo';
  const all = useLive(() => listSavedTrips(db), [], ['saved_trips']);
  if (all.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {t('s6.regularTrips')}
      </Txt>
      <ChipRow>
        {all.slice(0, SHOWN).map((s) => {
          const distance = formatDistance(s.distanceM, unit);
          return (
            <Chip
              key={s.id}
              icon={Repeat}
              label={`${s.label} · ${distance}`}
              state={picked === s.id ? 'on' : 'default'}
              accessibilityLabel={t('s6.regularChipA11y', { name: s.label, distance })}
              onPress={() => onPick(s)}
            />
          );
        })}
        {all.length > SHOWN ? <Chip label={t('s6.seeAll')} onPress={() => router.push('/regular-trips?pick=1')} /> : null}
      </ChipRow>
      {picked ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
          <Txt v="body">{t('autoTrip.route.roundTrip')}</Txt>
          <Toggle value={roundTrip} onChange={onRoundTrip} label={t('autoTrip.route.roundTrip')} />
        </View>
      ) : null}
    </View>
  );
}

/** "Save as a regular trip" sheet from Trip detail (S-07c) / Edit trip: just the name; side and purpose come from the trip. */
export function SaveRegularSheet({ trip, unit, visible, onClose, onSaved }: { trip: TripRow; unit: DistanceUnit; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(() => defaultRegularName(trip, unit));
  return (
    <Sheet visible={visible} onClose={onClose} title={t('s6.saveRegularTitle')}>
      <View style={{ gap: 14 }}>
        <Field label={t('s6.regularName')} value={name} onChangeText={setName} maxLength={60} autoFocus />
        <Txt v="small" c="textSecondary">
          {formatDistance(oneWayMeters(trip), unit)}
          {trip.roundTrip ? ` · ${t('autoTrip.route.roundTag')}` : ''}
          {trip.purpose ? ` · ${trip.purpose}` : ''}
        </Txt>
        <Button
          label={t('common.save')}
          full
          disabled={name.trim() === ''}
          onPress={() => {
            saveTripAsRegular(db, trip, name);
            onSaved();
          }}
        />
      </View>
    </Sheet>
  );
}
