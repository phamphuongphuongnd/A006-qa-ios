import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { db } from '@/db/client';
import type { OdometerReadingRow } from '@/db/schema';
import { CameraDeniedDialog, takePhoto } from '@/features/entries/photo';
import { dayMonth } from '@/features/entries/format';
import { compareReadings, readingMiles, type OdometerResult } from '@/features/trips/check/odometer';
import { acceptReading, addReading, deleteReading, latestReading, listReadings, loggedMiles } from '@/features/trips/check/repo';
import { readingValue } from '@/features/trips/check/rows';
import { formatDistance, parseNumberInput, type DistanceUnit } from '@/features/trips/format';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { deleteReceiptFiles, receiptUri, saveReceipt } from '@/files/receipts';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Button, Card, Dialog, Field, IconButton, Screen, Txt, useSnackbar } from '@/ui';
import { Camera, CheckCircle2, Gauge, Trash2, TriangleAlert, X } from '@/ui/icons';

const MIN = 60_000;

/**
 * S-08b Odometer check (Q27, free): type the odometer (+ optional photo, not counted in the 20 photos a month) → compared
 * with the miles logged since the previous reading. `?id=` shows a saved reading (from its Miles row) with Delete.
 */
export default function OdometerScreen() {
  'use no memo';
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { settings } = useSettings();
  const unit = settings.distanceUnit;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));
  const readings = useLive(() => listReadings(db), [], ['odometer_readings']);
  const [savedId, setSavedId] = useState<string | null>(null);
  const shownId = id ?? savedId;
  const shown = shownId ? readings.find((r) => r.id === shownId) : undefined;

  if (shownId && shown) return <ReadingResult reading={shown} readings={readings} unit={unit} close={close} fresh={!id} />;
  if (id) {
    return (
      <Screen header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} title={t('tripCheck.odoTitle')} />}>
        <Txt c="textSecondary">{t('trip.notFound')}</Txt>
      </Screen>
    );
  }
  return <NewReading unit={unit} close={close} onSaved={setSavedId} />;
}

function NewReading({ unit, close, onSaved }: { unit: DistanceUnit; close: () => void; onSaved: (id: string) => void }) {
  const { colors } = useTheme();
  const last = useLive(() => latestReading(db), [], ['odometer_readings']);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [askLower, setAskLower] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // QA-100 MOD-7: `busy` is state — two taps in one frame both saw false. The ref latches at once.
  const busyRef = useRef(false);
  const value = parseNumberInput(text);
  const error = touched && (value === null || value <= 0) ? t('tripCheck.odoInvalid') : null;

  const save = async (v: number) => {
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let photoPath: string | null = null;
    try {
      if (photo) photoPath = await saveReceipt(photo);
    } catch {
      photoPath = null; // The reading matters more than the photo.
    }
    const row = addReading(db, { value: v, unit, photoPath });
    setBusy(false);
    onSaved(row.id);
  };

  const submit = () => {
    setTouched(true);
    if (value === null || value <= 0) return;
    if (last && readingMiles({ value, unit }) < readingMiles(last)) {
      setAskLower(value);
      return;
    }
    void save(value);
  };

  const addPhoto = async () => {
    const r = await takePhoto('camera');
    if (r.ok) setPhoto(r.uri);
    else if (r.reason === 'denied') setCameraDenied(true);
  };

  return (
    <Screen
      header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} title={t('tripCheck.odoTitle')} />}
      avoidKeyboard
      bottomInset
      bottom={<Button label={t('tripCheck.save')} full style={{ flex: 1 }} onPress={submit} disabled={busy} />}>
      <View style={{ gap: 16 }}>
        <Txt v="body" c="textSecondary">
          {t('tripCheck.odoIntro')}
        </Txt>
        {last ? (
          <Txt v="small" c="textSecondary" style={{ fontFamily: fonts.semibold }}>
            {t('tripCheck.odoLast', { value: readingValue(last), date: dayMonth(last.readAt) })}
          </Txt>
        ) : null}
        <Field
          label={t('tripCheck.odoReadingIn', { unit })}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          autoFocus
          placeholder={t('tripCheck.odoPlaceholder')}
          style={{ fontFamily: fonts.bold }}
          error={error}
        />
        {photo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={{ uri: photo }} style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: colors.surfaceAlt }} accessibilityIgnoresInvertColors />
            <Txt v="body" style={{ flex: 1 }}>
              {t('tripCheck.photoAdded')}
            </Txt>
            <IconButton icon={Trash2} label={t('tripCheck.removePhoto')} onPress={() => setPhoto(null)} />
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Button label={t('tripCheck.addPhoto')} icon={Camera} variant="outline" onPress={() => void addPhoto()} />
            <Txt v="caption" c="textTertiary">
              {t('tripCheck.photoFree')}
            </Txt>
          </View>
        )}
      </View>
      <CameraDeniedDialog visible={cameraDenied} onClose={() => setCameraDenied(false)} />
      <Dialog
        visible={askLower !== null}
        title={last ? t('tripCheck.odoLowerTitle', { value: readingValue(last) }) : ''}
        body={t('tripCheck.odoLowerBody')}
        onClose={() => setAskLower(null)}
        actions={[
          { label: t('tripCheck.cancel'), onPress: () => setAskLower(null) },
          {
            label: t('tripCheck.saveAnyway'),
            variant: 'primary',
            onPress: () => {
              const v = askLower;
              setAskLower(null);
              if (v !== null) void save(v);
            },
          },
        ]}
      />
    </Screen>
  );
}

