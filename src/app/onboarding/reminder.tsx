import { Bell, ChevronDown, Clock } from '@/ui/icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppIconMini } from '@/features/entries/art';
import { useDateTimePicker } from '@/features/entries/DateTimePick';
import { OnboardingPage } from '@/features/entries/OnboardingTop';
import { requestNotifications } from '@/features/settings/notifications';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Button, Txt, useSnackbar } from '@/ui';

/** Mon…Sun chips; values use the JS weekday convention of settings.reminder (0 = Sunday). */
const DAYS: { label: string; weekday: number }[] = [
  { label: 'Mon', weekday: 1 },
  { label: 'Tue', weekday: 2 },
  { label: 'Wed', weekday: 3 },
  { label: 'Thu', weekday: 4 },
  { label: 'Fri', weekday: 5 },
  { label: 'Sat', weekday: 6 },
  { label: 'Sun', weekday: 0 },
];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * S-01d Weekly reminder. Saves day/time to settings.reminder and asks for notification permission;
 * the reminder itself is scheduled by the data services from these settings.
 */
export default function ReminderStep() {
  const { colors } = useTheme();
  const { settings, update } = useSettings();
  const snack = useSnackbar();
  const picker = useDateTimePicker();
  const [weekday, setWeekday] = useState(settings.reminder.weekday);
  const [hour, setHour] = useState(settings.reminder.hour);
  const [minute, setMinute] = useState(settings.reminder.minute);
  const [busy, setBusy] = useState(false);
  const time = `${pad(hour)}:${pad(minute)}`;
  const dayLabel = DAYS.find((d) => d.weekday === weekday)?.label ?? 'Sun';

  const finish = (on: boolean) => update({ onboarded: true, reminder: { on, weekday, hour, minute } });

  const turnOn = async () => {
    setBusy(true);
    let granted = false;
    try {
      // Creates the Android channel first: Android 13+ only shows the prompt once a channel exists.
      granted = await requestNotifications();
    } catch {
      granted = false;
    }
    setBusy(false);
    finish(granted);
    if (!granted) snack({ message: t('onboarding.reminderDenied') });
  };

  const openTime = () => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    picker.open({
      value: d,
      mode: 'time',
      title: t('onboarding.reminderTime'),
      onPick: (v) => {
        setHour(v.getHours());
        setMinute(v.getMinutes());
      },
    });
  };

  return (
    <OnboardingPage
      step={6}
      bottom={
        <>
          <Button label={t('onboarding.reminderOn')} icon={Bell} full loading={busy} onPress={turnOn} />
          <Button label={t('common.notNow')} variant="text" full onPress={() => finish(false)} />
        </>
      }>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 20, gap: 18 }}>
        <Txt v="h1" accessibilityRole="header">
          {t('onboarding.reminderTitle')}
        </Txt>
        <View style={{ gap: 6 }}>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {t('onboarding.reminderDay')}
          </Txt>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 5, justifyContent: 'space-between' }}>
            {DAYS.map((d) => {
              const on = d.weekday === weekday;
              return (
                <Pressable
                  key={d.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setWeekday(d.weekday)}
                  style={{
                    flex: 1,
                    maxWidth: 48,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? colors.primary : colors.surface,
                    borderWidth: on ? 0 : 1.5,
                    borderColor: colors.lineStrong,
                  }}>
                  <Txt maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontFamily: fonts.semibold, color: on ? colors.onPrimary : colors.text }}>
                    {d.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
            {t('onboarding.reminderTime')}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('onboarding.reminderTime')}, ${time}`}
            onPress={openTime}
            style={{
              minHeight: 56,
              borderRadius: radius.input,
              borderWidth: 1.5,
              borderColor: colors.lineStrong,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
            <Clock size={24} color={colors.textSecondary} />
            <Txt style={{ flex: 1, fontSize: 22, lineHeight: 28, fontFamily: fonts.extrabold }}>{time}</Txt>
            <ChevronDown size={24} color={colors.textTertiary} />
          </Pressable>
        </View>
        <Txt v="label" c="textTertiary" style={{ marginTop: 6 }}>
          {t('onboarding.reminderPreview')}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
          <AppIconMini />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Txt v="small" style={{ fontFamily: fonts.bold, flexShrink: 1 }}>
                {t('onboarding.reminderPreviewTitle')}
              </Txt>
              <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.regular }}>{`${dayLabel} ${time}`}</Txt>
            </View>
            <Txt v="small" c="textSecondary">
              {t('onboarding.reminderPreviewBody')}
            </Txt>
          </View>
        </View>
        <Txt v="small" c="textTertiary">
          {t('onboarding.reminderOnlyWhen')}
        </Txt>
      </ScrollView>
      {picker.element}
    </OnboardingPage>
  );
}
