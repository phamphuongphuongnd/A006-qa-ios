// Pure part of the iOS missed-trip backstops (B-96); see backstop.ts.
import { DRIVING_STALE_MS, SILENT_NOTIFY_MS, type EngineState, type EngineTrip } from './engine';

/** Booked a little after the engine's threshold so a booking a minute stale (re-booked at most once a minute) is never early. */
export const BACKSTOP_SLACK_MS = 90_000;
/** Re-book only when the time moved more than this (TRIP_TASK runs every few seconds while moving). */
export const REBOOK_MIN_SHIFT_MS = 60_000;

export interface BackstopPlan {
  still: number | null;
  silent: number | null;
}

/** Pure: when each notification should fire if nothing else happens (null = none). Mirrors `engine.step`. */
export function planBackstops(trip: EngineTrip | null, state: EngineState, now: number, mergeMs = 10 * 60_000): BackstopPlan {
  if (!trip || trip.status !== 'running') return { still: null, silent: null };
  const lastFix = Math.max(trip.lastPointAt ?? 0, trip.startedAt);
  const lastMove = Math.max(trip.lastMoveAt ?? trip.lastPointAt ?? 0, trip.startedAt);
  const driving = state.activity === 'driving' && now - Math.max(lastFix, state.activityAt) < DRIVING_STALE_MS;
  // Since 19/11 a Trip the driver started also ends after the merge threshold without moving — but only when JS runs.
  // If iOS has suspended the app by then, this booked "Still on a trip?" is what the driver sees; opening it ends the
  // trip at the last move. Automatic trips have their own end wake-up.
  const still =
    trip.startedBy === 'auto' || state.stillNotifiedFor === lastMove
      ? null
      : Math.max((driving ? now : lastMove) + mergeMs + BACKSTOP_SLACK_MS, now + BACKSTOP_SLACK_MS);
  const silent =
    driving && state.silentNotifiedFor !== lastFix ? Math.max(lastFix + SILENT_NOTIFY_MS + BACKSTOP_SLACK_MS, now + BACKSTOP_SLACK_MS) : null;
  return { still, silent };
}

/** Pure: book again? Not for small shifts, so the booking is renewed about once a minute while driving. */
export function needsRebook(booked: number | null | undefined, next: number | null): boolean {
  if (booked === undefined) return true;
  if (booked === null || next === null) return booked !== next;
  return Math.abs(next - booked) > REBOOK_MIN_SHIFT_MS;
}
