// QA-100 B-88: a real evening drive produced no automatic trip and a release build can't be read over adb (no run-as).
// "Share trip diagnostics" (Settings → long-press the version line) packs what the detector saw into one JSON file the
// driver can send: native signals (activity transitions, Bluetooth, wake, boot — kept by the native ring buffer), the
// engine state, permissions, Pro, settings and recent trips. Read-only: it changes nothing about detection.
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { getProStatus } from '@/db/proRepo';
import { getSettings } from '@/db/settingsRepo';
import { listTrips } from '@/db/tripsRepo';

import { getAutoFlags } from './runner';
import { hasActivityPermission, nativeHealth, readSignals } from './native';
import { getKV } from './repo';

const DAYS = 7;

export async function buildTripDiagnostics(now = Date.now()) {
  const s = getSettings(db);
  const [fg, bg] = await Promise.all([
    Location.getForegroundPermissionsAsync().catch(() => null),
    Location.getBackgroundPermissionsAsync().catch(() => null),
  ]);
  const trips = listTrips(db)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 30)
    .map((t) => ({
      startedAt: new Date(t.startedAt).toISOString(),
      endedAt: t.endedAt ? new Date(t.endedAt).toISOString() : null,
      miles: Math.round((t.distanceM / 1609.344) * 10) / 10,
      status: t.status,
      source: t.source,
      startedBy: t.startedBy,
      scope: t.scope,
      classifiedBy: t.classifiedBy,
    }));
  return {
    kind: 'sundaysort-trip-diagnostics',
    generatedAt: new Date(now).toISOString(),
    app: { version: Constants.expoConfig?.version ?? null, platform: Platform.OS, os: String(Platform.Version) },
    pro: getProStatus(db, now).kind,
    settings: {
      autoTrips: s.autoTrips,
      startOnCharge: s.startOnCharge,
      vanBtDevice: s.vanBtDevice ? 'set' : null,
      mergeStopMinutes: s.mergeStopMinutes,
      workHours: s.workHours,
    },
    permissions: {
      location: fg ? { granted: fg.granted, android: fg.android ?? null, ios: fg.ios ?? null } : null,
      background: bg ? bg.granted : null,
      activity: hasActivityPermission(),
    },
    health: nativeHealth(),
    engine: getKV<unknown>(db, 'engine', null),
    flags: getAutoFlags(),
    signals: readSignals(now - DAYS * 86_400_000).map((x) => ({ ...x, time: new Date(x.at).toISOString() })),
    trips,
  };
}

/** Writes the JSON to the cache folder and opens the share sheet. */
export async function shareTripDiagnostics(): Promise<void> {
  const data = await buildTripDiagnostics();
  const stamp = data.generatedAt.slice(0, 16).replace(/[:T]/g, '-');
  const f = new File(Paths.cache, `SundaySort-trip-diagnostics-${stamp}.json`);
  f.create({ overwrite: true });
  f.write(JSON.stringify(data, null, 1));
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Trip diagnostics' });
}
