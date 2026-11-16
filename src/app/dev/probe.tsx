import * as BackgroundTask from 'expo-background-task';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { PermissionsAndroid, ScrollView } from 'react-native';

import { db } from '@/db/client';
import { setDevFakePro } from '@/db/proRepo';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { PROBE_TASK, writeProbeFile } from '@/dev/probeTask';
import { folderPort } from '@/features/backup/folder';
import { deleteTestTrips, seedTestTrips } from '@/dev/seedTrips';
import { router } from '@/services/router';
import { usePro } from '@/state/pro';
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
  const { status: proNow } = usePro();
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
        {/* P5: test Pro-only flows on the A13 without using its one-time trial. */}
        <Txt v="small">Pro now: {proNow.kind}</Txt>
        <Button label="Pretend Pro (dev): trial" variant="outline" onPress={() => setDevFakePro(db, 'trial')} />
        <Button label="Pretend Pro (dev): subscribed" variant="outline" onPress={() => setDevFakePro(db, 'pro')} />
        <Button label="Pretend Pro (dev): expired" variant="outline" onPress={() => setDevFakePro(db, 'expired')} />
        <Button label="Pretend Pro (dev): off (real state)" variant="outline" onPress={() => setDevFakePro(db, null)} />
        <Button label="Seed ZZ test trips (100+ mi, auto unsorted)" variant="outline" onPress={run('seed trips', () => seedTestTrips(db))} />
        <Button label="Delete ZZ test trips" variant="outline" onPress={run('delete trips', () => deleteTestTrips(db))} />
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
        <Button
          label="Port put test (B-45)"
          onPress={run('port', async () => {
            const port = folderPort(getSettings(db).backupFolder);
            if (!port) return 'no folder';
            const names = (await port.list()).map((f) => f.name);
            const src = new File(Paths.cache, 'ZZ-port-test.txt');
            src.write('port test ' + new Date().toISOString());
            try {
              await port.put(src.uri, 'ZZ-port-test.txt');
            } catch (e) {
              return { names, put: String(e) };
            }
            const before = (await port.list()).filter((f) => f.name === 'ZZ-port-test.txt').length;
            let rm = 'ok';
            try {
              await port.remove('ZZ-port-test.txt');
            } catch (e) {
              rm = String(e);
            }
            await new Promise((r) => setTimeout(r, 1500));
            const after = (await port.list()).filter((f) => f.name === 'ZZ-port-test.txt').length;
            return { put: 'ok', before, rm, after };
          })}
        />
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
