// B-88 / B-143 drive check (Android): see probeLogic.ts.
import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { ensureMigrated } from '@/db/migrate';
import { appendPoints, getActiveTrip } from '@/db/tripsRepo';
import { t } from '@/i18n';

import { restoreRecording, startGpsTrip } from '../controller';
import { NOTIF_COLOR } from '../constants';
import { isOnFoot, type EngineState } from './engine';
import { allowBackgroundLocationStart, configureNative, hasActivityPermission, logDiagnostic, stepCount } from './native';
import { extendProbe, findDrive, PROBE_EXTEND_MAX_MS, PROBE_MAX_ACCURACY_M, PROBE_MAX_FIXES, PROBE_WINDOW_MS, shouldStartProbe } from './probeLogic';
import {
  getProbe,
  PROBE_TASK,
  probeAfter,
  probeFixes,
  probeLastSince,
  type ProbeState,
  setProbe,
  setProbeTrip,
  stopProbe,
} from './probeState';
import { getKV } from './repo';

TaskManager.defineTask<{ locations?: LocationObject[] }>(PROBE_TASK, async ({ data, error }) => {
  if (error) return;
  try {
    await ensureMigrated();
    await onProbeFixes(data?.locations ?? []);
  } catch (e) {
    logDiagnostic('probe_failed', { error: String((e as Error)?.message ?? e).slice(0, 200) });
  }
});

/**
 * B-143 (d): the check ran out — go on while it still moves (`extendProbe`), else stop it (cool-down). True = still on.
 */
async function expireOrExtend(p: ProbeState, now: number, onFoot: boolean): Promise<boolean> {
  if (now <= p.until) return true;
  const until = extendProbe({ now, until: p.until, maxUntil: p.maxUntil ?? p.until, fixes: probeFixes(p), onFoot });
  if (until !== null) {
    setProbe({ ...p, until });
    configureNative({ probeAfter: until });
    logDiagnostic('probe_extend', { since: p.startedAt, until });
    return true;
  }
  await stopProbe(false, now, restoreRecording);
  logDiagnostic('probe_none', { since: p.startedAt });
  return false;
}

const engineOnFoot = (engine: EngineState | null) => isOnFoot(engine?.activity);

async function onProbeFixes(locations: LocationObject[], now = Date.now()) {
  let p = getProbe();
  if (!p || getActiveTrip(db)) {
    await stopProbe(false, now, restoreRecording);
    return;
  }
  const engine = getKV<EngineState | null>(db, 'engine', null);
  // B-143 (a): the sensor's current activity — walking / running right now is never a drive.
  const onFoot = engineOnFoot(engine);
  const cycling = !!p.cycling || engine?.activity === 'cycling';
  // B-88 v2: steps a minute since the previous fix — walking / running right now.
  const count = await stepCount();
  const steps = count !== null ? { at: now, count } : null;
  const prev = p.steps;
  const stepsPerMin =
    steps && prev && steps.at - prev.at >= 15_000 && steps.count >= prev.count
      ? ((steps.count - prev.count) * 60_000) / (steps.at - prev.at)
      : null;
  // Only while the check is still on (a Trip start may have cleared it meanwhile — never bring it back).
  p = getProbe();
  if (!p) return;
  const fixes = probeFixes(p).slice();
  for (const l of locations) {
    const fix = { lat: l.coords.latitude, lng: l.coords.longitude, ts: l.timestamp, accuracy: l.coords.accuracy ?? 999 };
    if (fix.ts < p.startedAt || fix.accuracy > PROBE_MAX_ACCURACY_M) continue;
    if (fixes.length && fix.ts <= fixes[fixes.length - 1].ts) continue;
    fixes.push(fix);
  }
  const kept = fixes.slice(-PROBE_MAX_FIXES);
  p = { ...p, fixes: kept, origin: undefined, steps, cycling };
  setProbe(p);
  const ctx = { onFoot, cycling, stepsPerMin };
  // Each new fix as the newest: did the check see a drive up to it?
  for (let n = Math.max(2, kept.length - locations.length); n <= kept.length; n++) {
    const upTo = kept.slice(0, n);
    const from = findDrive(upTo, ctx);
    if (from < 0) continue;
    await stopProbe(true, now);
    // From where the drive began: when the phone left 'still' if right at the start, else that fix (after a walk).
    const at = from === 0 ? p.startedAt : upTo[from].ts;
    const row = await startGpsTrip({ startedBy: 'auto', at, askNotifications: false });
    setProbeTrip(row.id, now);
    // The check's fixes from there on are the drive's first miles.
    appendPoints(db, row.id, upTo.slice(from));
    logDiagnostic('probe_drive', { since: p.startedAt, at, onFoot, stepsPerMin: stepsPerMin === null ? null : Math.round(stepsPerMin) });
    return;
  }
  await expireOrExtend(p, now, onFoot);
}

/** After an engine pass (runner): start a check when the phone just left 'still' and no Trip runs; end an old one. */
export async function syncProbe(input: { now: number; enabled: boolean; state: EngineState }): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { now, enabled, state } = input;
  const p = getProbe();
  if (p && (!enabled || getActiveTrip(db))) {
    await stopProbe(false, now, restoreRecording);
    return;
  }
  // Ran out: go on while it still moves, else stop — a new movement may start a new check right away (B-143 b).
  if (p) await expireOrExtend(p, now, engineOnFoot(state));
  const start = shouldStartProbe({
    now,
    enabled: enabled && hasActivityPermission(),
    tripActive: !!getActiveTrip(db),
    movedAt: state.movedAt,
    probeAfter: probeAfter(),
    probing: !!getProbe(),
    stillEnterAt: state.stillEnterAt ?? 0,
    lastCheckSince: probeLastSince(),
  });
  if (!start) return;
  const until = now + PROBE_WINDOW_MS;
  setProbe({
    startedAt: state.movedAt,
    until,
    maxUntil: until + PROBE_EXTEND_MAX_MS,
    fixes: [],
    steps: null,
    cycling: state.activity === 'cycling',
  });
  configureNative({ probeAfter: until });
  try {
    allowBackgroundLocationStart();
    await Location.startLocationUpdatesAsync(PROBE_TASK, {
      // Wifi / cell is enough to see 500 m; one fix every 30 s for 12 minutes (up to 24 while it still moves).
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30_000,
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: t('autoTrip.probeTitle'),
        notificationBody: t('autoTrip.probeBody'),
        notificationColor: NOTIF_COLOR,
        killServiceOnDestroy: true,
      },
    });
    logDiagnostic('probe_start', { since: state.movedAt });
  } catch (e) {
    setProbe(null);
    logDiagnostic('probe_start_failed', { error: String((e as Error)?.message ?? e).slice(0, 200) });
  }
}
