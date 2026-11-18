import { useRef, type ComponentProps, type ComponentRef } from 'react';
import { ScrollView } from 'react-native';

/**
 * A ScrollView that shows its scroll bar once when the content doesn't fit (QA-100 iOS QI-1: on an iPhone SE with large
 * text the United States card sat below Continue with nothing hinting that the page scrolls).
 */
export function HintScroll(props: ComponentProps<typeof ScrollView>) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewH = useRef(0);
  const flashed = useRef(false);
  const check = (contentH: number) => {
    if (flashed.current || viewH.current === 0 || contentH <= viewH.current + 4) return;
    flashed.current = true;
    setTimeout(() => ref.current?.flashScrollIndicators(), 400);
  };
  const contentH = useRef(0);
  return (
    <ScrollView
      {...props}
      ref={ref}
      persistentScrollbar
      onLayout={(e) => {
        viewH.current = e.nativeEvent.layout.height;
        check(contentH.current);
        props.onLayout?.(e);
      }}
      onContentSizeChange={(w, h) => {
        contentH.current = h;
        check(h);
        props.onContentSizeChange?.(w, h);
      }}
    />
  );
}
