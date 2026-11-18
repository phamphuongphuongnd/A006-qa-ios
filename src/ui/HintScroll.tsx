import { useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme';

import { ChevronDown } from './icons';
import { Txt } from './Txt';

/**
 * A ScrollView that says so when its content doesn't fit (QA-100 iOS QI-1 / B-100: on an iPhone SE with large text the
 * United States card sat below Continue with nothing hinting that the page scrolls).
 *
 * The scroll bar flashes once, and — because iOS shows it for only ~1 s (persistentScrollbar is Android-only) — a small
 * "More below" pill stays at the bottom until the end is reached; tapping it scrolls one screen down.
 */
export function HintScroll(props: ComponentProps<typeof ScrollView>) {
  const { colors } = useTheme();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewH = useRef(0);
  const contentH = useRef(0);
  const y = useRef(0);
  const flashed = useRef(false);
  const [more, setMore] = useState(false);

  const update = () => {
    const overflow = viewH.current > 0 && contentH.current > viewH.current + 4;
    if (overflow && !flashed.current) {
      flashed.current = true;
      setTimeout(() => ref.current?.flashScrollIndicators(), 400);
    }
    const next = overflow && y.current + viewH.current < contentH.current - 8;
    setMore((m) => (m === next ? m : next));
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        {...props}
        ref={ref}
        persistentScrollbar
        scrollEventThrottle={64}
        onScroll={(e) => {
          y.current = e.nativeEvent.contentOffset.y;
          update();
          props.onScroll?.(e);
        }}
        onLayout={(e) => {
          viewH.current = e.nativeEvent.layout.height;
          update();
          props.onLayout?.(e);
        }}
        onContentSizeChange={(w, h) => {
          contentH.current = h;
          update();
          props.onContentSizeChange?.(w, h);
        }}
      />
      {more ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 8, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.moreBelow')}
            onPress={() => ref.current?.scrollTo({ y: y.current + viewH.current * 0.8, animated: true })}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
            }}>
            <Txt v="small" maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.semibold }}>
              {t('common.moreBelow')}
            </Txt>
            <ChevronDown size={16} color={colors.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
