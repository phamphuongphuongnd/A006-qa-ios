import { Briefcase, Trash2, User } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Scope } from '@/domain/types';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';

/**
 * S-04 row swipe: left reveals "Delete", right reveals "Personal" / "Work" (the opposite of the current scope).
 * Tapping the revealed action runs it; disabled while multi-selecting.
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
  const ref = useRef<SwipeableMethods>(null);
  useEffect(() => {
    ref.current?.reset();
  }, [resetKey]);
  const to: Scope = scope === 'work' ? 'personal' : 'work';
  const run = (fn: () => void) => {
    ref.current?.close();
    fn();
  };
  return (
    <ReanimatedSwipeable
      ref={ref}
      enabled={enabled}
      friction={1.5}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <Pressable
          accessibilityRole="button"
          onPress={() => run(onToggleScope)}
          style={[styles.action, { backgroundColor: to === 'personal' ? colors.personalSoft : colors.workSoft }]}>
          {to === 'personal' ? <User size={22} color={colors.personal} /> : <Briefcase size={22} color={colors.work} />}
          <Text style={[styles.label, { color: to === 'personal' ? colors.personal : colors.work }]}>
            {to === 'personal' ? t('common.personal') : t('common.work')}
          </Text>
        </Pressable>
      )}
      renderRightActions={() => (
        <Pressable accessibilityRole="button" onPress={() => run(onDelete)} style={[styles.action, { backgroundColor: colors.error }]}>
          <Trash2 size={22} color={colors.onError} />
          <Text style={[styles.label, { color: colors.onError }]}>{t('entries.swipeDelete')}</Text>
        </Pressable>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: { width: 96, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 13, fontFamily: fonts.bold },
});
