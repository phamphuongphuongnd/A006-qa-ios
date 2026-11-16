import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { Briefcase, Check, ChevronDown, Flag, LocateFixed, MapPin, Pause, Play, Square, User } from '@/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import type { TripRow } from '@/db/schema';
import { getTrip, recentPurposes, tripPointsOf } from '@/db/tripsRepo';
import { pickerScope, type Scope } from '@/domain/types';
import {
  discardTrip,
  endActiveTrip,
  needsBackgroundStep,
  openLocationSettings,
  pauseActiveTrip,
  resumeActiveTrip,
  saveEndedTrip,
  startBlocker,
  startGpsTrip,
} from '@/features/trips/controller';
import { distanceValue, formatClock, formatDay, formatDistance, formatDuration } from '@/features/trips/format';
import { useActiveTrip } from '@/features/trips/hooks';
import { setTripScope } from '@/features/trips/auto/repo';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { wasBackgroundStepShown } from '@/features/trips/permissionState';
import { RouteSketch } from '@/features/trips/RouteSketch';
import { countedPath, formatDistanceNumber } from '@/domain/mileage';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Badge, Button, Card, Chip, ChipRow, Dialog, EmptyState, Field, Segmented, Sheet, Txt, useSnackbar } from '@/ui';

type Action = 'pause' | 'resume' | 'end';

/**
 * S-07b Active trip. Params from Home / Miles / widget / notifications:
 * `start=1` starts a GPS trip (after S-07a / GPS-off checks), `action=pause|resume|end` acts on the running trip.
 */
