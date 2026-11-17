/**
 * Registers the Android widget headless handler. Must run at bundle load (imported from the app entry
 * `index.ts`) so the launcher can render widgets without opening the app.
 */
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { ensureMigrated } from '@/db/migrate';

import { widgetTaskHandler } from './android/taskHandler';

// The launcher can draw a widget right after an app update, before any screen ran the migrations (QA-100 OLD-4).
if (Platform.OS === 'android')
  registerWidgetTaskHandler(async (props) => {
    await ensureMigrated().catch(() => {});
    return widgetTaskHandler(props);
  });
