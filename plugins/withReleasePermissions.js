/**
 * Release-only manifest overrides (android/app/src/release/AndroidManifest.xml).
 * Play Billing (expo-iap) talks to the Play Store app over IPC with com.android.vending.BILLING — never remove it.
 *
 * B-19: Sunday Sort has no push and no overlay, but Expo / RN libraries declare those permissions.
 * Remove them from the RELEASE build only (android/app/src/release/AndroidManifest.xml has the highest merge
 * priority), so debug / dev-client builds keep SYSTEM_ALERT_WINDOW for the dev menu.
 *
 * INTERNET is KEPT in release since Q25 (bản 2, S1b): trip maps load OpenFreeMap tiles and A → B trips call
 * openrouteservice (address search + driving distance). Recorded GPS tracks are still never sent.
 * TODO(P6): privacy policy + Play Data safety must say: typed A → B addresses (and the position for "Current
 * location") go to openrouteservice; map tiles for the area shown are downloaded from OpenFreeMap.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const REMOVE = [
  // INTERNET stays (Q25: maps + A → B) — see the note above.
  // ACCESS_NETWORK_STATE is kept (bản 2): expo-background-task schedules WorkManager with NetworkType.CONNECTED and
  // JobScheduler throws SecurityException for a network constraint without it (Android 9+) → nightly backup (S4).
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  // WRITE_EXTERNAL_STORAGE is NOT removed — see KEEP_OLD below (QA-100 B-115).
  'com.google.android.c2dm.permission.RECEIVE',
  'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
  // Launcher badge permissions (ShortcutBadger, pulled in by expo-notifications). The app sets no icon badge.
  'android.permission.READ_APP_BADGE',
  'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE',
  'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.sonyericsson.home.permission.BROADCAST_BADGE',
  'com.sonymobile.home.permission.PROVIDER_INSERT_BADGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.huawei.android.launcher.permission.CHANGE_BADGE',
  'com.huawei.android.launcher.permission.READ_SETTINGS',
  'com.huawei.android.launcher.permission.WRITE_SETTINGS',
  'com.oppo.launcher.permission.READ_SETTINGS',
  'com.oppo.launcher.permission.WRITE_SETTINGS',
  'me.everything.badger.permission.BADGE_COUNT_READ',
  'me.everything.badger.permission.BADGE_COUNT_WRITE',
];

const manifest = () =>
  [
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
    '    xmlns:tools="http://schemas.android.com/tools">',
    ...REMOVE.map((p) => `    <uses-permission android:name="${p}" tools:node="remove"/>`),
    // QA-100 B-115 (OLD-14, API 26): on Android 9 and older expo-image-picker's camera needs WRITE_EXTERNAL_STORAGE as well
    // as CAMERA; removing it meant "Take photo" never opened the camera on Android 7–9. Kept for those versions only.
    '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" tools:replace="android:maxSdkVersion"/>',
    // QA-100 (phiên D): CAMERA / BLUETOOTH permissions make Google Play assume the hardware is required and hide the app
    // from phones / tablets without it. Receipt photos (library works), the van's Bluetooth and GPS are all optional.
    ...[
      'android.hardware.camera',
      'android.hardware.camera.autofocus',
      'android.hardware.bluetooth',
      'android.hardware.location',
      'android.hardware.location.gps',
    ].map((f) => `    <uses-feature android:name="${f}" android:required="false" tools:replace="android:required"/>`),
    // S3 OCR: ask Play services to download the ML Kit text model at install time, not on the first scan.
    // Release only: in debug, expo-dev-launcher declares the same key ("barcode_ui") and the merge would clash.
    '    <application>',
    '        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="ocr" tools:replace="android:value"/>',
    '    </application>',
    '</manifest>',
    '',
  ].join('\n');

module.exports = function withReleasePermissions(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'release');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AndroidManifest.xml'), manifest());
      return cfg;
    },
  ]);
};
