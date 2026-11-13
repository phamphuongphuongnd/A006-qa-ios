/**
 * Q18 NFC trip tag (S1). Android: a tag holding the URI `sundaysort://trip/toggle` opens the app straight from the
 * tag dispatcher (NDEF_DISCOVERED), no chooser; S1 routes the link to start / end a trip.
 *
 * Used instead of react-native-nfc-manager's own config plugin on purpose: that plugin always adds the iOS
 * "NFC Tag Reading" entitlement, which needs an App ID capability in the Apple account. iOS does not read tags
 * in the app (product.md: a Shortcuts automation opens the same link), so the entitlement is left out.
 * The library's Android manifest already declares the NFC permission and `android.hardware.nfc` (required=false).
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const ACTION = 'android.nfc.action.NDEF_DISCOVERED';

module.exports = function withNfcTripTag(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity['intent-filter'] = activity['intent-filter'] ?? [];
    const exists = activity['intent-filter'].some((f) => (f.action ?? []).some((a) => a.$['android:name'] === ACTION));
    if (!exists) {
      activity['intent-filter'].push({
        action: [{ $: { 'android:name': ACTION } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:scheme': 'sundaysort', 'android:host': 'trip' } }],
      });
    }
    return cfg;
  });
};
