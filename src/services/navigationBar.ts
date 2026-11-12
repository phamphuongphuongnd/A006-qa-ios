import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * B-12: Android nav bar buttons/scrim follow the in-app theme (dark app on a light phone kept a white bar).
 * The declarative <NavigationBar> did not change the window on a Galaxy A13, so set it imperatively on every theme
 * change and whenever the app comes back to the foreground; failures are logged (logcat tag ReactNativeJS).
 */
// The library's NavigationBar.setStyle caches the last style and skips the native call when it thinks nothing
// changed, so talk to the native module directly.
const native = requireOptionalNativeModule<{ setStyle(style: 'light' | 'dark'): Promise<void> }>('ExpoNavigationBar');

export function useNavigationBarStyle(dark: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const apply = () => {
      if (!native) {
        console.warn('[navbar] ExpoNavigationBar native module missing');
        return;
      }
      native.setStyle(dark ? 'light' : 'dark').catch((e: unknown) => console.warn('[navbar] setStyle failed', e));
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
