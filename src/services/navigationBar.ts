import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * B-12: Android nav bar buttons/scrim follow the in-app theme (dark app on a light phone kept a white bar).
 * expo-navigation-bar's setStyle only flips the legacy flag on Android 11–14, which the system ignores once the
 * window's appearance is "controlled", so use the local module `modules/system-bars` (platform
 * setSystemBarsAppearance). Re-applied on every theme change and whenever the app comes back to the foreground.
 */
const native = requireOptionalNativeModule<{ setNavigationBarLight(light: boolean): Promise<void> }>(
  'SundaySystemBars',
);

export function useNavigationBarStyle(dark: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'android' || !native) return;
    const apply = () => {
      native.setNavigationBarLight(!dark).catch((e: unknown) => console.warn('[navbar] set failed', e));
    };
    apply();
    // Activity recreation / returning from another app can reset the window's appearance.
    const id = setTimeout(apply, 300);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') apply();
    });
    return () => {
      clearTimeout(id);
      sub.remove();
    };
  }, [dark]);
}
