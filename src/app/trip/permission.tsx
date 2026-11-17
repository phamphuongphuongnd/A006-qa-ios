import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { ChevronLeft, Lock, X } from '@/ui/icons';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { isApproximate } from '@/features/trips/controller';
import { markBackgroundStepShown } from '@/features/trips/permissionState';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';
import { Button, Card, Screen, Tag, Txt } from '@/ui';

/**
 * S-07a Location explainer. Step 1 before the system prompt; step 2 (Android) explains "Allow all the time".
 * `?next=start` continues to the Active trip screen with `start=1` when done.
 */
export default function PermissionScreen() {
  const { next, step: stepParam } = useLocalSearchParams<{ next?: string; step?: string }>();
  const [step, setStep] = useState<1 | 2 | 'precise'>(stepParam === '2' ? 2 : stepParam === 'precise' ? 'precise' : 1);
  const [busy, setBusy] = useState(false);
  // The buttons end the scrolling content: keep "Not now" clear of the system navigation bar (B-28).
  const bottomPad = { paddingBottom: useSafeAreaInsets().bottom + 20 };

  useEffect(() => {
    if (step === 2) markBackgroundStepShown();
  }, [step]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));
  const proceed = () => {
    if (next === 'start') router.replace('/trip/active?start=1');
    else close();
  };

  const allow = async () => {
    setBusy(true);
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (!fg.granted) {
        if (!fg.canAskAgain) await Linking.openSettings();
        else close();
        return;
      }
      if (isApproximate(fg)) {
        setStep('precise');
        return;
      }
      await afterForeground();
    } finally {
      setBusy(false);
    }
  };

  /** Foreground (precise) granted: Android asks for "all the time" once, iOS later by itself. */
  const afterForeground = async () => {
    if (Platform.OS === 'android') {
      const bg = await Location.getBackgroundPermissionsAsync();
      if (!bg.granted) {
        setStep(2);
        return;
      }
    } else {
      // iOS shows its own "Change to Always Allow" prompt later; recording works with "While Using" + indicator.
      Location.requestBackgroundPermissionsAsync().catch(() => {});
    }
    proceed();
  };

  // MOD-1: approximate only → Android shows its "Change to precise" dialog when asked again; otherwise (and on iOS)
  // only the app's settings page can switch "Precise" on.
  const allowPrecise = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'android') {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.granted && !isApproximate(fg)) {
          await afterForeground();
          return;
        }
      }
      await Linking.openSettings();
    } finally {
      setBusy(false);
    }
  };

  const openSettings = async () => {
    setBusy(true);
    try {
      // Android 11+: opens the app's location permission page; resolves when the user comes back.
      await Location.requestBackgroundPermissionsAsync().catch(() => Linking.openSettings());
      proceed();
    } finally {
      setBusy(false);
    }
  };

  if (step === 'precise') {
    return (
      <Screen header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} />} contentStyle={[{ gap: 20, flexGrow: 1 }, bottomPad]}>
        <Txt v="h1" accessibilityRole="header">
          {t('trip.preciseTitle')}
        </Txt>
        <Txt v="body" c="textSecondary" size={17} style={{ lineHeight: 26 }}>
          {t('trip.preciseBody')}
        </Txt>
        <Bottom primary={t('trip.preciseAllow')} onPrimary={allowPrecise} onSecondary={close} busy={busy} />
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen
        header={
          <ModalHeader
            icon={ChevronLeft}
            iconLabel={t('trip.back')}
            onIcon={() => setStep(1)}
            center={
              <Txt v="small" c="textSecondary" style={{ fontFamily: fonts.bold }}>
                {t('trip.step2')}
              </Txt>
            }
          />
        }
        contentStyle={[{ gap: 20, flexGrow: 1 }, bottomPad]}>
        <Txt v="h1" accessibilityRole="header">
          {t('trip.alwaysTitle')}
        </Txt>
        <Txt v="body" c="textSecondary" size={17} style={{ lineHeight: 26 }}>
          {t('miles.permAlways')}
        </Txt>
        <AndroidOptions />
        <Txt v="small" c="textSecondary">
          {t('trip.alwaysNotice')}
        </Txt>
        <Bottom primary={t('common.openSettings')} onPrimary={openSettings} onSecondary={proceed} busy={busy} />
      </Screen>
    );
  }

  return (
    <Screen header={<ModalHeader icon={X} iconLabel={t('trip.close')} onIcon={close} />} contentStyle={[{ gap: 20, flexGrow: 1 }, bottomPad]}>
      <RouteArt />
      <Txt v="h1" accessibilityRole="header">
        {t('miles.permTitle')}
      </Txt>
      <Txt v="body" c="textSecondary" size={17} style={{ lineHeight: 26 }}>
        {t('miles.permBody')}
      </Txt>
      <StaysOnPhone />
      <Bottom primary={t('miles.permAllow')} onPrimary={allow} onSecondary={close} busy={busy} />
    </Screen>
  );
}

