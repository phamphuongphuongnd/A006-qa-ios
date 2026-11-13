import { useEffect, useRef, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';

const ITEM = 52;
const VISIBLE = 5;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** One scrolling column (hours or minutes) that snaps to a row; adjustable for screen readers. */
function Column({ count, value, onChange, label }: { count: number; value: number; onChange: (v: number) => void; label: string }) {
  const { colors } = useTheme();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const last = useRef(value);

  useEffect(() => {
    if (last.current !== value) {
      last.current = value;
      ref.current?.scrollTo({ y: value * ITEM, animated: true });
    }
  }, [value]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const v = Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    if (v !== last.current) {
      last.current = v;
      onChange(v);
    }
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: pad2(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange((value + (e.nativeEvent.actionName === 'increment' ? 1 : count - 1)) % count)}
      style={{ width: 112, height: ITEM * VISIBLE }}>
      <View pointerEvents="none" style={[styles.band, { backgroundColor: colors.surfaceAlt }]} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        nestedScrollEnabled
        onLayout={() => ref.current?.scrollTo({ y: value * ITEM, animated: false })}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // Android fires no momentum event after a slow drag without a fling.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e);
        }}
        contentContainerStyle={{ paddingVertical: ITEM * Math.floor(VISIBLE / 2) }}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={styles.item}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: i === value ? 34 : 24,
                fontFamily: i === value ? fonts.extrabold : fonts.medium,
                color: i === value ? colors.text : colors.textTertiary,
                fontVariant: ['tabular-nums'],
              }}>
              {pad2(i)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Hours : minutes wheel (S-07c time picker). `value` = minutes after midnight. */
export function TimeWheel({ value, onChange, hourLabel, minuteLabel }: { value: number; onChange: (m: number) => void; hourLabel: string; minuteLabel: string }) {
  const { colors } = useTheme();
  const h = Math.floor(value / 60);
  const m = value % 60;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Column count={24} value={h} onChange={(v) => onChange(v * 60 + m)} label={hourLabel} />
      <Text style={{ fontSize: 30, fontFamily: fonts.extrabold, color: colors.text }}>:</Text>
      <Column count={60} value={m} onChange={(v) => onChange(h * 60 + v)} label={minuteLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: ITEM * Math.floor(VISIBLE / 2), height: ITEM, borderRadius: radius.input },
});
