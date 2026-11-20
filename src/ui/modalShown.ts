import { createContext, useContext, useState } from 'react';

/**
 * B-149: on Android a TextInput's `autoFocus` inside a Modal (Dialog / Sheet) focuses the field but never raises the
 * keyboard, and focus() right at the Modal's onShow sometimes misses it too. Dialog / Sheet say here when their Modal
 * window is up (null = not inside one); `Field` with `autoFocus` then focuses MODAL_FOCUS_DELAY_MS later.
 */
export const ModalShownContext = createContext<boolean | null>(null);
export const useModalShown = () => useContext(ModalShownContext);
export const MODAL_FOCUS_DELAY_MS = 250;

/** For Dialog / Sheet: `shown` turns true at the Modal's onShow and back to false when it is hidden. */
export function useShownState(visible: boolean) {
  const [shown, setShown] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  // Hidden → reset during render (not in an effect), so a reopened dialog waits for its next onShow.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) setShown(false);
  }
  return { shown: visible && shown, onShow: () => setShown(true) };
}
