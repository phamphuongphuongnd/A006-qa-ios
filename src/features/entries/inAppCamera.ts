import type { Href } from 'expo-router';

import { router } from '@/services/router';

/**
 * QA-100 B-106 (Phương, 18/11: "mở máy ảnh là camera thường, camera sau luôn"): on Samsung the system camera app opened
 * the selfie camera in beauty mode every time — it ignores the back-camera request an intent can carry. On Android the
 * receipt photo is now taken on the app's own screen (/camera), always the back camera, one tap.
 *
 * `openInAppCamera()` opens that screen and resolves with the photo's uri, or null when the driver closes it.
 */
let pending: ((uri: string | null) => void) | null = null;

export function openInAppCamera(): Promise<string | null> {
  // A second call while the screen is already up (double tap): the older caller gets null, the screen isn't opened twice.
  const open = pending !== null;
  pending?.(null);
  return new Promise((resolve) => {
    pending = resolve;
    // Typed routes regenerate on the next Metro start; the route file is src/app/camera.tsx.
    if (!open) router.push('/camera' as Href);
  });
}

/** Called once by the camera screen: the photo taken, or null (closed / back / failed). */
export function finishInAppCamera(uri: string | null) {
  const done = pending;
  pending = null;
  done?.(uri);
}

/** The screen was opened without a request (deep link): nothing waits for it. */
export const inAppCameraWaiting = () => pending !== null;

/** Long side of the photo asked from the camera: enough for receipt text, far less than a 50 MP sensor gives. */
export const WANT_LONG_SIDE = 2400;

/** The smallest "WxH" whose long side still reaches WANT_LONG_SIDE (else the largest there is). */
export function pickPictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((s) => {
      const m = s.match(/^(\d+)x(\d+)$/);
      return m ? { s, long: Math.max(Number(m[1]), Number(m[2])) } : null;
    })
    .filter((x): x is { s: string; long: number } => x !== null);
  if (!parsed.length) return undefined;
  const enough = parsed.filter((x) => x.long >= WANT_LONG_SIDE).sort((a, b) => a.long - b.long);
  return (enough[0] ?? parsed.sort((a, b) => b.long - a.long)[0]).s;
}
