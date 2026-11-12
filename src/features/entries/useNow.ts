import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` (for "2h 14m" timers, greetings, "Today" headers). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
