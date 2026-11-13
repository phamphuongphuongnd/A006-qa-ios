import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Scope } from '@/domain/types';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';
import { Briefcase, Trash2, User } from '@/ui/icons';

const ACTION_W = 96;
/** Finger travel per pixel of row travel (the old Swipeable's `friction`). */
const FRICTION = 1.5;

type Side = 'left' | 'right' | null;

/**
 * S-04 row swipe: dragging right reveals "Personal" / "Work" (the opposite of the current scope), dragging left
 * reveals "Delete". Tapping the revealed action runs it; disabled while multi-selecting.
 *
 * Built on PanResponder + a native-driven Animated.Value instead of gesture-handler's ReanimatedSwipeable: that one
 * registers gestures and animated styles on the UI runtime per row, which was half the Entries list's mount time
 * on a Galaxy A13. The action buttons are only rendered while the row is being swiped / open.
 */
export function SwipeRow({
  children,
  scope,
  enabled = true,
  resetKey,
  onDelete,
  onToggleScope,
}: {
  children: ReactNode;
  scope: Scope;
  enabled?: boolean;
  /** Recycled list cells: a new key snaps the row shut so another entry never shows up half-swiped. */
  resetKey?: string;
  onDelete: () => void;
  onToggleScope: () => void;
}) {
  const { colors } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState<{ key: string | undefined; side: Side }>({ key: resetKey, side: null });
  const side = revealed.key === resetKey ? revealed.side : null;
  const rest = useRef(0);
  const live = useRef({ enabled, resetKey });

  useEffect(() => {
    live.current = { enabled, resetKey };
  }, [enabled, resetKey]);
  useEffect(() => {
    x.stopAnimation();
    x.setValue(0);
    rest.current = 0;
  }, [resetKey, x]);

  // Created once; its handlers read the refs only when a gesture fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const reveal = (s: Side) => setRevealed((r) => (r.key === live.current.resetKey && r.side === s ? r : { key: live.current.resetKey, side: s }));
    const clamp = (v: number) => Math.max(-ACTION_W, Math.min(ACTION_W, v));
    const snapTo = (to: number) => {
      rest.current = to;
      Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 22 }).start(({ finished }) => {
        if (finished && to === 0) reveal(null);
      });
    };
    return {
      snapTo,
      handlers: PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => live.current.enabled && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => x.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const v = clamp(rest.current + g.dx / FRICTION);
          reveal(v > 0 ? 'left' : v < 0 ? 'right' : null);
          x.setValue(v);
        },
        onPanResponderRelease: (_, g) => {
          const v = clamp(rest.current + g.dx / FRICTION);
          snapTo(v > ACTION_W / 2 ? ACTION_W : v < -ACTION_W / 2 ? -ACTION_W : 0);
        },
        onPanResponderTerminate: () => snapTo(0),
      }).panHandlers,
    };
  });

  const to: Scope = scope === 'work' ? 'personal' : 'work';
  const run = (fn: () => void) => {
    pan.snapTo(0);
    fn();
  };
  return (
    <View style={styles.wrap}>
      {side === 'left' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => run(onToggleScope)}
          style={[styles.action, styles.left, { backgroundColor: to === 'personal' ? colors.personalSoft : colors.workSoft }]}>
          {to === 'personal' ? <User size={22} color={colors.personal} /> : <Briefcase size={22} color={colors.work} />}
          <Text style={[styles.label, { color: to === 'personal' ? colors.personal : colors.work }]}>
            {to === 'personal' ? t('common.personal') : t('common.work')}
          </Text>
        </Pressable>
      ) : side === 'right' ? (
        <Pressable accessibilityRole="button" onPress={() => run(onDelete)} style={[styles.action, styles.right, { backgroundColor: colors.error }]}>
          <Trash2 size={22} color={colors.onError} />
          <Text style={[styles.label, { color: colors.onError }]}>{t('entries.swipeDelete')}</Text>
        </Pressable>
      ) : null}
      {/* B-20: the animated transform is attached only while the row is swiped / open, so a resting row in a
          scrolling list carries no animated style (less work each time a recycled cell is reused). */}
      <Animated.View style={side === null ? undefined : { transform: [{ translateX: x }] }} {...pan.handlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  action: { position: 'absolute', top: 0, bottom: 0, width: ACTION_W, alignItems: 'center', justifyContent: 'center', gap: 4 },
  left: { left: 0 },
  right: { right: 0 },
  label: { fontSize: 13, fontFamily: fonts.bold },
});
