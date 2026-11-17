import { isTripTogglePath, requestTripToggle } from '@/features/trips/toggleQueue';

/**
 * expo-router calls this once for every link the system hands the app (cold start: `initial`). The NFC / Shortcuts
 * trip toggle is counted here so two taps in a row are two toggles even when the second one arrives while the first
 * is still running (B-53 part 2). The path itself is returned unchanged.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (isTripTogglePath(path)) requestTripToggle();
  } catch {
    // never block a link
  }
  return path;
}
