// B-88 drive check (Android): see probeLogic.ts.
import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { ensureMigrated } from '@/db/migrate';
import { appendPoints, getActiveTrip } from '@/db/tripsRepo';
import { t } from '@/i18n';

import { startGpsTrip } from '../controller';
import { NOTIF_COLOR } from '../constants';
import type { EngineState } from './engine';
import { allowBackgroundLocationStart, configureNative, hasActivityPermission, logDiagnostic } from './native';
import { PROBE_MAX_ACCURACY_M, PROBE_WINDOW_MS, probeSaysDriving, shouldStartProbe } from './probeLogic';
import { getProbe, PROBE_TASK, probeAfter, setProbe, stopProbe } from './probeState';
import { getKV } from './repo';

const ON_FOOT = new Set(['walking', 'running', 'cycling']);

TaskManager.defineTask<{ locations?: LocationObject[] }>(PROBE_TASK, async ({ data, error }) => {
  if (error) return;
  try {
    await ensureMigrated();
    await onProbeFixes(data?.locations ?? []);
  } catch (e) {
    logDiagnostic('probe_failed', { error: String((e as Error)?.message ?? e).slice(0, 200) });
  }
});

async function onProbeFixes(locations: LocationObject[], now = Date.now()) {
  const p = getProbe();
  if (!p || now > p.until || getActiveTrip(db)) {
    await stopProbe(false, now);
    if (p && now > p.until) logDiagnostic('probe_none', { since: p.startedAt });
    return;
  }
  const engine = getKV<EngineState | null>(db, 'engine', null);
  const onFoot = engine?.activity ? ON_FOOT.has(engine.activity) : false;
  let origin = p.origin;
  for (const l of locations) {
    const fix = { lat: l.coords.latitude, lng: l.coords.longitude, ts: l.timestamp, accuracy: l.coords.accuracy ?? 999 };
    if (fix.ts < p.startedAt || fix.accuracy > PROBE_MAX_ACCURACY_M) continue;
    if (!origin) {
      origin = fix;
      setProbe({ ...p, origin });
      continue;
    }
    if (probeSaysDriving(origin, fix, onFoot)) {
      await stopProbe(true, now);
      const row = await startGpsTrip({ startedBy: 'auto', at: p.startedAt, askNotifications: false });
      // The check's first and latest fixes are the drive's first miles.
      appendPoints(db, row.id, [origin, fix]);
      logDiagnostic('probe_drive', { since: p.startedAt, onFoot });
      return;
    }
  }
}

/** After an engine pass (runner): start a check when the phone just left 'still' and no Trip runs; end an old one. */
export async function syncProbe(input: { now: number; enabled: boolean; state: EngineState }): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { now, enabled, state } = input;
  const p = getProbe();
  if (p && (now > p.until || !enabled || getActiveTrip(db))) {
    await stopProbe(false, now);
    return;
  }
  const start = shouldStartProbe({
    now,
    enabled: enabled && hasActivityPermission(),
    tripActive: !!getActiveTrip(db),
    movedAt: state.movedAt,
    probeAfter: probeAfter(),
    probing: !!p,
  });
  if (!start) return;
  const until = now + PROBE_WINDOW_MS;
  setProbe({ startedAt: state.movedAt, until, origin: null });
  configureNative({ probeAfter: until });
  try {
    allowBackgroundLocationStart();
    await Location.startLocationUpdatesAsync(PROBE_TASK, {
      // Wifi / cell is enough to see 500 m; one fix every 30 s for at most 12 minutes.
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
