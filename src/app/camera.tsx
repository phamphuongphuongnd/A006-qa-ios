import { CameraView, type CameraCapturedPicture } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { finishInAppCamera, inAppCameraWaiting, pickPictureSize } from '@/features/entries/inAppCamera';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { fonts } from '@/theme';
import { Txt, useSnackbar } from '@/ui';
import { X, Zap } from '@/ui/icons';

/**
 * QA-100 B-106: the app's own receipt camera (Android). Back camera, normal photo, one tap — no beauty mode, no
 * selfie camera to flip away from, no review screen. Permission is asked by the caller (takePhoto) before it opens.
 */
export default function ReceiptCamera() {
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const cam = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [size, setSize] = useState<string | undefined>(undefined);
  const settled = useRef(false);

  const leave = (uri: string | null) => {
    if (settled.current) return;
    settled.current = true;
    finishInAppCamera(uri);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  useEffect(() => {
    // Opened by a link with nobody waiting for a photo: nothing to do here.
    if (!inAppCameraWaiting()) leave(null);
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave(null);
      return true;
    });
    return () => {
      sub.remove();
      // Left some other way (gesture, navigation reset): whoever waits gets "no photo".
      if (!settled.current) finishInAppCamera(null);
    };
  }, []);

  const onReady = () => {
    setReady(true);
    cam.current
      ?.getAvailablePictureSizesAsync()
      .then((sizes) => setSize(pickPictureSize(sizes)))
      .catch(() => {});
  };

  const shoot = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      // skipProcessing: no full-size rotate + re-encode here; receipt-ocr's shrink turns it upright from EXIF.
      const pic: CameraCapturedPicture | undefined = await cam.current?.takePictureAsync({ quality: 0.92, skipProcessing: true, shutterSound: false });
      if (!pic?.uri) throw new Error('no photo');
      leave(pic.uri);
    } catch {
      setBusy(false);
      snack({ message: t('capture.cameraFailed'), tone: 'error' });
    }
  };

  return (
    <View style={styles.root}>
      <CameraView
        ref={cam}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="picture"
        enableTorch={torch}
        pictureSize={size}
        animateShutter
        onCameraReady={onReady}
        onMountError={() => leave(null)}
      />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('capture.cameraClose')} onPress={() => leave(null)} hitSlop={12} style={styles.round}>
          <X size={26} color="#fff" />
        </Pressable>
        <Txt maxFontSizeMultiplier={1.4} style={styles.hint}>
          {t('capture.cameraHint')}
        </Txt>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: torch }}
          accessibilityLabel={torch ? t('capture.cameraTorchOff') : t('capture.cameraTorchOn')}
          onPress={() => setTorch((v) => !v)}
          hitSlop={12}
          style={[styles.round, torch && { backgroundColor: '#fff' }]}>
          <Zap size={24} color={torch ? '#000' : '#fff'} />
        </Pressable>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 28 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('capture.cameraShutter')}
          disabled={!ready || busy}
          onPress={shoot}
          style={({ pressed }) => [styles.shutter, (pressed || busy) && { transform: [{ scale: 0.92 }] }, !ready && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#000" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  hint: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 15, fontFamily: fonts.semibold, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
});
