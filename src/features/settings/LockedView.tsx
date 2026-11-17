import * as LocalAuthentication from 'expo-local-authentication';
import { Lock, ScanFace } from '@/ui/icons';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { t } from '@/i18n';
import { GUTTER, useTheme } from '@/theme';
import { Button, Txt } from '@/ui';

import { resetLockSuspended, withLockSuspended } from './lockState';

/** True when the phone has a fingerprint/face or at least a PIN/passcode to unlock with. */
export async function deviceCanLock(): Promise<boolean> {
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) > LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** Biometrics with the phone's PIN / passcode as fallback. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  const res = await withLockSuspended(() =>
    LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false, cancelLabel: t('settings.cancel') }),
  );
  return res.success;
}

/** App logo from the mockup (navy tile, sun, receipt). */
export function AppLogo({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Sunday Sort">
      <Rect width={120} height={120} rx={28} fill="#1F2A44" />
      <Circle cx={84} cy={38} r={17} fill="#F5B841" />
      <Path d="M30 24h44v70l-7.3-5.5-7.4 5.5-7.3-5.5-7.4 5.5-7.3-5.5-7.3 5.5z" fill="#FAF8F4" />
      <Path d="M39 40h26M39 52h26M39 64h14" stroke="#1F2A44" strokeLinecap="round" strokeWidth={4.5} />
    </Svg>
  );
}

/**
 * S-13 Locked. Prompts on show and whenever the app comes back to the foreground. If the phone no longer has any
 * screen lock, the app can't be locked any more, so it opens.
 */
export function LockedView({ onUnlock }: { onUnlock: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const busy = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!(await deviceCanLock())) {
        onUnlock();
        return;
      }
      if (await authenticate(t('lock.prompt'))) onUnlock();
    } finally {
      busy.current = false;
    }
  }, [onUnlock]);

  /**
   * B-53: "Unlock" pressed means no prompt is on screen. If an earlier prompt is still "pending" (the system dropped it
   * when a trip-toggle / NFC intent arrived), cancel it and ask again instead of ignoring the tap.
   */
  const onUnlockPress = useCallback(async () => {
    if (busy.current) {
      await LocalAuthentication.cancelAuthenticate().catch(() => {});
      resetLockSuspended();
      busy.current = false;
    }
    await tryUnlock();
  }, [tryUnlock]);

  useEffect(() => {
    tryUnlock();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tryUnlock();
    });
    return () => sub.remove();
  }, [tryUnlock]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
        <AppLogo />
        <Txt v="h1" center accessibilityRole="header">
          {t('lock.locked')}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Lock size={18} color={colors.textSecondary} />
          <Txt v="small" c="textSecondary">
            {t('lock.private')}
          </Txt>
        </View>
      </View>
      <View style={{ paddingHorizontal: GUTTER }}>
        <Button label={t('lock.unlock')} icon={ScanFace} full onPress={onUnlockPress} />
      </View>
    </View>
  );
}
