import { requireOptionalNativeModule } from 'expo';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

const native = requireOptionalNativeModule<{ setHideInRecents(hide: boolean): Promise<void> }>('SundaySystemBars');

/**
 * QA-100 OLD-5: with App lock on, the app switcher must not show the driver's numbers.
 * Android: the system snapshot is taken before JS can react, so the window opts out natively (modules/system-bars).
 * iOS: the snapshot is taken after `inactive`, so the caller covers the screen while this returns true.
 */
export function useHideInRecents(enabled: boolean): boolean {
  const [away, setAway] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || !native) return;
    const apply = () => native.setHideInRecents(enabled).catch((e: unknown) => console.warn('[recents] set failed', e));
    apply();
    // A recreated activity starts without the flag.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') apply();
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (s) => setAway(s !== 'active'));
    return () => sub.remove();
  }, []);

  return Platform.OS === 'ios' && enabled && away;
}
