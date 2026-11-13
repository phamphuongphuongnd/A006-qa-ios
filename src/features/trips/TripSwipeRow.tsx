import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import type { Scope } from '@/domain/types';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';
import { Truck, User } from '@/ui/icons';

/** Row travel (dp) past which letting go marks the trip. */
const COMMIT_DX = 96;

/**
 * S-07 Miles row (F-13): swipe right = Work (blue behind), swipe left = Personal (violet behind); letting go past
 * COMMIT_DX marks it, the row springs back. Plain PanResponder + native-driven Animated (cheap per row, as SwipeRow).
 * Screen readers get the same two actions through `accessibilityActions`.
 */
export function TripSwipeRow({ children, onScope }: { children: ReactNode; onScope: (s: Scope) => void }) {
  const { colors } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const cb = useRef(onScope);
  useEffect(() => {
    cb.current = onScope;
  }, [onScope]);

  // Created once; its handlers read the ref only when a gesture fires, never during render (as SwipeRow).
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        x.setValue(g.dx);
        setDir(g.dx > 0 ? 1 : g.dx < 0 ? -1 : 0);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx > COMMIT_DX) cb.current('work');
        else if (g.dx < -COMMIT_DX) cb.current('personal');
        Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(() => setDir(0));
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(() => setDir(0));
      },
    }),
  );

  return (
    <View
      accessibilityActions={[
        { name: 'work', label: t('autoTrip.markedWork') },
        { name: 'personal', label: t('autoTrip.markedPersonal') },
      ]}
      onAccessibilityAction={(e) => onScope(e.nativeEvent.actionName === 'work' ? 'work' : 'personal')}>
      {dir !== 0 ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.behind,
            { backgroundColor: dir > 0 ? colors.workFill : colors.personalFill, justifyContent: dir > 0 ? 'flex-start' : 'flex-end' },
          ]}>
          {dir > 0 ? <Truck size={20} color="#FFFFFF" /> : <User size={20} color="#FFFFFF" />}
          <Text style={styles.label}>{dir > 0 ? t('common.work') : t('common.personal')}</Text>
        </View>
      ) : null}
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }], backgroundColor: colors.surface }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  behind: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 12 },
  label: { color: '#FFFFFF', fontSize: 16, fontFamily: fonts.bold },
});
