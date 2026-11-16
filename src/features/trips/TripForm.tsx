import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Briefcase, Calendar, ChevronDown } from '@/ui/icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { LONG_TRIP_MILES } from '@/domain/mileage';
import { t } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme';
import { Button, Card, Dialog, Field, Screen, Segmented, Sheet, Txt } from '@/ui';

import type { Region, TripScope } from '@/domain/types';

import { formatDay, formatDistance, sameDay, type DistanceUnit } from './format';
import { RouteFields } from './route/RouteFields';
import { checkTripForm, EMPTY_ROUTE, type RouteFormState, type TripFormResult, type TripFormValues } from './tripFormCheck';

export type { TripFormResult, TripFormValues, TripInputMode } from './tripFormCheck';

/** A → B option (Q25): shown + usable (Pro), shown with a lock (free → S-19), or hidden (no service key in this build). */
export type RouteOption = 'available' | 'locked' | 'hidden';

/**
 * S-08 Add / edit trip screen (`header` from the route). `gpsOnly` (editing a GPS trip): only distance, scope and
 * purpose can change. Calls `onSubmit` after the long-trip question (> 1,000 mi) is answered. The submit button sits in
 * the bottom bar, above the keyboard while typing (B-36). `children`: route overlays (e.g. the delete dialog).
 */
