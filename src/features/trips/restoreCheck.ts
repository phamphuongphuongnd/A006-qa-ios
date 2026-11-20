/**
 * B-144 (Phương 20/11): Samsung may stop the app in the background (low battery, "sleeping apps") — the running Trip's
 * GPS then stops with it. Each time native wakes JS (activity / bluetooth / wake alarm / sample / boot / restart): a
 * running Trip whose location updates are not registered records again. B-129 did this only after a restart.
 * Everything it touches comes in `deps` (backgroundTask.ts passes the real ones; tests pass fakes).
 */
export interface RestoreDeps {
  /** A Trip is running (not paused, not ended). */
  tripRunning: () => boolean;
  /** The Trip's location updates are registered. */
  recording: () => Promise<boolean>;
  restore: () => Promise<void>;
  log: (kind: 'restore_ok' | 'restore_failed', data: Record<string, unknown>) => void;
}

/** Returns true when it restarted the recording. Never throws. */
export async function restoreIfNotRecording(reason: string, deps: RestoreDeps): Promise<boolean> {
  try {
    if (!deps.tripRunning()) return false;
    // After a restart (B-129) the registration survives in storage while nothing records: always register again.
    // Otherwise only when not registered; unknown (the check itself failed) → leave it.
    if (reason !== 'restart' && (await deps.recording().catch(() => true))) return false;
    await deps.restore();
    deps.log('restore_ok', { reason });
    return true;
  } catch (e) {
    deps.log('restore_failed', { reason, error: String((e as Error)?.message ?? e).slice(0, 200) });
    return false;
  }
}
