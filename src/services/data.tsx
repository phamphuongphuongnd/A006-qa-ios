import type { ReactNode } from 'react';

/**
 * Data / settings background services (owner: reports-data-settings work).
 * `DataServices` is mounted once in the root layout: notification handler + channels, weekly Sunday reminder
 * scheduling from `settings.reminder`, backup-reminder logic.
 * `LockGate` wraps the navigator: shows the S-13 Locked screen when app lock is on and the lock timeout passed.
 */
export function DataServices() {
  return null;
}

export function LockGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
