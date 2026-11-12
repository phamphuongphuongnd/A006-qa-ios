import { router } from 'expo-router';
import { LocateFixed, Pause, Play, Square, TriangleAlert } from '@/ui/icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { acknowledgeInterrupted } from '@/db/tripsRepo';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, useTheme } from '@/theme';
import { Button, Card, Txt } from '@/ui';

import { formatClock, formatDistance, formatDuration } from './format';
import { useActiveTrip, useInterruptedTrip } from './hooks';

/**
 * Navy "TRIP RUNNING" card (Home S-02 + Miles S-07). Renders nothing without a running / paused trip.
 * Buttons hand off to the Active trip screen (`/trip/active?action=…`), which owns the trip logic.
 */
export function ActiveTripCard() {
  const { trip, now, gps } = useActiveTrip();
  const { settings } = useSettings();
  const { colors } = useTheme();
  if (!trip) return null;
  const paused = trip.status === 'paused';
  const distance = formatDistance(trip.distanceM, settings.distanceUnit);
  const duration = formatDuration(now - trip.startedAt);
  const muted = '#C8D0DE';
  return (
    <Card
      variant="navy"
      onPress={() => router.push('/trip/active')}
      accessibilityLabel={`${paused ? t('home.paused') : t('trip.recording')} · ${distance} · ${duration}`}
      style={{ gap: 14, padding: 18 }}>
      <View style={styles.row}>
        {paused ? (
          <View style={styles.flex}>
            <Pause size={16} color={colors.sun} strokeWidth={2.4} />
            <Text style={[styles.caps, { color: colors.sun }]}>{t('trip.pausedLabel')}</Text>
          </View>
        ) : (
          <View style={styles.flex}>
            <View style={styles.recDot} />
            <Text style={[styles.caps, { color: '#FFFFFF' }]}>{t('trip.runningCaps')}</Text>
          </View>
        )}
        {!paused ? (
          <View style={styles.flex}>
            <LocateFixed size={16} color={muted} strokeWidth={2} />
            <Text style={{ color: muted, fontSize: 14, fontFamily: fonts.medium }}>
              {gps === 'good' ? t('trip.gpsGood') : gps === 'weak' ? t('trip.gpsWeak') : t('trip.gpsSearching')}
            </Text>
          </View>
        ) : null}
      </View>
      {paused ? (
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontFamily: fonts.bold }}>{t('home.paused')}</Text>
      ) : null}
      <View style={[styles.flex, { alignItems: 'baseline', gap: 14 }]}>
        <Text maxFontSizeMultiplier={1.4} style={{ color: '#FFFFFF', fontSize: 44, lineHeight: 48, fontFamily: fonts.extrabold, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
          {distance}
        </Text>
        <Text style={{ color: muted, fontSize: 16, fontFamily: fonts.regular }}>{duration}</Text>
      </View>
      <View style={[styles.flex, { gap: 10 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/trip/active?action=${paused ? 'resume' : 'pause'}`)}
          style={({ pressed }) => [styles.btn, { borderWidth: 1.5, borderColor: '#5B6788', opacity: pressed ? 0.8 : 1 }]}>
          {paused ? <Play size={18} color="#FFFFFF" strokeWidth={2.2} /> : <Pause size={18} color="#FFFFFF" strokeWidth={2.2} />}
          <Text style={styles.btnTxt}>{paused ? t('home.resume') : t('home.personalStop')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/trip/active?action=end')}
          style={({ pressed }) => [styles.btn, { backgroundColor: colors.sun, opacity: pressed ? 0.85 : 1 }]}>
          <Square size={18} color="#1F2A44" strokeWidth={2.2} />
          <Text style={[styles.btnTxt, { color: '#1F2A44' }]}>{t('home.endTrip')}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

/**
 * Orange "Your trip stopped recording at 14:05" card shown after the OS stopped a trip (Home + Miles).
 * "Add missing miles" opens Add trip for that day; "OK" keeps the saved miles. Both dismiss the card.
 */
export function InterruptedTripCard() {
  const trip = useInterruptedTrip();
  const { settings } = useSettings();
  const { colors } = useTheme();
  if (!trip) return null;
  const at = trip.endedAt ?? trip.lastPointAt ?? trip.startedAt;
  const ack = () => acknowledgeInterrupted(db, trip.id);
  return (
    <Card variant="warn" style={{ gap: 12 }}>
      <View style={[styles.flex, { alignItems: 'flex-start', gap: 12 }]}>
        <TriangleAlert size={24} color={colors.expenseText} strokeWidth={2} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h3">{t('miles.stopped', { time: formatClock(at) })}</Txt>
          <Txt v="small" c="textSecondary">
            {t('trip.stoppedSaved', { distance: formatDistance(trip.distanceM, settings.distanceUnit) })}
          </Txt>
        </View>
      </View>
      <View style={[styles.flex, { gap: 10 }]}>
        <Button
          label={t('trip.addMissing')}
          size="sm"
          style={{ flex: 1 }}
          onPress={() => {
            ack();
            router.push(`/trip/new?date=${at}`);
          }}
        />
        <Button label={t('trip.ok')} size="sm" variant="outline" onPress={ack} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caps: { fontSize: 14, fontFamily: fonts.extrabold, letterSpacing: 0.84 },
  recDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5A4E',
    borderWidth: 4,
    borderColor: 'rgba(255,90,78,0.35)',
  },
  btn: { flex: 1, minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  btnTxt: { color: '#FFFFFF', fontSize: 15, fontFamily: fonts.bold },
});
