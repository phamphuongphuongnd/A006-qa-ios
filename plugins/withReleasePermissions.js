/**
 * Release-only manifest overrides (android/app/src/release/AndroidManifest.xml).
 * Play Billing (expo-iap) talks to the Play Store app over IPC with com.android.vending.BILLING — never remove it.
 *
 * B-19: Sunday Sort has no network, no push and no overlay, but Expo / RN libraries declare those permissions.
 * Remove them from the RELEASE build only (android/app/src/release/AndroidManifest.xml has the highest merge
 * priority), so debug / dev-client builds keep INTERNET for Metro and SYSTEM_ALERT_WINDOW for the dev menu.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const REMOVE = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
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
