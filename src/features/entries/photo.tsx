import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';

import { ReceiptOcr } from '../../../modules/receipt-ocr';

import { openInAppCamera } from '@/features/entries/inAppCamera';
import { notePhotoTiming } from '@/features/ocr/reader';
import { withLockSuspended } from '@/features/settings/lockState';
import { t } from '@/i18n';
import { Dialog } from '@/ui';

export type PhotoResult = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

/**
 * QA-100 A13-5: on Android the picker copies the photo untouched (quality 1 = no re-encode of a 50 MP JPEG, which took
 * 15–18 s on a Galaxy A13) and receipt-ocr makes one small upright copy that is both read and kept. iOS is unchanged.
 */
const SHRINK = Platform.OS === 'android' && typeof ReceiptOcr?.shrink === 'function';
const QUALITY = SHRINK ? 1 : 0.6;
const MAX_SIDE = 2400;

async function prepared(uri: string, pickedAt: number): Promise<string> {
  if (!SHRINK) return uri;
  const t0 = Date.now();
  try {
    const out = await ReceiptOcr!.shrink!(uri, MAX_SIDE, 92);
    notePhotoTiming(out, { pickedAt: new Date(pickedAt).toISOString(), shrinkMs: Date.now() - t0 });
    return out;
  } catch {
    return uri;
  }
}

/**
 * Camera (default) or library pick. Asks for permission first; 'denied' means the user has to go to
 * system settings (show <CameraDeniedDialog>).
 */
export async function takePhoto(source: 'camera' | 'library'): Promise<PhotoResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
      if (Platform.OS === 'android') {
        // QA-100 B-106: the app's own camera screen — always the back camera, normal photo (Samsung's camera app opened
        // the selfie camera in beauty mode whatever the intent asked for). It never leaves the app: no App lock dance.
        const uri = await openInAppCamera();
        if (!uri) return { ok: false, reason: 'cancelled' };
        return { ok: true, uri: await prepared(uri, Date.now()) };
      }
      // QA-100 A13-3: time in the camera / photo picker isn't "leaving the app" — App lock must not lock behind them
      // (the receipt photo and the typed entry were lost after unlocking), same as the share sheet and file pickers.
      const res = await withLockSuspended(() => ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITY }));
      if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
      return { ok: true, uri: await prepared(res.assets[0].uri, Date.now()) };
    }
    // The system photo picker needs no permission on Android 13+ / iOS 14+.
    const res = await withLockSuspended(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: QUALITY }));
    if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: await prepared(res.assets[0].uri, Date.now()) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export type PhotosResult = { ok: true; uris: string[] } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

/**
 * Several photos at once (Q21): the camera gives one, the library lets the driver pick up to `max` (Android 13+ /
 * iOS 14+ system picker). Extra picks past `max` are dropped here, so callers never exceed the free allowance.
 */
export async function takePhotos(source: 'camera' | 'library', max: number): Promise<PhotosResult> {
  if (max <= 0) return { ok: false, reason: 'cancelled' };
  if (source === 'camera' || max === 1) {
    const one = await takePhoto(source);
    return one.ok ? { ok: true, uris: [one.uri] } : one;
  }
  try {
    const res = await withLockSuspended(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: QUALITY,
        allowsMultipleSelection: true,
        selectionLimit: max,
        orderedSelection: true,
      }),
    );
    if (res.canceled || !res.assets.length) return { ok: false, reason: 'cancelled' };
    const at = Date.now();
    return { ok: true, uris: await Promise.all(res.assets.slice(0, max).map((a) => prepared(a.uri, at))) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** "Camera access is off" (mockup 11-dialogs · S-03 camera denied). */
export function CameraDeniedDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('capture.cameraOffTitle')}
      body={t('capture.cameraOffBody')}
      actions={[
        { label: t('common.notNow'), onPress: onClose },
        {
          label: t('common.openSettings'),
          variant: 'primary',
          onPress: () => {
            onClose();
            Linking.openSettings();
          },
        },
      ]}
    />
  );
}
