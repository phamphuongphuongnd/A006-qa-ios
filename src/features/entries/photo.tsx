import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

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
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
      return { ok: true, uri: res.assets[0].uri };
    }
    // The system photo picker needs no permission on Android 13+ / iOS 14+.
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled || !res.assets[0]) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: res.assets[0].uri };
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
