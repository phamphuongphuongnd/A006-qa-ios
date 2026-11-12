import * as Haptics from 'expo-haptics';
import { GripVertical } from '@/ui/icons';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View } from 'react-native';

import { t } from '@/i18n';
import { useTheme } from '@/theme';

import { DRAG_ROW_H, dropIndex, moveItem } from './reorder';

export { DRAG_ROW_H } from './reorder';

/**
 * Reorderable list (S-11): drag the grip handle; screen-reader users get "Move up / Move down" actions.
 * Rows are separated by hairlines like a `.grp` group. `onDragging` lets the parent lock its ScrollView.
 */
export function DragList<T>({
  items,
  keyOf,
  labelOf,
  renderRow,
  onReorder,
  onDragging,
  onActivate,
}: {
  items: T[];
  keyOf: (it: T) => string;
  labelOf: (it: T) => string;
  renderRow: (it: T) => ReactNode;
  onReorder: (next: T[]) => void;
  onDragging?: (on: boolean) => void;
  /** Screen-reader double tap on a row. */
  onActivate?: (it: T) => void;
}) {
  const { colors } = useTheme();
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const [dy] = useState(() => new Animated.Value(0));

  // Latest values for the PanResponder callbacks (created once per row).
  const live = useRef({ items, onReorder, onDragging });
  useLayoutEffect(() => {
    live.current = { items, onReorder, onDragging };
  });

  const start = useCallback((index: number) => {
    dy.setValue(0);
    setDrag({ from: index, to: index });
    live.current.onDragging?.(true);
    Haptics.selectionAsync().catch(() => {});
  }, [dy]);
  const move = useCallback((index: number, offset: number) => {
    dy.setValue(offset);
    const to = dropIndex(index, offset, live.current.items.length);
    setDrag((d) => (d && d.to !== to ? { ...d, to } : d));
  }, [dy]);
  const end = useCallback((index: number, offset: number) => {
    const to = dropIndex(index, offset, live.current.items.length);
    setDrag(null);
    dy.setValue(0);
    live.current.onDragging?.(false);
    if (to !== index) live.current.onReorder(moveItem(live.current.items, index, to));
  }, [dy]);

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
      {items.map((it, i) => {
        let shift = 0;
        if (drag && i !== drag.from) {
          if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -DRAG_ROW_H;
          if (drag.from > drag.to && i < drag.from && i >= drag.to) shift = DRAG_ROW_H;
        }
        const dragging = drag?.from === i;
        return (
          <Animated.View
            key={keyOf(it)}
            accessible
            accessibilityLabel={labelOf(it)}
            accessibilityActions={[
              ...(i > 0 ? [{ name: 'up', label: t('categories.moveUp') }] : []),
              ...(i < items.length - 1 ? [{ name: 'down', label: t('categories.moveDown') }] : []),
              { name: 'activate' },
            ]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'up') onReorder(moveItem(items, i, i - 1));
              if (e.nativeEvent.actionName === 'down') onReorder(moveItem(items, i, i + 1));
              if (e.nativeEvent.actionName === 'activate') onActivate?.(it);
            }}
            style={[
              {
                height: DRAG_ROW_H,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: colors.line,
                borderRadius: dragging ? 12 : 0,
                zIndex: dragging ? 10 : 0,
                elevation: dragging ? 6 : 0,
                shadowColor: '#000',
                shadowOpacity: dragging ? 0.18 : 0,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              },
              { transform: [{ translateY: dragging ? dy : shift }] },
            ]}>
            <View style={{ flex: 1, minWidth: 0 }}>{renderRow(it)}</View>
            <Handle index={i} onStart={start} onMove={move} onEnd={end} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function Handle({
  index,
  onStart,
  onMove,
  onEnd,
}: {
  index: number;
  onStart: (i: number) => void;
  onMove: (i: number, dy: number) => void;
  onEnd: (i: number, dy: number) => void;
}) {
  const { colors } = useTheme();
  // Callbacks from DragList are stable (they only use refs/setters), so the responder survives re-renders mid-drag.
  const responder = useMemo(() => makeResponder({ index, onStart, onMove, onEnd }), [index, onStart, onMove, onEnd]);
  return (
    <View
      {...responder.panHandlers}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 48, height: DRAG_ROW_H, alignItems: 'center', justifyContent: 'center' }}>
      <GripVertical size={22} color={colors.textTertiary} strokeWidth={2.4} />
    </View>
  );
}

interface HandleCbs {
  index: number;
  onStart: (i: number) => void;
  onMove: (i: number, dy: number) => void;
  onEnd: (i: number, dy: number) => void;
}

function makeResponder(cb: HandleCbs) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => cb.onStart(cb.index),
    onPanResponderMove: (_, g) => cb.onMove(cb.index, g.dy),
    onPanResponderRelease: (_, g) => cb.onEnd(cb.index, g.dy),
    onPanResponderTerminate: (_, g) => cb.onEnd(cb.index, g.dy),
  });
}
