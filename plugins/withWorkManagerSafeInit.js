/**
 * QA-100 OLD-7: with the phone's storage full, WorkManager's start-up (ForceStopRunnable writes its own SQLite DB)
 * threw IllegalStateException → "Sunday Sort has stopped" on every launch until space was freed. WorkManager is pulled
 * in by expo-background-task (nightly backup) and react-native-android-widget.
 *
 * Fix: initialise WorkManager on demand from MainApplication (Configuration.Provider) with an initialisation exception
 * handler — on a full disk background work is skipped (the nightly backup reports "space" later) but the app opens —
 * and remove the default androidx.startup WorkManagerInitializer so our configuration is the one used.
 */
const { withAndroidManifest, withAppBuildGradle, withMainApplication } = require('expo/config-plugins');

const WORK_VERSION = '2.10.5'; // same as expo-background-task

function withProvider(config) {
  return withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('workManagerConfiguration')) return cfg;
    src = src.replace(
      /class MainApplication : Application\(\), ReactApplication \{/,
      'class MainApplication : Application(), ReactApplication, androidx.work.Configuration.Provider {',
    );
    src = src.replace(
      /\n  override fun onCreate\(\) \{/,
      `
  // QA-100 OLD-7: a full disk must not crash the app at start (WorkManager's own DB can't be written).
  override val workManagerConfiguration: androidx.work.Configuration
    get() = androidx.work.Configuration.Builder()
      .setInitializationExceptionHandler { e -> android.util.Log.w("SundaySort", "WorkManager could not start: \${e.message}") }
      .build()

  override fun onCreate() {`,
    );
    if (!src.includes('workManagerConfiguration')) throw new Error('withWorkManagerSafeInit: MainApplication.kt did not match');
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withDependency(config) {
  return withAppBuildGradle(config, (cfg) => {
    const dep = `implementation("androidx.work:work-runtime:${WORK_VERSION}")`;
    if (!cfg.modResults.contents.includes('androidx.work:work-runtime:')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(/dependencies \{\n/, `dependencies {\n    ${dep}\n`);
    }
    return cfg;
  });
}

function withoutDefaultInitializer(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const app = manifest.application[0];
    app.provider = app.provider || [];
    const name = 'androidx.startup.InitializationProvider';
    let provider = app.provider.find((p) => p.$['android:name'] === name);
    if (!provider) {
      provider = {
        $: {
          'android:name': name,
          'android:authorities': '${applicationId}.androidx-startup',
          'android:exported': 'false',
          'tools:node': 'merge',
        },
        'meta-data': [],
      };
      app.provider.push(provider);
    }
    provider['meta-data'] = provider['meta-data'] || [];
    if (!provider['meta-data'].some((m) => m.$['android:name'] === 'androidx.work.WorkManagerInitializer')) {
      provider['meta-data'].push({
        $: { 'android:name': 'androidx.work.WorkManagerInitializer', 'android:value': 'androidx.startup', 'tools:node': 'remove' },
      });
    }
    return cfg;
  });
}

module.exports = (config) => withoutDefaultInitializer(withDependency(withProvider(config)));
