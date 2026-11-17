/**
 * B-53 (part 2): `sundaysort://trip/toggle` taps queue up here, one per incoming link, and run one after another.
 *
 * expo-router opens `/trip/toggle` for each link, but a second link that arrives while the first toggle is still
 * starting GPS (~1–3 s, longer behind the app-lock fingerprint prompt) finds that screen already open, so the
 * navigation is a no-op and the tap was lost (the trip kept running). Counting links in `+native-intent`
 * (`redirectSystemPath`, called once per link, cold start included) instead of per screen mount fixes that.
 */
export type ToggleEnd = 'home' | 'setup';

let pending = 0;
let current: Promise<ToggleEnd> | null = null;
const listeners = new Set<() => void>();

/** True for the NFC / Shortcuts link in any form expo-router hands us (`sundaysort://trip/toggle`, `/trip/toggle?x`). */
export function isTripTogglePath(path: string | null | undefined): boolean {
  if (!path) return false;
  const p = path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '/').split(/[?#]/)[0].replace(/\/+$/, '');
  return /^\/*trip\/toggle$/i.test(p);
}

/** One more toggle asked for (one per incoming link). */
export function requestTripToggle() {
  pending++;
  listeners.forEach((l) => l());
}

export const pendingTripToggles = () => pending;

/** The toggle screen listens while it is open, so a link that arrives after its queue ran dry is still handled. */
export function onTripToggleRequest(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Runs the queued toggles one at a time (a toggle that arrives meanwhile joins this run). Resolves with where to go
 * next: 'setup' when a toggle needs location permission / GPS first (the rest of the queue is dropped — the user
 * has to act on the phone anyway).
 */
export function drainTripToggles(run: () => Promise<ToggleEnd>): Promise<ToggleEnd> {
  if (current) return current;
  current = (async () => {
    let end: ToggleEnd = 'home';
    try {
      while (pending > 0) {
        pending--;
        try {
          end = await run();
        } catch {
          end = 'home';
        }
        if (end === 'setup') {
          pending = 0;
          break;
        }
      }
    } finally {
      current = null;
    }
    return end;
  })();
  return current;
}

/** Tests only. */
export function resetTripToggles() {
  pending = 0;
  current = null;
  listeners.clear();
}
