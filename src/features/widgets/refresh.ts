import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { db } from '@/db/client';

import { renderAndroidWidget, ANDROID_WIDGETS } from './android/widgets';
import { widgetSnapshot, type WidgetSnapshot } from './data';

/** App Group shared with the iOS widget extension (targets/widget, app.json ios.entitlements). */
export const IOS_APP_GROUP = 'group.com.phiotron.sundaysort';
/** UserDefaults key the Swift widget reads. */
export const IOS_SNAPSHOT_KEY = 'widgetSnapshot';

let iosStorage: ExtensionStorage | null = null;

/** Flatten for UserDefaults (string / number values only). */
export function iosPayload(s: WidgetSnapshot): Record<string, string | number> {
  return {
    ready: s.ready ? 1 : 0,
    toSort: s.toSort,
    toSortText: s.toSortText,
    netText: s.netText,
    weekLine: s.weekLine,
    trip: s.trip,
    tripDistance: s.tripDistance,
    updatedAt: Date.now(),
  };
}

let last = '';

/** Push fresh numbers to home-screen widgets (skips when nothing visible changed). */
export async function refreshWidgets(force = false): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const s = widgetSnapshot(db);
  const sig = JSON.stringify(s);
  if (!force && sig === last) return;
  last = sig;
  if (Platform.OS === 'android') {
    await Promise.all(
      Object.values(ANDROID_WIDGETS).map((widgetName) =>
        requestWidgetUpdate({ widgetName, renderWidget: () => renderAndroidWidget(widgetName, s) }).catch((e: unknown) =>
          console.warn(`[widget] update ${widgetName} failed`, e),
        ),
      ),
    );
  } else {
    iosStorage ??= new ExtensionStorage(IOS_APP_GROUP);
    iosStorage.set(IOS_SNAPSHOT_KEY, iosPayload(s));
    ExtensionStorage.reloadWidget();
  }
}
