/**
 * Registers the Android widget headless handler. Must run at bundle load (imported from the app entry
 * `index.ts`) so the launcher can render widgets without opening the app.
 */
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './android/taskHandler';

if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
