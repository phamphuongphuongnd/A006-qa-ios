// Pure: iOS CoreMotion snapshots → the enter / exit activity transitions the engine reads (B-95).
// iOS logs raw snapshots (`kind: 'motion'`, see modules/trip-detect/ios/TripWatcher.swift) instead of transitions;
// turning them into transitions here keeps one engine (`engine.step`) for both platforms and makes the rules testable.
import type { TripSignal } from '../../../../modules/trip-detect';

type Motion = Extract<TripSignal, { kind: 'motion' }>;
type Transition = Extract<TripSignal, { kind: 'activity' | 'sample' }>;

/** Read this much log before `since` so the activity the phone was in at `since` is known (exit transitions). */
export const MOTION_LOOKBACK_MS = 6 * 3_600_000;
/** CoreMotion confidence 0 = low, 1 = medium, 2 = high. Low-confidence snapshots flicker (bus, lift) and are ignored. */
export const MIN_MOTION_CONFIDENCE = 1;
/**
 * A drive the phone only learned about after it had already ended this long ago (no wake-up during it) can't be
 * recorded any more — GPS only starts now. Starting a trip for it would give a 0 mi trip that is then dropped, so
 * it is skipped here; the gap between the trips around it shows as "Missing trip?" (Q26).
 */
export const STALE_DRIVE_MS = 5 * 60_000;

interface Run {
  activity: Motion['activity'];
  /** When the activity began (CoreMotion time). */
  startAt: number;
  /** When the phone logged its first snapshot. */
  at: number;
  /** Start of the next run (null = still going at the last snapshot). */
  endAt: number | null;
  confidence: number;
}

const isMotion = (s: TripSignal): s is Motion => s.kind === 'motion';

/**
 * Consecutive confident snapshots of the same activity → one run. Low-confidence 'driving' right before a confident
 * one is usually the first minute of the same drive, so the run starts there.
 */
function toRuns(snapshots: Motion[]): Run[] {
  const runs: Run[] = [];
  let lowDrivingAt: number | null = null;
  for (const m of snapshots) {
    if (m.confidence < MIN_MOTION_CONFIDENCE) {
      if (m.activity === 'driving') lowDrivingAt ??= m.eventAt;
      continue;
    }
    const startAt = m.activity === 'driving' && lowDrivingAt !== null ? lowDrivingAt : m.eventAt;
    lowDrivingAt = null;
    const last = runs[runs.length - 1];
    if (last && last.activity === m.activity) continue;
    if (last) last.endAt = startAt;
    runs.push({ activity: m.activity, startAt, at: m.at, endAt: null, confidence: m.confidence });
  }
  return runs;
}

/**
 * Converts the iOS log (motion snapshots mixed with other signals) into engine signals logged at or after `sinceMs`.
 * `events` should start `MOTION_LOOKBACK_MS` before `sinceMs`. Signals that are not snapshots pass through.
 *
 * Each change of activity gives `exit(previous)` + `enter(next)` with `eventAt` = when the next activity began and
 * `at` = when the phone logged it, so the engine back-dates a start to the real start of driving and skips
 * transitions it already handled (`seenUntil`). Deterministic: re-reading an overlapping window gives the same
 * transitions for the same snapshots.
 */
export function motionToSignals(events: TripSignal[], sinceMs: number): TripSignal[] {
  const snapshots = events
    .filter(isMotion)
    .sort((a, b) => a.eventAt - b.eventAt || a.at - b.at);
  const runs = toRuns(snapshots);

  // Drop drives that were over long before the phone heard of them, then merge what touches again.
  const kept: Run[] = [];
  for (const r of runs) {
    if (r.activity === 'driving' && r.endAt !== null && r.at - r.endAt > STALE_DRIVE_MS) continue;
    const last = kept[kept.length - 1];
    if (last && last.activity === r.activity) {
      last.endAt = r.endAt;
      continue;
    }
    kept.push({ ...r });
  }

  const out: TripSignal[] = [];
  kept.forEach((r, i) => {
    const prev = kept[i - 1];
    if (prev) {
      out.push({ kind: 'activity', activity: prev.activity, transition: 'exit', confidence: prev.confidence, at: r.at, eventAt: r.startAt } satisfies Transition);
    }
    out.push({ kind: 'activity', activity: r.activity, transition: 'enter', confidence: r.confidence, at: r.at, eventAt: r.startAt } satisfies Transition);
  });

  const rest = events.filter((e) => !isMotion(e));
  return [...out, ...rest].filter((e) => e.at >= sinceMs).sort((a, b) => a.at - b.at);
}