function Bottom({ primary, onPrimary, onSecondary, busy }: { primary: string; onPrimary: () => void; onSecondary: () => void; busy: boolean }) {
  return (
    <View style={{ gap: 4, marginTop: 'auto', paddingTop: 12 }}>
      <Button label={primary} full onPress={onPrimary} loading={busy} />
      <Button label={t('common.notNow')} variant="text" full onPress={onSecondary} disabled={busy} />
    </View>
  );
}

function StaysOnPhone() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.incomeSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={18} color={colors.incomeText} strokeWidth={2.2} />
      </View>
      <Txt v="body" style={{ fontFamily: fonts.bold, flex: 1 }}>
        {t('miles.permStays')}
      </Txt>
    </View>
  );
}

function RouteArt() {
  const { colors, dark } = useTheme();
  const [w, setW] = useState(0);
  return (
    <Card
      style={{ height: 220, padding: 0, overflow: 'hidden', backgroundColor: colors.surfaceAlt, borderWidth: 0 }}
      accessibilityLabel="">
      <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} importantForAccessibility="no-hide-descendants">
        {w > 0 ? (
          <Svg width={w} height={220} viewBox="0 0 350 220" preserveAspectRatio="xMidYMid slice">
            <Path d="M40 180c40-20 50-90 110-80s60-50 100-60 40 10 60 0" fill="none" stroke={dark ? colors.text : '#1F2A44'} strokeLinecap="round" strokeWidth={5} />
            <Circle cx={40} cy={180} r={10} fill="#1E8E5A" stroke="#FFFFFF" strokeWidth={4} />
            <Circle cx={310} cy={40} r={12} fill="#F5B841" stroke="#1F2A44" strokeWidth={4} />
            <Rect x={118} y={120} width={112} height={40} rx={20} fill={colors.surface} />
            <SvgText x={174} y={146} fill={colors.text} fontSize={17} fontWeight="800" textAnchor="middle" fontFamily={fonts.extrabold}>
              42.3 mi
            </SvgText>
          </Svg>
        ) : null}
      </View>
    </Card>
  );
}

function AndroidOptions() {
  const { colors } = useTheme();
  const radio = (on: boolean) => (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: on ? 7 : 2,
        borderColor: on ? colors.primary : colors.lineStrong,
      }}
    />
  );
  const rows: [string, boolean][] = [
    [t('trip.alwaysOption'), true],
    [t('trip.whileUsing'), false],
    [t('trip.askEvery'), false],
    [t('trip.dontAllow'), false],
  ];
  return (
    <Card style={{ backgroundColor: colors.surfaceAlt, borderWidth: 0, paddingVertical: 8, paddingHorizontal: 16, gap: 0 }}>
      <Txt v="caption" c="textTertiary" style={{ paddingVertical: 8, fontFamily: fonts.bold }}>
        {t('trip.alwaysSettingsPath')}
      </Txt>
      {rows.map(([label, on]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
          {radio(on)}
          <Txt v="body" c={on ? 'text' : 'textSecondary'} style={on ? { fontFamily: fonts.bold, flex: 1 } : { flex: 1 }}>
            {label}
          </Txt>
          {on ? <Tag kind="unsorted" label={t('trip.alwaysChoose')} /> : null}
        </View>
      ))}
    </Card>
  );
}

