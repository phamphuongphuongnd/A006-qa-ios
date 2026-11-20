import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Dimensions, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * B-153 (Android): how far a `KeyboardAvoidingView` ('height') still reaches under the keyboard, for it to pad.
 *
 * React Native puts the keyboard's top at the window's visible-frame bottom. On some phones (Galaxy A13, Android 14,
 * edge-to-edge) that frame doesn't follow the keyboard, so the view shrank ~460 of ~990 px and the last fields and
 * buttons stayed under it — no scrolling could bring them up. The keyboard's top is also the screen height less the
 * keyboard and the navigation bar under it: take the higher of the two, and return what of the view is still below.
 * 0 where the view already ends at the keyboard (and on iOS).
 *
 * Render `marker` inside the keyboard-avoiding view (it measures the view's box) and add the gap to its
 * `paddingBottom`.
 */
export function useKeyboardGap(enabled = true): { gap: number; marker: ReactNode } {
  const [gap, setGap] = useState(0);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const navBar = useSafeAreaInsets().bottom;
  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      clearTimeout(timer);
      const { screenY, height } = e.endCoordinates;
      const top = Math.min(screenY, Dimensions.get('screen').height - height - navBar);
      // Once the view has shrunk for the keyboard (its own listener runs on the same event).
      timer = setTimeout(() => {
        ref.current?.measureInWindow((_x, y, _w, h) => {
          if (h > 0) setGap(Math.max(0, Math.round(y + h - top)));
        });
      }, 150);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      clearTimeout(timer);
      setGap(0);
    });
    return () => {
      clearTimeout(timer);
      show.remove();
      hide.remove();
    };
  }, [enabled, navBar]);
  const marker =
    Platform.OS === 'android' && enabled ? (
      // Fills the view's box whatever its padding: its bottom is the view's bottom.
      <View ref={ref} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill} />
    ) : null;
  return { gap, marker };
}
