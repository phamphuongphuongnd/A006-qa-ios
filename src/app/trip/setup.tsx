import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { syncAutoDetection } from '@/features/trips/auto/runner';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { t, type TKey } from '@/i18n';
import { router } from '@/services/router';
import { useTheme } from '@/theme';
import { Button, Card, Txt } from '@/ui';
import { Battery, Bell, Car, MapPin, Shield, X, type LucideIcon } from '@/ui/icons';

const PACKAGE = 'com.phiotron.sundaysort';

interface Step {
  key: 's1' | 's2' | 's3' | 's4';
  icon: LucideIcon;
  perm: TKey;
  run: () => Promise<boolean>;
}

async function askMotion() {
  const r = await Location.requestMotionActivityPermissionsAsync().catch(() => null);
  return !!r?.granted;
}

async function askBackgroundLocation() {
  const fg = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!fg?.granted) return false;
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  if (bg?.granted) return true;
  // Android 11+ only grants "all the time" from the settings page.
  await Linking.openSettings();
  return false;
}

async function askNotifications() {
  const r = await Notifications.requestPermissionsAsync().catch(() => null);
  return !!r?.granted;
}

async function openBatterySettings() {
  try {
    await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DETAILS_SETTINGS', { data: `package:${PACKAGE}` });
  } catch {
    await Linking.openSettings();
  }
  return true;
}

const STEPS: Step[] = [
  { key: 's1', icon: Car, perm: Platform.OS === 'ios' ? 'autoTrip.s1PermIos' : 'autoTrip.s1PermAndroid', run: askMotion },
  { key: 's2', icon: MapPin, perm: 'autoTrip.s2Perm', run: askBackgroundLocation },
  { key: 's3', icon: Bell, perm: 'autoTrip.s3Perm', run: askNotifications },
  ...(Platform.OS === 'android' ? [{ key: 's4' as const, icon: Battery, perm: 'autoTrip.s4Perm' as TKey, run: openBatterySettings }] : []),
];

/** S-07e Automatic trips setup: one permission per step; skipping leaves S-07d orange ("may miss drives"). */
export default function AutoSetupScreen() {
  const { colors } = useTheme();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = STEPS[i];
  const Icon = step.icon;

  const finish = async () => {
    await syncAutoDetection();
    if (router.canGoBack()) router.back();
    else router.replace('/trip/auto');
  };
  const next = async () => {
    if (i < STEPS.length - 1) setI(i + 1);
    else await finish();
  };
  const onPrimary = async () => {
    setBusy(true);
    try {
      await step.run();
    } finally {
      setBusy(false);
    }
    await next();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={finish} title={t('autoTrip.setupTitle')} />
      <View style={{ flex: 1, padding: 24, gap: 16, alignItems: 'center' }}>
        <Txt v="label" c="textSecondary">
          {t('autoTrip.stepOf', { n: i + 1, total: STEPS.length })}
        </Txt>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
          <Icon size={56} color={colors.text} strokeWidth={1.6} />
        </View>
        <Txt v="h1" center accessibilityRole="header">
          {t(`autoTrip.${step.key}Title` as TKey)}
        </Txt>
        <Txt v="body" c="textSecondary" center>
          {t(`autoTrip.${step.key}Body` as TKey)}
        </Txt>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
          <Shield size={22} color={colors.textSecondary} />
          <Txt v="body" style={{ flex: 1 }}>
            {t('autoTrip.permission')} {t(step.perm)}
          </Txt>
        </Card>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {STEPS.map((s, k) => (
            <View key={s.key} style={{ width: k === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? colors.text : colors.lineStrong }} />
          ))}
        </View>
        <Button label={t(`autoTrip.${step.key}Btn` as TKey)} full disabled={busy} onPress={onPrimary} />
        <Button label={t('autoTrip.skip')} variant="text" full onPress={next} />
      </View>
    </View>
  );
}
