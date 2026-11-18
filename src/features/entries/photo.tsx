import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { withLockSuspended } from '@/features/settings/lockState';
import { t } from '@/i18n';
import { Dialog } from '@/ui';

export type PhotoResult = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

/**
 * Camera (default) or library pick. Asks for permission first; 'denied' means the user has to go to
 * system settings (show <CameraDeniedDialog>).
 */
export async function takePhoto(source: 'camera' | 'library'): Promise<PhotoResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
      // QA-100 A13-3: time in the camera / photo picker isn't "leaving the app" — App lock must not lock behind them
      // (the receipt photo and the typed entry were lost after unlocking), same as the share sheet and file pickers.
      const res = await withLockSuspended(() => ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 }));
      if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
      return { ok: true, uri: res.assets[0].uri };
    }
    // The system photo picker needs no permission on Android 13+ / iOS 14+.
    const res = await withLockSuspended(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 }));
    if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: res.assets[0].uri };
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
        quality: 0.6,
        allowsMultipleSelection: true,
        selectionLimit: max,
        orderedSelection: true,
      }),
    );
    if (res.canceled || !res.assets.length) return { ok: false, reason: 'cancelled' };
    return { ok: true, uris: res.assets.slice(0, max).map((a) => a.uri) };
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