export default function ActiveTripScreen() {
  const params = useLocalSearchParams<{ start?: string; action?: string }>();
  const { trip, now, gps } = useActiveTrip();
  const { settings } = useSettings();
  const unit = settings.distanceUnit;
  const snack = useSnackbar();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [starting, setStarting] = useState(false);
  const [gpsOff, setGpsOff] = useState(false);
  const [endedId, setEndedId] = useState<string | null>(null);
  const handled = useRef('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const begin = async () => {
    setStarting(true);
    try {
      const blocker = await startBlocker();
      if (blocker === 'needs_permission') {
        router.replace('/trip/permission?next=start');
        return;
      }
      if (blocker === 'gps_off') {
        setGpsOff(true);
        return;
      }
      if ((await needsBackgroundStep()) && !wasBackgroundStepShown()) {
        router.replace('/trip/permission?next=start&step=2');
        return;
      }
      await startGpsTrip();
    } catch {
      snack({ message: t('trip.startFailed'), tone: 'error', above: 'none' });
    } finally {
      setStarting(false);
    }
  };

  const act = async (a: Action) => {
    try {
      if (a === 'pause') await pauseActiveTrip();
      else if (a === 'resume') {
        if ((await startBlocker()) === 'gps_off') {
          setGpsOff(true);
          return;
        }
        await resumeActiveTrip();
      } else {
        const done = await endActiveTrip();
        if (done) setEndedId(done.id);
      }
    } catch {
      snack({ message: t('trip.startFailed'), tone: 'error', above: 'none' });
    }
  };

  // Handle each incoming start / action param once.
  useEffect(() => {
    const key = `${params.start ?? ''}|${params.action ?? ''}`;
    if (key === '|') {
      handled.current = '';
      return;
    }
    if (key === handled.current) return;
    handled.current = key;
    router.setParams({ start: undefined, action: undefined });
    const a = params.action;
    // Run after the effect (the handlers set state).
    Promise.resolve().then(() => {
      if (params.start === '1') begin();
      else if (a === 'pause' || a === 'resume' || a === 'end') act(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.start, params.action]);

  // Only the fixes that count toward the miles, so standing-still jitter doesn't draw a zigzag.
  const points = useLive(() => (trip ? countedPath(tripPointsOf(db, trip.id)) : []), [trip?.id], ['trip_points']);
  const ended = useLive(() => (endedId ? getTrip(db, endedId) : undefined), [endedId], ['trips']);
  const paused = trip?.status === 'paused';

  const gpsDialog = (
    <Dialog
      visible={gpsOff}
      title={t('trip.gpsOffTitle')}
      body={t('miles.gpsOff')}
      onClose={() => setGpsOff(false)}
      actions={[
        { label: t('common.notNow'), onPress: () => setGpsOff(false) },
        {
          label: t('common.openSettings'),
          variant: 'primary',
          onPress: () => {
            setGpsOff(false);
            openLocationSettings();
          },
        },
      ]}
    />
  );

  const endSheet = ended ? (
    <EndTripSheet
      trip={ended}
      unit={unit}
      onDone={(saved) => {
        setEndedId(null);
        snack({
          message: saved ? t('trip.saved', { distance: formatDistance(ended.distanceM, unit) }) : t('trip.discarded'),
        });
        close();
      }}
    />
  ) : null;

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <ModalHeader icon={ChevronDown} iconLabel={t('trip.minimise')} onIcon={close} />
        {ended ? (
          <View style={styles.center}>
            <Txt v="amount" size={88} style={{ lineHeight: 92, letterSpacing: -3.5 }}>
              {formatDistanceNumber(distanceValue(ended.distanceM, unit))}
            </Txt>
          </View>
        ) : starting || params.start === '1' ? (
          <View style={[styles.center, { gap: 14 }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Txt v="h3" c="textSecondary">
              {t('trip.gpsSearching')}
            </Txt>
          </View>
        ) : (
          <View style={[styles.center, { paddingHorizontal: GUTTER }]}>
            <EmptyState
              art={<MapPin size={48} color={colors.textTertiary} strokeWidth={1.8} />}
              title={t('trip.noTrip')}
              body={t('trip.noTripSub')}
              action={<Button label={t('home.startTrip')} icon={Flag} full onPress={begin} />}
            />
          </View>
        )}
        {gpsDialog}
        {endSheet}
      </View>
    );
  }

  const value = formatDistanceNumber(distanceValue(trip.distanceM, unit));
  const sub = t('trip.milesDuration', { unit: unit === 'km' ? t('trip.unitKm') : t('trip.unitMiles'), duration: formatDuration(now - trip.startedAt) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ModalHeader
        icon={ChevronDown}
        iconLabel={t('trip.minimise')}
        onIcon={close}
        center={paused ? <PausedLabel /> : <RecordingLabel />}
        right={paused ? null : <GpsPill quality={gps} />}
      />
      <View style={{ flex: 1, paddingHorizontal: GUTTER, alignItems: 'center', paddingTop: 24, gap: 8 }}>
        <Txt
          v="amount"
          size={88}
          c={paused ? 'textTertiary' : 'text'}
          style={{ lineHeight: 92, letterSpacing: -3.5 }}
          accessibilityLabel={`${formatDistance(trip.distanceM, unit)}, ${formatDuration(now - trip.startedAt)}`}
          maxFontSizeMultiplier={1.2}>
          {value}
        </Txt>
        <Txt v="h2" c="textSecondary">
          {sub}
        </Txt>
        {paused ? (
          <Card variant="sun" style={{ alignSelf: 'stretch', marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <User size={28} color={colors.sunText} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{t('home.paused')}</Txt>
              <Txt v="small" c="sunText">
                {t('trip.pausedSub')}
              </Txt>
            </View>
          </Card>
        ) : null}
        <Card style={{ alignSelf: 'stretch', flex: 1, maxHeight: paused ? 210 : 290, marginTop: paused ? 6 : 20, padding: 0, overflow: 'hidden', opacity: paused ? 0.7 : 1 }}>
          <RouteSketch points={points} height={paused ? 210 : 290} live={!paused} />
        </Card>
        {!paused ? (
          <Txt v="caption" c="textTertiary">
            {t('trip.started', { time: formatClock(trip.startedAt) })}
          </Txt>
        ) : null}
        {trip.startedBy === 'auto' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Badge kind="auto" label={t('autoTrip.auto')} />
            {trip.scope !== 'personal' ? (
              <Button label={t('autoTrip.markPersonalNow')} variant="text" size="sm" onPress={() => setTripScope(db, trip.id, 'personal')} />
            ) : (
              <Txt v="small" c="textSecondary">
                {t('autoTrip.markedPersonalNow')}
              </Txt>
            )}
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
        {paused ? (
          <Button label={t('home.resume')} icon={Play} size="big" onPress={() => act('resume')} />
        ) : (
          <Button label={t('home.personalStop')} icon={Pause} size="big" variant="outline" onPress={() => act('pause')} />
        )}
        <EndButton onPress={() => act('end')} />
      </View>
      {gpsDialog}
      {endSheet}
    </View>
  );
}

function RecordingLabel() {
  const { colors, dark } = useTheme();
  return (
    <View style={styles.flex} accessibilityRole="text">
      <View style={[styles.dot, { backgroundColor: dark ? '#FF6B5E' : '#E5483B', borderColor: dark ? 'rgba(255,107,94,0.3)' : 'rgba(229,72,59,0.25)' }]} />
      <Text style={[styles.caps, { color: colors.text }]}>{t('trip.recording')}</Text>
    </View>
  );
}

function PausedLabel() {
  const { colors } = useTheme();
  return (
    <View style={styles.flex}>
      <Pause size={18} color={colors.sunText} strokeWidth={2.4} />
      <Text style={[styles.caps, { color: colors.sunText }]}>{t('trip.pausedLabel')}</Text>
    </View>
  );
}

function GpsPill({ quality }: { quality: 'good' | 'weak' | 'searching' }) {
  const { colors } = useTheme();
  const good = quality === 'good';
  const fg = good ? colors.incomeText : colors.sunText;
  return (
    <View style={[styles.pill, { backgroundColor: good ? colors.incomeSoft : colors.sunSoft }]} accessibilityLiveRegion="polite">
      <LocateFixed size={16} color={fg} strokeWidth={2.2} />
      <Text style={{ color: fg, fontSize: 13, fontFamily: fonts.bold }} numberOfLines={1}>
        {good ? t('trip.gpsGood') : quality === 'weak' ? t('trip.gpsWeak') : t('trip.gpsSearching')}
      </Text>
    </View>
  );
}

/** Red outlined 72dp "End trip" (mockup: transparent with 2.5px error ring). */
function EndButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.end, { borderColor: colors.error, opacity: pressed ? 0.8 : 1 }]}>
      <Square size={26} color={colors.error} strokeWidth={2.2} />
      <Text maxFontSizeMultiplier={1.6} style={{ color: colors.error, fontSize: 20, fontFamily: fonts.bold }}>
        {t('home.endTrip')}
      </Text>
    </Pressable>
  );
}

/** "Trip saved · 128.4 mi" sheet: Work / Personal, purpose, Save / Discard trip. Closing the sheet saves. */
function EndTripSheet({ trip, unit, onDone }: { trip: TripRow; unit: 'mi' | 'km'; onDone: (saved: boolean) => void }) {
  const { colors } = useTheme();
  const [scope, setScope] = useState<Scope>(pickerScope(trip.scope));
  const [purpose, setPurpose] = useState(trip.purpose);
  const [askDiscard, setAskDiscard] = useState(false);
  const [suggestions] = useState(() => recentPurposes(db, 4));
  const save = () => {
    saveEndedTrip(trip.id, scope, purpose);
    onDone(true);
  };
  const range = t('trip.endedRange', {
    date: formatDay(trip.startedAt),
    from: formatClock(trip.startedAt),
    to: formatClock(trip.endedAt ?? trip.startedAt),
  });
  return (
    <Sheet visible onClose={save}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.incomeSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={28} color={colors.incomeText} strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="h2" accessibilityRole="header">
            {t('trip.endedTitle', { distance: formatDistance(trip.distanceM, unit) })}
          </Txt>
          <Txt v="small" c="textSecondary">
            {range}
          </Txt>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {t('trip.scope')}
        </Txt>
        <Segmented
          accessibilityLabel={t('trip.scope')}
          value={scope}
          onChange={setScope}
          options={[
            { value: 'work', label: t('common.work'), icon: Briefcase },
            { value: 'personal', label: t('common.personal') },
          ]}
        />
      </View>
      <Field label={t('trip.purpose')} value={purpose} onChangeText={setPurpose} placeholder={t('trip.purposePlaceholder')} maxLength={120} />
      {suggestions.filter((s) => s !== purpose.trim()).length > 0 ? (
        <ChipRow>
          {suggestions
            .filter((s) => s !== purpose.trim())
            .map((s) => (
              <Chip key={s} label={s} size="s" onPress={() => setPurpose(s)} />
            ))}
        </ChipRow>
      ) : null}
      <Button label={t('common.save')} full onPress={save} />
      <Pressable accessibilityRole="button" onPress={() => setAskDiscard(true)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: -8 }}>
        <Text style={{ color: colors.error, fontSize: 17, fontFamily: fonts.bold }}>{t('trip.discardTrip')}</Text>
      </Pressable>
      <Dialog
        visible={askDiscard}
        title={t('trip.discardConfirm')}
        body={t('trip.discardBody', { distance: formatDistance(trip.distanceM, unit) })}
        onClose={() => setAskDiscard(false)}
        actions={[
          { label: t('common.cancel'), onPress: () => setAskDiscard(false) },
          {
            label: t('common.discard'),
            variant: 'danger',
            onPress: async () => {
              setAskDiscard(false);
              await discardTrip(trip.id);
              onDone(false);
            },
          },
        ]}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 0 },
  caps: { fontSize: 13, fontFamily: fonts.extrabold, letterSpacing: 1.04 },
  pill: { height: 32, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  end: { flex: 1, minHeight: 72, borderRadius: 24, borderWidth: 2.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
});
