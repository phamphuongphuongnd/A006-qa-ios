import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { getTrip, tripPointsOf, updateTrip } from '@/db/tripsRepo';
import { countedPath, metersToMiles } from '@/domain/mileage';
import type { Scope } from '@/domain/types';
import {
  deleteSegment,
  editGpsTrip,
  listSegments,
  restoreSegment,
  restoreTripScope,
  revertTripRow,
  setTripScope,
  splitTripAt,
  toggleSegment,
  unsplitTrip,
  type TripEdit,
} from '@/features/trips/auto/repo';
import { findStops, sameRange, segmentForStop, splitMiles, type Stop } from '@/features/trips/auto/stops';
import { currencyOf } from '@/domain/types';
import { useAmountExpr } from '@/features/ocr/useAmountExpr';
import { deleteTripToTrash } from '@/features/trips/deleteTrip';
import { ManualTripEdit } from '@/features/trips/detail/ManualTripEdit';
import { TripDeleteDialog } from '@/features/trips/detail/TripDeleteDialog';
import { parkingNoteFor, setTripParking, tripParkingMinor } from '@/features/trips/parking';
import { ParkingField } from '@/features/trips/ParkingField';
import { SaveRegularSheet } from '@/features/savedTrips/ui';
import { TimeWheel } from '@/features/trips/detail/TimeWheel';
import { TripDetailSketch } from '@/features/trips/detail/TripDetailSketch';
import { TripMap } from '@/features/trips/map/TripMap';
import { distanceValue, formatClock, formatDay, formatDistance, inputToMiles, parseNumberInput } from '@/features/trips/format';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { refreshWidgets } from '@/features/widgets/refresh';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Divider, EmptyState, Field, IconButton, Screen, Segmented, Sheet, Txt, useSnackbar } from '@/ui';
import { ChevronLeft, ChevronRight, Home, Pencil, Repeat, Split, Trash2 } from '@/ui/icons';

const trim = (n: number) => String(Math.round(n * 10) / 10);
const minuteOfDay = (at: number) => {
  const d = new Date(at);
  return d.getHours() * 60 + d.getMinutes();
};
/** Same calendar day as `at`, at `min` minutes after midnight. */
const atMinute = (at: number, min: number) => {
  const d = new Date(at);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d.getTime();
};

const refresh = () => refreshWidgets().catch(() => {});

/** Chuyến (Miles row / Sort "Split trip"): GPS trips → S-07c Trip detail; manual trips → S-08 edit form. */
export default function TripScreen() {
  'use no memo';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const trip = useLive(() => (id ? getTrip(db, id) : undefined), [id], ['trips']);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));

  if (trip && (trip.status === 'running' || trip.status === 'paused')) return <Redirect href="/trip/active" />;
  if (!trip) {
    return (
      <Screen header={<ModalHeader icon={ChevronLeft} iconLabel={t('common.back')} onIcon={close} title={t('autoTrip.tripTitle')} />}>
        <EmptyState title={t('trip.notFound')} action={<Button label={t('trip.close')} variant="outline" full onPress={close} />} />
      </Screen>
    );
  }
  if (trip.source !== 'gps') return <ManualTripEdit trip={trip} unit={settings.distanceUnit} close={close} />;
  return <TripDetail trip={trip} close={close} />;
}

type EditKind = 'start' | 'end' | 'miles';