export function TripForm({
  header,
  initial,
  unit,
  gpsOnly,
  submitLabel,
  onSubmit,
  extra,
  children,
  route = 'hidden',
  region = 'UK',
  onRouteLocked,
  hint,
  top,
  bottomExtra,
}: {
  header: React.ReactNode;
  initial: TripFormValues;
  unit: DistanceUnit;
  gpsOnly?: boolean;
  submitLabel: string;
  onSubmit: (r: TripFormResult) => void;
  extra?: React.ReactNode;
  children?: React.ReactNode;
  route?: RouteOption;
  region?: Region;
  onRouteLocked?: () => void;
  /** Small line at the top, e.g. "Estimated from the gap between two trips" (Q26 / Q27 prefill). */
  hint?: string;
  /** Above the mode switch, e.g. the Regular trips chips (Q31). */
  top?: React.ReactNode;
  /** Above the Save button in the bottom bar, e.g. <ParkingKeyBar> while Parking & tolls is typed (Q28). */
  bottomExtra?: React.ReactNode;
}) {
  const { colors, dark } = useTheme();
  const [v, setV] = useState<TripFormValues>(initial);
  const [touched, setTouched] = useState(false);
  const [longAsk, setLongAsk] = useState<TripFormResult | null>(null);
  const [iosDate, setIosDate] = useState(false);
  const [today] = useState(() => Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const set = (patch: Partial<TripFormValues>) => setV((x) => ({ ...x, ...patch }));
  const setRoute = (fn: (r: RouteFormState) => RouteFormState) => setV((x) => ({ ...x, route: fn(x.route ?? EMPTY_ROUTE) }));
  const check = checkTripForm(v, unit);
  const error = !check.ok ? (check.error ?? (touched ? t('trip.enterDistance') : null)) : null;

  const submit = () => {
    setTouched(true);
    if (!check.ok) return;
    const r: TripFormResult = {
      date: v.date,
      scope: v.scope,
      purpose: v.purpose,
      miles: check.miles,
      ...(check.odo && unit === 'mi' ? { odoStart: check.odo.start, odoEnd: check.odo.end } : {}),
      // A → B ends; null clears them when the trip is now entered another way; undefined (option hidden) keeps them.
      ...(check.route ? { route: check.route } : route !== 'hidden' ? { route: null } : {}),
    };
    if (check.miles > LONG_TRIP_MILES) setLongAsk(r);
    else onSubmit(r);
  };

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: new Date(v.date),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (e, d) => {
          if (e.type === 'set' && d) set({ date: keepTime(v.date, d) });
        },
      });
    } else setIosDate(true);
  };

  const dateLabel = sameDay(v.date, today) ? t('trip.today', { date: formatDay(v.date) }) : formatDay(v.date);
  const unitField = unit === 'km' ? t('trip.kmField') : t('trip.milesField');

  return (
    <Screen header={header} avoidKeyboard bottomInset bottom={
        <View style={{ flex: 1, gap: 10 }}>
          {bottomExtra}
          <Button label={submitLabel} full onPress={submit} />
        </View>
      }>
      <View style={{ gap: 16 }}>
      {top}
      {hint ? (
        <Txt v="small" c="textSecondary" style={{ fontFamily: fonts.semibold }}>
          {hint}
        </Txt>
      ) : null}
      {!gpsOnly ? (
        <Segmented
          accessibilityLabel={t('trip.addTitle')}
          value={v.mode}
          onChange={(mode) => {
            if (mode === 'route' && route === 'locked' && v.mode !== 'route') {
              onRouteLocked?.();
              return;
            }
            setNotice(null);
            set({ mode });
          }}
          options={[
            { value: 'odometer', label: t('trip.odometer') },
            { value: 'distance', label: t('trip.distance') },
            ...(route !== 'hidden' || v.mode === 'route'
              ? [{ value: 'route' as const, label: route === 'locked' && v.mode !== 'route' ? `${t('autoTrip.route.mode')} · PRO` : t('autoTrip.route.mode') }]
              : []),
          ]}
        />
      ) : null}

      {notice ? (
        <Card variant="warn" style={{ paddingVertical: 12 }}>
          <Txt v="body" style={{ fontFamily: fonts.semibold }} accessibilityLiveRegion="polite">
            {notice}
          </Txt>
        </Card>
      ) : null}

      {v.mode === 'route' && !gpsOnly ? (
        <RouteFields
          value={v.route ?? EMPTY_ROUTE}
          setRoute={setRoute}
          region={region}
          unit={unit}
          error={check.ok ? null : check.error}
          onOffline={() => {
            setNotice(t('autoTrip.route.offline'));
            set({ mode: 'distance' });
          }}
        />
      ) : null}

      {v.mode === 'odometer' && !gpsOnly ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t('trip.startReading')}
                value={v.start}
                onChangeText={(start) => set({ start })}
                keyboardType="decimal-pad"
                style={{ fontFamily: fonts.bold }}
                placeholder="e.g. 48,210"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t('trip.endReading')}
                value={v.end}
                onChangeText={(end) => set({ end })}
                keyboardType="decimal-pad"
                style={{ fontFamily: fonts.bold }}
                placeholder="e.g. 48,338"
                error={error}
              />
            </View>
          </View>
          <Card style={{ backgroundColor: colors.surfaceAlt, borderWidth: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt v="body" c="textSecondary" style={{ fontFamily: fonts.bold }}>
              {t('trip.distanceLabel')}
            </Txt>
            <Txt v="amount" size={26} accessibilityLiveRegion="polite">
              {check.ok ? t('trip.distanceValue', { distance: formatDistance(check.miles * 1609.344, unit, check.miles >= 100 ? 0 : 1) }) : '—'}
            </Txt>
          </Card>
        </>
      ) : v.mode === 'route' && !gpsOnly ? null : (
        <Field
          label={unitField}
          value={v.distance}
          onChangeText={(distance) => set({ distance })}
          keyboardType="decimal-pad"
          style={{ fontFamily: fonts.bold }}
          error={error}
          right={
            <Txt v="small" c="textSecondary">
              {unit}
            </Txt>
          }
        />
      )}

      {!gpsOnly ? (
        <View style={{ gap: 6 }}>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {t('trip.date')}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('trip.date')}: ${dateLabel}`}
            onPress={pickDate}
            style={({ pressed }) => [styles.inp, { backgroundColor: colors.surface, borderColor: colors.lineStrong, opacity: pressed ? 0.8 : 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Calendar size={22} color={colors.textSecondary} strokeWidth={2} />
              <Txt v="body" size={17}>
                {dateLabel}
              </Txt>
            </View>
            <ChevronDown size={18} color={colors.textTertiary} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {t('trip.scope')}
        </Txt>
        <Segmented<TripScope>
          accessibilityLabel={t('trip.scope')}
          value={v.scope}
          onChange={(scope) => set({ scope })}
          options={[
            { value: 'work', label: t('common.work'), icon: Briefcase },
            { value: 'personal', label: t('common.personal') },
          ]}
        />
      </View>

      <Field label={t('trip.purpose')} value={v.purpose} onChangeText={(purpose) => set({ purpose })} placeholder={t('trip.purposePlaceholder')} maxLength={120} />

      {extra}

      <Dialog
        visible={longAsk !== null}
        title={longAsk ? t('trip.longTripTitle', { distance: formatDistance(longAsk.miles * 1609.344, unit, 0) }) : ''}
        body={t('trip.longTripBody')}
        onClose={() => setLongAsk(null)}
        actions={[
          { label: t('common.cancel'), onPress: () => setLongAsk(null) },
          {
            label: t('trip.saveAnyway'),
            variant: 'primary',
            onPress: () => {
              const r = longAsk;
              setLongAsk(null);
              if (r) onSubmit(r);
            },
          },
        ]}
      />

      {Platform.OS === 'ios' ? (
        <Sheet visible={iosDate} onClose={() => setIosDate(false)} title={t('trip.date')} scroll={false}>
          <DateTimePicker
            value={new Date(v.date)}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            themeVariant={dark ? 'dark' : 'light'}
            accentColor={colors.primary}
            onChange={(_, d) => d && set({ date: keepTime(v.date, d) })}
          />
          <Button label={t('common.done')} full onPress={() => setIosDate(false)} />
        </Sheet>
      ) : null}
      </View>
      {children}
    </Screen>
  );
}

/** New day, same time of day (keeps manual trips ordered sensibly within a day). */
function keepTime(prev: number, day: Date): number {
  const p = new Date(prev);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), p.getHours(), p.getMinutes()).getTime();
}

const styles = StyleSheet.create({
  inp: {
    minHeight: 56,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
