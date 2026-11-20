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

import { folderProbe } from '@/features/backup/folder';
import { lastReceiptReadings } from '@/features/ocr/reader';

import { getAutoFlags } from './runner';
import { hasActivityPermission, nativeHealth, readRawSignals, readSignals } from './native';
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
    // QA-100 B-121: only the van's own Bluetooth device is named; any other device (headphones, a watch…) is kept as an
    // event without its name or address — the detector only ever cares whether it was the van.
    signals: readRawSignals(now - DAYS * 86_400_000).map((x) => {
      const out: Record<string, unknown> = { ...x, time: new Date(x.at).toISOString() };
      if ('address' in out) {
        const van = s.vanBtDevice?.address?.toUpperCase() ?? null;
        const isVan = !!van && typeof out.address === 'string' && out.address.toUpperCase() === van;
        out.address = isVan ? 'van' : out.address ? 'other device' : null;
        delete out.name;
      }
      return out;
    }),
    // iOS logs CoreMotion snapshots: also show the transitions the engine read from them (B-95).
    transitions:
      Platform.OS === 'ios'
        ? readSignals(now - DAYS * 86_400_000)
            .filter((x) => x.kind === 'activity')
            .map((x) => ({ ...x, time: new Date('eventAt' in x ? x.eventAt : x.at).toISOString() }))
        : undefined,
    trips,
    // A13-4: last receipt readings (raw OCR lines + parse) — read on the phone only, shared only with this file.
    receipts: lastReceiptReadings(),
    // A13: why the backup folder shows "not reachable" (provider + what listing it said), without changing anything.
    backup: await (async () => {
      const f = s.backupFolder;
      const provider = f ? (f.uri.match(/^content:\/\/([^/]+)/)?.[1] ?? f.uri.split(':')[0]) : null;
      return {
        folderSet: !!f,
        provider,
        nightly: s.backupNightly,
        failCount: s.backupFailCount,
        lastError: s.backupRun?.lastError ?? null,
        lastAutoBackupAt: s.lastAutoBackupAt ? new Date(s.lastAutoBackupAt).toISOString() : null,
        probe: f ? await folderProbe(f) : null,
      };
    })(),
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
