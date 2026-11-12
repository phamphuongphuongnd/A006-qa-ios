import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { db } from '@/db/client';

import { widgetSnapshot } from '../data';
import { renderAndroidWidget } from './widgets';

/**
 * Headless handler for react-native-android-widget (registered in `register.ts` from the app entry).
 * Buttons use OPEN_URI deep links, so clicks need no handling here.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      props.renderWidget(renderAndroidWidget(props.widgetInfo.widgetName, widgetSnapshot(db)));
      break;
    default:
      break;
  }
}
