import * as BackgroundTask from 'expo-background-task';
import { Directory } from 'expo-file-system';
import * as Location from 'expo-location';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { PermissionsAndroid, ScrollView } from 'react-native';

import { db } from '@/db/client';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { PROBE_TASK, writeProbeFile } from '@/dev/probeTask';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { Button, Screen, Txt } from '@/ui';

import { TripDetect } from '../../../modules/trip-detect';

/**
 * P3 risk checks on a real phone (dev builds only; release redirects home). Open with
 * `adb shell am start -a android.intent.action.VIEW -d sundaysort://dev/probe`.
 */
export default function Probe() {
  const [log, setLog] = useState<string[]>([]);
  const { settings, update } = useSettings();
  if (!__DEV__) return <Redirect href="/" />;
  const say = (s: string) => {
    console.log(`[probe] ${s}`);
    setLog((l) => [`${new Date().toLocaleTimeString()} ${s}`, ...l].slice(0, 40));
  };
  const run = (label: string, fn: () => Promise<unknown> | unknown) => async () => {
    try {
      const r = await fn();
      say(`${label}: ok ${r === undefined ? '' : JSON.stringify(r)}`);
    } catch (e) {
      say(`${label}: FAIL ${String(e)}`);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <Txt v="h2">P3 probe</Txt>
        {/* Walk the v2 onboarding again on a phone with data: keeps entries, region and settings. */}
        <Button label="Replay onboarding (keeps data)" variant="outline" onPress={() => {
            update({ onboarded: false });
            setTimeout(() => router.replace('/onboarding'), 300);
          }}
        />
        <Txt v="small">Onboarded: {String(settings.onboarded)} · Reminder now: {JSON.stringify(settings.reminder)} · vehicle: {settings.vehicleCostMethod}</Txt>
        <Txt>Folder: {getSettings(db).backupFolder?.uri ?? '—'}</Txt>
        <Button
          label="Pick folder"
          onPress={run('pick', async () => {
            const d = await Directory.pickDirectoryAsync();
            updateSettings(db, { backupFolder: { uri: d.uri, label: d.name ?? '', bookmark: null } });
            return d.uri;
          })}
        />
        <Button label="Write now (foreground)" onPress={run('write fg', () => writeProbeFile('foreground'))} />
        <Button label="Register background task" onPress={run('register', () => BackgroundTask.registerTaskAsync(PROBE_TASK, { minimumInterval: 15 }))} />
        <Button label="Unregister background task" onPress={run('unregister', () => BackgroundTask.unregisterTaskAsync(PROBE_TASK))} />
        <Button label="Background status" onPress={run('status', () => BackgroundTask.getStatusAsync())} />
        <Button
          label="Activity permission"
          onPress={run('perm', async () => {
            const loc = await Location.requestMotionActivityPermissionsAsync();
            const bt = await PermissionsAndroid.request('android.permission.BLUETOOTH_CONNECT');
            return { motion: loc.status, bt };
          })}
        />
        <Button label="Start transitions + sampling 10s" onPress={run('start', async () => {
          await TripDetect?.startTransitions();
          await TripDetect?.startSampling(10_000);
          return !!TripDetect;
        })} />
        <Button label="Stop sampling" onPress={run('stop sampling', () => TripDetect?.stopSampling())} />
        <Button label="Current activity (expo-location)" onPress={run('now', () => Location.getMotionActivityAsync())} />
        <Button label="Events (last 2h)" onPress={run('events', () => TripDetect?.getRecentEvents(sinceTwoHours()).slice(-12))} />
        <Button label="Bonded devices / charging" onPress={run('bt', () => ({ devices: TripDetect?.getBondedDevices(), charging: TripDetect?.isCharging() }))} />
        {log.map((l, i) => (
          <Txt key={i} v="caption">
            {l}
          </Txt>
        ))}
      </ScrollView>
    </Screen>
  );
}

const sinceTwoHours = () => Date.now() - 2 * 3600_000;
