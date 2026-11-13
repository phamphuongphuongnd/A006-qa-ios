import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppSettings } from '@/db/settingsRepo';
import { notificationsAllowed, requestNotifications } from '@/features/settings/notifications';
import { daysLabel, nudgeDays, timeLabel, WEEKDAYS, WEEKDAYS_SHORT } from '@/features/settings/reminder';
import { GroupLabel, NavHeader, OptionSheet } from '@/features/settings/ui';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Chip, ChipRow, Group, SettingRow, Sheet, Toggle, Txt, useSnackbar } from '@/ui';

type TimeTarget = 'sunday' | 'daily' | null;
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/** S-20 Notifications (F-17): one switch per kind + the two reminder times. Replaces the reminder rows in Settings. */
export default function NotificationsScreen() {
  'use no memo';
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings, update } = useSettings();
  const [dayPicker, setDayPicker] = useState(false);
  const [iosTime, setIosTime] = useState<TimeTarget>(null);
  const r = settings.reminder;
  const n = settings.dailyNudge;
  const notify = settings.notify;
  const workDays = settings.workHours.on && settings.workHours.days.length > 0;

  /** Turning a reminder on asks for permission first (once). */
  const allow = async () => {
    if (await requestNotifications()) return true;
    snack({ message: t('backupAuto.notify.blocked'), above: 'none' });
    return false;
  };

  const setSunday = async (on: boolean) => {
    if (on && !(await allow())) return;
    update({ reminder: { ...r, on } });
  };
  const setDaily = async (on: boolean) => {
    if (on && !(await allow())) return;
    update({ dailyNudge: { ...n, on } });
  };
  const setNotify = async (key: keyof AppSettings['notify'], on: boolean) => {
    if (on && !(await notificationsAllowed()) && !(await allow())) return;
    update({ notify: { ...notify, [key]: on } });
  };

  const setTime = (target: Exclude<TimeTarget, null>, d: Date) => {
    if (target === 'sunday') update({ reminder: { ...r, hour: d.getHours(), minute: d.getMinutes() } });
    else update({ dailyNudge: { ...n, hour: d.getHours(), minute: d.getMinutes() } });
  };
  const timeOf = (target: Exclude<TimeTarget, null>) =>
    target === 'sunday' ? new Date(2026, 0, 4, r.hour, r.minute) : new Date(2026, 0, 4, n.hour, n.minute);
  const openTime = (target: Exclude<TimeTarget, null>) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: timeOf(target), mode: 'time', is24Hour: true, onValueChange: (_, d) => setTime(target, d) });
    } else setIosTime(target);
  };

  const toggleDay = (d: number) => {
    const days = n.days.includes(d) ? n.days.filter((x) => x !== d) : [...n.days, d];
    if (days.length > 0) update({ dailyNudge: { ...n, days } });
  };

  const nudgeTime = timeLabel(n.hour, n.minute);
  const dailySub = workDays
    ? t('backupAuto.notify.dailySubWork', { time: nudgeTime })
    : t('backupAuto.notify.dailySub', { time: nudgeTime, days: daysLabel(nudgeDays(n, settings.workHours)) });

  const sw = (value: boolean, onChange: (v: boolean) => void, label: string) => <Toggle value={value} onChange={onChange} label={label} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('backupAuto.notify.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 8, paddingBottom: insets.bottom + 32 }}>
        <Group>
          <View>
            <SettingRow
              title={t('backupAuto.notify.sunday')}
              subtitle={t('backupAuto.notify.sundaySub')}
              right={sw(r.on, setSunday, t('backupAuto.notify.sunday'))}
            />
            {r.on ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12, marginTop: -4 }}>
                <ChipRow>
                  <Chip size="s" label={WEEKDAYS_SHORT[r.weekday]} onPress={() => setDayPicker(true)} accessibilityLabel={`${t('backupAuto.notify.day')}, ${WEEKDAYS[r.weekday]}`} />
                  <Chip size="s" label={timeLabel(r.hour, r.minute)} onPress={() => openTime('sunday')} accessibilityLabel={`${t('backupAuto.notify.time')}, ${timeLabel(r.hour, r.minute)}`} />
                </ChipRow>
              </View>
            ) : null}
          </View>
          <View>
            <SettingRow title={t('backupAuto.notify.daily')} subtitle={dailySub} right={sw(n.on, setDaily, t('backupAuto.notify.daily'))} />
            {n.on ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12, marginTop: -4, gap: 8 }}>
                <ChipRow>
                  <Chip size="s" label={nudgeTime} onPress={() => openTime('daily')} accessibilityLabel={`${t('backupAuto.notify.time')}, ${nudgeTime}`} />
                </ChipRow>
                {!workDays ? (
                  <ChipRow>
                    {MONDAY_FIRST.map((d) => (
                      <Chip
                        key={d}
                        size="s"
                        label={WEEKDAYS_SHORT[d]}
                        state={n.days.includes(d) ? 'on' : 'default'}
                        onPress={() => toggleDay(d)}
                        accessibilityLabel={WEEKDAYS[d]}
                      />
                    ))}
                  </ChipRow>
                ) : null}
              </View>
            ) : null}
          </View>
        </Group>

        <GroupLabel>{t('backupAuto.notify.trips')}</GroupLabel>
        <Group>
          <SettingRow
            title={t('backupAuto.notify.tripAuto')}
            subtitle={Platform.OS === 'android' ? t('backupAuto.notify.tripAutoSub') : t('backupAuto.notify.tripAutoSubIos')}
            right={sw(notify.tripAuto, (v) => setNotify('tripAuto', v), t('backupAuto.notify.tripAuto'))}
          />
          <SettingRow
            title={t('backupAuto.notify.missed')}
            subtitle={t('backupAuto.notify.missedSub')}
            right={sw(notify.missedTrip, (v) => setNotify('missedTrip', v), t('backupAuto.notify.missed'))}
          />
        </Group>

        <GroupLabel>{t('backupAuto.notify.account')}</GroupLabel>
        <Group>
          <SettingRow
            title={t('backupAuto.notify.proRenewal')}
            subtitle={t('backupAuto.notify.proRenewalSub')}
            right={sw(notify.proRenewal, (v) => setNotify('proRenewal', v), t('backupAuto.notify.proRenewal'))}
          />
          <SettingRow
            title={t('backupAuto.notify.trialEnding')}
            subtitle={t('backupAuto.notify.trialEndingSub')}
            right={sw(notify.trialEnding, (v) => setNotify('trialEnding', v), t('backupAuto.notify.trialEnding'))}
          />
          <SettingRow
            title={t('backupAuto.notify.backupTap')}
            subtitle={t('backupAuto.notify.backupTapSub')}
            right={sw(notify.backupTap !== false, (v) => setNotify('backupTap', v), t('backupAuto.notify.backupTap'))}
          />
        </Group>

        <Txt v="small" c="textSecondary" style={{ paddingHorizontal: 4, paddingTop: 8, fontFamily: fonts.medium }}>
          {t('backupAuto.notify.noSales')}
        </Txt>
      </ScrollView>

      <OptionSheet<number>
        visible={dayPicker}
        title={t('backupAuto.notify.day')}
        options={MONDAY_FIRST.map((d) => ({ value: d, label: WEEKDAYS[d] }))}
        value={r.weekday}
        onPick={(weekday) => update({ reminder: { ...r, weekday } })}
        onClose={() => setDayPicker(false)}
      />
      {Platform.OS === 'ios' ? (
        <Sheet
          visible={iosTime !== null}
          onClose={() => setIosTime(null)}
          title={t('backupAuto.notify.time')}
          footer={<Button label={t('common.done')} full onPress={() => setIosTime(null)} />}>
          {iosTime ? (
            <DateTimePicker
              value={timeOf(iosTime)}
              mode="time"
              display="spinner"
              themeVariant={dark ? 'dark' : 'light'}
              onValueChange={(_, d) => setTime(iosTime, d)}
            />
          ) : null}
        </Sheet>
      ) : null}
    </View>
  );
}
