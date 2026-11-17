/**
 * While a system sheet we opened is up (share sheet, document picker, camera, biometric prompt), the app goes to the
 * background. That must not count as "leaving the app" for app lock, or "Lock after: Immediately" would lock the user
 * out every time they share a file.
 */
let suspended = 0;
let resumedAt = 0;

export const lockSuspended = () => suspended > 0;
/** Time the last suspended call finished (the app may report `active` a moment later). */
export const lastResumeAt = () => resumedAt;

export async function withLockSuspended<T>(fn: () => Promise<T>): Promise<T> {
  suspended++;
  try {
    return await fn();
  } finally {
    suspended = Math.max(0, suspended - 1);
    resumedAt = Date.now();
  }
}

/**
 * B-53: a biometric prompt that the system dropped without answering (a new intent — NFC tag / trip toggle — arrived
 * while it was up) leaves its promise pending forever. Forget every open suspension so app lock works again.
 */
export function resetLockSuspended() {
  suspended = 0;
  resumedAt = Date.now();
}