/** S-07c Trip detail for a recorded (GPS) trip. */
function TripDetail({ trip, close }: { trip: TripRow; close: () => void }) {
  'use no memo';
  const { settings } = useSettings();
  const { colors } = useTheme();
  const snack = useSnackbar();
  const unit = settings.distanceUnit;
  const raw = useLive(() => tripPointsOf(db, trip.id), [trip.id], ['trip_points']);
  const points = useMemo(() => countedPath(raw), [raw]);
  // From the track itself (same rule as the saved trip_stops), so trips recorded before Stops existed get them too.
  const stops = useMemo(() => findStops(raw), [raw]);
  const segments = useLive(() => listSegments(db, trip.id), [trip.id], ['trip_segments']);
  const personalRanges = useMemo(() => segments.filter((s) => s.scope === 'personal'), [segments]);

  const [stopIdx, setStopIdx] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditKind | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [purpose, setPurpose] = useState(trip.purpose);
  const [saveRegular, setSaveRegular] = useState(false);
  const currency = currencyOf(settings.region ?? 'UK');
  const parkingSaved = useLive(() => tripParkingMinor(db, trip.id), [trip.id], ['entries']);
  const parking = useAmountExpr(parkingSaved);

  const endedAt = trip.endedAt ?? trip.startedAt;
  const span = { startedAt: trip.startedAt, endedAt };
  const { workM, personalM } = splitMiles(trip.distanceM, trip.scope, segments);
  const dist = (m: number) => formatDistance(m, unit);

  const how = trip.startedBy === 'auto' ? t('autoTrip.auto') : trip.startedBy === 'nfc' ? t('autoTrip.nfc') : t('autoTrip.gps');
  const recorded =
    trip.edited && trip.originalDistanceM !== null
      ? t('autoTrip.recorded', {
          times: `${formatClock(trip.originalStartedAt ?? trip.startedAt)}–${formatClock(trip.originalEndedAt ?? endedAt)}`,
          distance: dist(trip.originalDistanceM),
        })
      : null;

  // ---- actions ----
  const changeScope = (scope: Scope) => {
    if (scope === trip.scope) return;
    const prev = setTripScope(db, trip.id, scope);
    refresh();
    if (prev) {
      snack({
        message: scope === 'work' ? t('autoTrip.markedWork') : t('autoTrip.markedPersonal'),
        actionLabel: t('autoTrip.undo'),
        onAction: () => {
          restoreTripScope(db, trip.id, prev);
          refresh();
        },
        above: 'none',
      });
    }
  };

  const markSegment = (i: number, side: 'to' | 'from') => {
    setStopIdx(null);
    const range = segmentForStop(stops, i, side, span);
    const existing = segments.find((s) => sameRange(s, range));
    const added = toggleSegment(db, trip.id, range);
    refresh();
    if (added) {
      snack({
        message: t(side === 'to' ? 'autoTrip.segMarked' : 'autoTrip.segFromMarked', { n: i + 1 }),
        actionLabel: t('autoTrip.undo'),
        onAction: () => deleteSegment(db, added.id),
        above: 'none',
      });
    } else if (existing) {
      snack({ message: t('autoTrip.segRemoved'), actionLabel: t('autoTrip.undo'), onAction: () => restoreSegment(db, existing), above: 'none' });
    }
  };

  const splitHere = (stop: Stop) => {
    setStopIdx(null);
    const before = getTrip(db, trip.id);
    const second = before ? splitTripAt(db, trip.id, stop.endedAt) : null;
    if (!before || !second) {
      snack({ message: t('autoTrip.splitFailed'), above: 'none' });
      return;
    }
    refresh();
    snack({
      message: t('autoTrip.splitDone'),
      actionLabel: t('autoTrip.undo'),
      onAction: () => {
        unsplitTrip(db, before, second);
        refresh();
      },
      above: 'none',
    });
  };

  const saveEdit = (e: TripEdit) => {
    const before = getTrip(db, trip.id);
    editGpsTrip(db, trip.id, e);
    setEdit(null);
    refresh();
    if (before) {
      snack({
        message: t('trip.updated'),
        actionLabel: t('autoTrip.undo'),
        onAction: () => {
          revertTripRow(db, before);
          refresh();
        },
        above: 'none',
      });
    }
  };

  const savePurpose = () => {
    if (purpose.trim() !== trip.purpose) updateTrip(db, trip.id, { purpose });
  };

  const remove = (deleteParking: boolean) => {
    setAskDelete(false);
    const undo = deleteTripToTrash(db, trip.id, deleteParking);
    refresh();
    close();
    snack({
      message: t('trip.deleted'),
      actionLabel: t('autoTrip.undo'),
      onAction: () => {
        undo?.();
        refresh();
      },
    });
  };

  const saveParking = () => {
    if (parking.minor === parkingSaved) return;
    const cur = getTrip(db, trip.id);
    if (cur) setTripParking(db, cur, parking.minor, currency, parkingNoteFor(cur));
  };

  const stop = stopIdx !== null ? (stops[stopIdx] ?? null) : null;
  const stopMin = (s: Stop) => Math.max(1, Math.round((s.endedAt - s.startedAt) / 60_000));
  const stopLabel = (i: number) => t('autoTrip.stopA11y', { n: i + 1, time: formatClock(stops[i].startedAt), min: stopMin(stops[i]) });
  const isPersonal = (i: number, side: 'to' | 'from') => segments.some((s) => sameRange(s, segmentForStop(stops, i, side, span)));

  const rows: { kind: EditKind; label: string; value: string }[] = [
    { kind: 'start', label: t('autoTrip.start'), value: formatClock(trip.startedAt) },
    { kind: 'end', label: t('autoTrip.end'), value: formatClock(endedAt) },
    { kind: 'miles', label: unit === 'km' ? t('autoTrip.km') : t('autoTrip.miles'), value: trim(distanceValue(trip.distanceM, unit)) },
  ];

  return (
    <Screen
      avoidKeyboard
      header={
        <ModalHeader
          icon={ChevronLeft}
          iconLabel={t('common.back')}
          onIcon={close}
          title={t('autoTrip.tripTitle')}
          right={<IconButton icon={Trash2} label={t('trip.deleteTrip')} onPress={() => setAskDelete(true)} />}
        />
      }>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {points.length >= 2 ? (
          <TripMap
            points={points}
            stops={stops}
            personal={personalRanges}
            allPersonal={trip.scope === 'personal'}
            height={300}
            interactive
            stopLabel={stopLabel}
            onStop={setStopIdx}
            fallback={
              <TripDetailSketch
                points={points}
                stops={stops}
                personal={personalRanges}
                allPersonal={trip.scope === 'personal'}
                height={220}
                stopLabel={stopLabel}
                onStop={setStopIdx}
              />
            }
          />
        ) : (
          <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Txt v="small" c="textSecondary" center>
              {t('autoTrip.noRoute')}
            </Txt>
          </View>
        )}
      </Card>

      <View style={{ gap: 8 }}>
        <Txt v="h2" accessibilityRole="header">
          {`${formatDay(trip.startedAt)} · ${formatClock(trip.startedAt)} → ${formatClock(endedAt)}`}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge kind={trip.startedBy === 'auto' ? 'auto' : 'neutral'} label={how} />
          {trip.edited ? <Badge kind="neutral" label={t('autoTrip.edited')} /> : null}
          {trip.scope === 'unsorted' ? <Badge kind="unsorted" label={t('autoTrip.unsorted')} /> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 2 }}>
          <Txt v="meta" c="textSecondary">
            {t('autoTrip.workMi')}
          </Txt>
          <Txt v="amountMd" c="work">
            {dist(workM)}
          </Txt>
        </Card>
        <Card style={{ flex: 1, gap: 2 }}>
          <Txt v="meta" c="textSecondary">
            {t('autoTrip.personalMi')}
          </Txt>
          <Txt v="amountMd" c="personal">
            {dist(personalM)}
          </Txt>
        </Card>
      </View>

      <View style={{ gap: 6 }}>
        <Card style={{ paddingVertical: 0 }}>
          {rows.map((r, i) => (
            <View key={r.kind}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('autoTrip.editA11y', { field: r.label, value: r.value })}
                onPress={() => setEdit(r.kind)}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 12 }}>
                <Txt v="body" style={{ flex: 1 }}>
                  {r.label}
                </Txt>
                <Txt v="amountRow">{r.value}</Txt>
                <Pencil size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </Card>
        {recorded ? (
          <Txt v="fine" c="textSecondary" style={{ paddingHorizontal: 4 }}>
            {recorded}
          </Txt>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Segmented<Scope | 'unsorted'>
          accessibilityLabel={t('autoTrip.scopeA11y')}
          value={trip.scope}
          onChange={(v) => v !== 'unsorted' && changeScope(v)}
          options={[
            { value: 'work', label: t('common.work') },
            { value: 'personal', label: t('common.personal') },
          ]}
        />
        {trip.scope === 'unsorted' ? (
          <Txt v="fine" c="textSecondary" style={{ paddingHorizontal: 4 }}>
            {t('autoTrip.unsortedNote')}
          </Txt>
        ) : null}
      </View>

      <Field
        label={t('trip.purpose')}
        placeholder={t('trip.purposePlaceholder')}
        value={purpose}
        onChangeText={setPurpose}
        onEndEditing={savePurpose}
        onBlur={savePurpose}
        returnKeyType="done"
        maxLength={120}
      />

      <ParkingField amount={parking} currency={currency} onDone={saveParking} />
      <Button label={t('s6.saveRegular')} icon={Repeat} variant="outline" full onPress={() => setSaveRegular(true)} />
      {saveRegular ? (
        <SaveRegularSheet
          trip={trip}
          unit={unit}
          visible
          onClose={() => setSaveRegular(false)}
          onSaved={() => {
            setSaveRegular(false);
            snack({ message: t('s6.regularSaved'), above: 'none' });
          }}
        />
      ) : null}

      {/* Stop sheet */}
      <Sheet visible={stop !== null} onClose={() => setStopIdx(null)} scroll={false}>
        {stop && stopIdx !== null ? (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Txt v="h3">{String(stopIdx + 1)}</Txt>
              </View>
              <Txt v="h2" accessibilityRole="header" style={{ flex: 1 }}>
                {t('autoTrip.stopAt', { time: formatClock(stop.startedAt), min: stopMin(stop) })}
              </Txt>
            </View>
            {trip.scope !== 'personal' ? (
              <>
                <SheetRow
                  icon={Home}
                  label={isPersonal(stopIdx, 'to') ? t('autoTrip.toWork') : t('autoTrip.toPersonal')}
                  onPress={() => markSegment(stopIdx, 'to')}
                />
                <Divider />
                <SheetRow
                  icon={Home}
                  label={isPersonal(stopIdx, 'from') ? t('autoTrip.fromWork') : t('autoTrip.fromPersonal')}
                  onPress={() => markSegment(stopIdx, 'from')}
                />
                <Divider />
              </>
            ) : null}
            <SheetRow icon={Split} label={t('autoTrip.splitHere')} onPress={() => splitHere(stop)} />
          </View>
        ) : null}
      </Sheet>

      {edit === 'start' || edit === 'end' ? (
        <TimeSheet
          title={edit === 'start' ? t('autoTrip.startTime') : t('autoTrip.endTime')}
          value={edit === 'start' ? trip.startedAt : endedAt}
          recordedAt={edit === 'start' ? (trip.originalStartedAt ?? trip.startedAt) : (trip.originalEndedAt ?? endedAt)}
          validate={(at) => (edit === 'start' ? at < endedAt : at > trip.startedAt)}
          onClose={() => setEdit(null)}
          onSave={(at) => (at === (edit === 'start' ? trip.startedAt : endedAt) ? setEdit(null) : saveEdit(edit === 'start' ? { startedAt: at } : { endedAt: at }))}
        />
      ) : null}
      {edit === 'miles' ? (
        <MilesSheet
          unit={unit}
          meters={trip.distanceM}
          recordedM={trip.originalDistanceM ?? trip.distanceM}
          onClose={() => setEdit(null)}
          onSave={(miles) => saveEdit({ miles })}
        />
      ) : null}

      <TripDeleteDialog
        visible={askDelete}
        parkingMinor={parkingSaved}
        currency={currency}
        onClose={() => setAskDelete(false)}
        onDelete={remove}
      />
    </Screen>
  );
}

function SheetRow({ icon: Icon, label, onPress }: { icon: typeof Home; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 8 }}>
      <Icon size={22} color={colors.text} />
      <Txt v="body" style={{ flex: 1 }}>
        {label}
      </Txt>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

function TimeSheet({
  title,
  value,
  recordedAt,
  validate,
  onClose,
  onSave,
}: {
  title: string;
  value: number;
  recordedAt: number;
  validate: (at: number) => boolean;
  onClose: () => void;
  onSave: (at: number) => void;
}) {
  const [min, setMin] = useState(() => minuteOfDay(value));
  const at = atMinute(value, min);
  const ok = validate(at);
  return (
    <Sheet
      visible
      onClose={onClose}
      title={title}
      scroll={false}
      footer={<Button label={t('common.save')} variant="sun" full disabled={!ok} onPress={() => onSave(at)} />}>
      <View style={{ gap: 12, marginBottom: 12 }}>
        <TimeWheel value={min} onChange={setMin} hourLabel={t('autoTrip.hours')} minuteLabel={t('autoTrip.minutes')} />
        <Txt v="small" c={ok ? 'textSecondary' : 'error'} accessibilityLiveRegion="polite">
          {ok ? t('autoTrip.recordedNote', { value: formatClock(recordedAt) }) : t('autoTrip.endBeforeStart')}
        </Txt>
      </View>
    </Sheet>
  );
}

function MilesSheet({
  unit,
  meters,
  recordedM,
  onClose,
  onSave,
}: {
  unit: 'mi' | 'km';
  meters: number;
  recordedM: number;
  onClose: () => void;
  onSave: (miles: number) => void;
}) {
  const shown = trim(distanceValue(meters, unit));
  const [text, setText] = useState(shown);
  const n = parseNumberInput(text);
  const error = text.trim() === '' ? t('trip.enterDistance') : n === null || n <= 0 ? t('trip.invalidNumber') : null;
  return (
    <Sheet
      visible
      onClose={onClose}
      title={unit === 'km' ? t('autoTrip.km') : t('autoTrip.miles')}
      footer={
        <Button
          label={t('common.save')}
          variant="sun"
          full
          disabled={error !== null}
          // Untouched (same rounded number as shown) keeps the exact GPS distance and no "Edited" tag; typing the
          // recorded number back gives the exact recorded distance (the repo then drops "Edited").
          onPress={() =>
            text.trim() === shown
              ? onClose()
              : text.trim() === trim(distanceValue(recordedM, unit))
                ? onSave(metersToMiles(recordedM))
                : n !== null && onSave(inputToMiles(n, unit))
          }
        />
      }>
      <Field
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        autoFocus
        selectTextOnFocus
        error={text === shown ? null : error}
        right={<Txt v="body" c="textSecondary">{unit}</Txt>}
      />
      <Txt v="small" c="textSecondary">
        {t('autoTrip.recordedNote', { value: formatDistance(recordedM, unit) })}
      </Txt>
    </Sheet>
  );
}
