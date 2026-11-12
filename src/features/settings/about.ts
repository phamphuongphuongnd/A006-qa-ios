import { Linking, Platform } from 'react-native';

/**
 * Links for Settings → About. Rows whose link is null are hidden until the owner fills them in
 * (privacy policy page and support email are written at store-listing time, App Store id after the first upload).
 */
export const ABOUT_LINKS: { privacyUrl: string | null; contactEmail: string | null; appStoreId: string | null } = {
  // Public repo phamphuongphuongnd/sundaysort-privacy (the app repo is private), GitHub Pages.
  privacyUrl: 'https://phamphuongphuongnd.github.io/sundaysort-privacy/',
  contactEmail: null,
  appStoreId: null,
};

const ANDROID_PACKAGE = 'com.phiotron.sundaysort';

/** Store page for "Rate the app", or null when not available on this platform yet. */
export function rateUrl(): string | null {
  if (Platform.OS === 'android') return `market://details?id=${ANDROID_PACKAGE}`;
  if (Platform.OS === 'ios' && ABOUT_LINKS.appStoreId) return `itms-apps://apps.apple.com/app/id${ABOUT_LINKS.appStoreId}?action=write-review`;
  return null;
}

export async function openRate() {
  const url = rateUrl();
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    if (Platform.OS === 'android') await Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
  }
}
