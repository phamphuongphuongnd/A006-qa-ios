import { Trash2, X } from 'lucide-react-native';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { fonts } from '@/theme';

/** Full-screen receipt (mockup S-05 receipt full screen): pinch to zoom, drag when zoomed, double-tap to reset. */
export function ReceiptViewer({
  uri,
  caption,
  onClose,
  onDelete,
}: {
  uri: string | null;
  caption?: string;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0B0D11' }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={4} style={styles.ib}>
            <X size={24} color="#fff" />
          </Pressable>
          <Text numberOfLines={1} style={styles.cap}>
            {caption ?? ''}
          </Text>
          <View style={{ width: 48 }} />
        </View>
        {uri ? <Zoomable uri={uri} /> : null}
        {onDelete ? (
          <View style={{ alignItems: 'center', paddingBottom: insets.bottom + 24, paddingTop: 12 }}>
            <Pressable accessibilityRole="button" onPress={onDelete} style={styles.del}>
              <Trash2 size={20} color="#FF8F86" />
              <Text style={{ color: '#FF8F86', fontSize: 15, fontFamily: fonts.bold }}>{t('common.deletePhoto')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ height: insets.bottom + 24 }} />
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

function Zoomable({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      startScale.value = scale.value;
    },
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(5, Math.max(1, startScale.value * e.scale));
    },
  });
  const pan = usePanGesture({
    onActivate: () => {
      'worklet';
      startX.value = tx.value;
      startY.value = ty.value;
    },
    onUpdate: (e) => {
      'worklet';
      if (scale.value <= 1) return;
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    },
  });
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      const zoomIn = scale.value <= 1;
      scale.value = withTiming(zoomIn ? 2.5 : 1);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
    },
  });
  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ flex: 1, padding: 20 }, style]}>
        <Image source={{ uri }} style={{ flex: 1 }} resizeMode="contain" accessibilityLabel={t('common.receiptPhoto')} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 6 },
  ib: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cap: { flex: 1, textAlign: 'center', color: '#C8D0DE', fontSize: 14, fontFamily: fonts.regular },
  del: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 24, paddingHorizontal: 18, backgroundColor: 'rgba(249,112,102,.16)' },
});
