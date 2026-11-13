import { Linking, Platform } from 'react-native';

import { PRO_PRODUCT_ID } from '@/domain/pro';

const ANDROID_PACKAGE = 'com.phiotron.sundaysort';

/** "Manage subscription": the store's own subscription page (cancel / change payment). S5 may swap in expo-iap's helper. */
export function openManageSubscription(): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : `https://play.google.com/store/account/subscriptions?sku=${PRO_PRODUCT_ID}&package=${ANDROID_PACKAGE}`;
  return Linking.openURL(url).catch(() => undefined);
}