/** The comparison for one reading (just saved, or opened from Miles). */
function ReadingResult({
  reading,
  readings,
  unit,
  close,
  fresh,
}: {
  reading: OdometerReadingRow;
  readings: OdometerReadingRow[];
  unit: DistanceUnit;
  close: () => void;
  fresh: boolean;
}) {
  const { colors } = useTheme();
  const snack = useSnackbar();
  const [askDelete, setAskDelete] = useState(false);
  const idx = readings.findIndex((r) => r.id === reading.id);
  const prev = idx > 0 ? readings[idx - 1] : null;
  const result: OdometerResult = useLive(
    () => compareReadings(prev, reading, prev ? loggedMiles(db, prev.readAt, reading.readAt) : 0),
    [reading.id, prev?.id],
    ['trips'],
  );
  const d = (mi: number) => formatDistance(mi * 1609.344, unit, 0);
  const compare =
    prev && result.kind !== 'start'
      ? t('tripCheck.odoCompare', { odo: d(result.odoMiles), date: dayMonth(prev.readAt), app: d(result.appMiles) })
      : null;

  const addMissing = (miles: number) =>
    router.replace({ pathname: '/trip/new', params: { odoMiles: String(Math.round(miles * 10) / 10), date: String(reading.readAt - MIN) } });
  const fine = () => {
    acceptReading(db, reading.id);
    close();
  };

  const tone = result.kind === 'missing' || result.kind === 'over' ? 'warn' : 'ok';
  const Icon = tone === 'warn' ? TriangleAlert : result.kind === 'start' ? Gauge : CheckCircle2;
  const title =
    result.kind === 'start'
      ? t('tripCheck.odoStart')
      : result.kind === 'match'
        ? t('tripCheck.odoMatch', { distance: d(result.appMiles) })
        : result.kind === 'missing'
          ? t('tripCheck.odoMissingTitle', { distance: d(result.diffMiles) })
          : t('tripCheck.odoOverTitle');

  return (
    <Screen
      header={
        <ModalHeader
          icon={X}
          iconLabel={t('trip.close')}
          onIcon={close}
          title={t('tripCheck.odoTitle')}
          right={<IconButton icon={Trash2} label={t('tripCheck.deleteReading')} color="error" onPress={() => setAskDelete(true)} />}
        />
      }
      bottomInset
      bottom={
        result.kind === 'missing' ? (
          <View style={{ flex: 1, gap: 8 }}>
            <Button label={t('tripCheck.addMissing')} full onPress={() => addMissing(result.diffMiles)} />
            <Button label={t('tripCheck.thatsFine')} variant="text" full onPress={fine} />
          </View>
        ) : result.kind === 'over' ? (
          <View style={{ flex: 1, gap: 8 }}>
            <Button
              label={t('tripCheck.reviewTrips')}
              full
              onPress={() => {
                router.dismissTo('/miles');
              }}
            />
            <Button label={t('tripCheck.thatsFine')} variant="text" full onPress={fine} />
          </View>
        ) : (
          <Button label={t('tripCheck.done')} full style={{ flex: 1 }} onPress={close} />
        )
      }>
      <Txt v="label" c="textSecondary">
        {t('tripCheck.odoRow', { value: readingValue(reading), date: dayMonth(reading.readAt) })}
      </Txt>
      <Card variant={tone === 'warn' ? 'warn' : undefined} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Icon size={24} color={tone === 'warn' ? colors.expenseText : colors.incomeText} strokeWidth={2} />
          <Txt v="h3" style={{ flex: 1 }} accessibilityLiveRegion={fresh ? 'polite' : undefined}>
            {title}
          </Txt>
        </View>
        {result.kind === 'over' ? (
          <Txt v="body" c="textSecondary">
            {t('tripCheck.odoOverBody')}
          </Txt>
        ) : null}
        {compare ? (
          <Txt v="small" c="textSecondary">
            {compare}
          </Txt>
        ) : null}
      </Card>
      {reading.photoPath ? (
        <Pressable accessibilityRole="image" accessibilityLabel={t('tripCheck.photoAdded')}>
          <Image source={{ uri: receiptUri(reading.photoPath) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} accessibilityIgnoresInvertColors />
        </Pressable>
      ) : null}
      <Dialog
        visible={askDelete}
        title={t('tripCheck.deleteReading')}
        body=""
        onClose={() => setAskDelete(false)}
        actions={[
          { label: t('tripCheck.cancel'), onPress: () => setAskDelete(false) },
          {
            label: t('common.delete'),
            variant: 'danger',
            onPress: () => {
              setAskDelete(false);
              deleteReading(db, reading.id);
              if (reading.photoPath) deleteReceiptFiles([reading.photoPath]);
              snack({ message: t('tripCheck.readingDeleted') });
              close();
            },
          },
        ]}
      />
    </Screen>
  );
}
