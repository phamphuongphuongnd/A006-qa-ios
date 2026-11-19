import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppSettings, MergeStopMinutes } from '@/db/settingsRepo';
import { useNow } from '@/features/entries/useNow';
import { openPro } from '@/features/pro/openPro';
import { autoTripsSupported, bondedDevices, isSamsung, nativeHealth, simulateSignal, type TripDetectHealth } from '@/features/trips/auto/native';
import { getAutoFlags, processAutoSignals, syncAutoDetection } from '@/features/trips/auto/runner';
import { autoPausedBy } from '@/features/trips/autoState';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Divider, Group, Segmented, Sheet, StatusDot, Toggle, Txt } from '@/ui';
import { Bluetooth, ChevronLeft, ChevronRight, Clock, Zap } from '@/ui/icons';

const MERGE: MergeStopMinutes[] = [10, 20, 45];

function agoText(at: number, now: number) {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return t('autoTrip.justNow');
  if (min < 60) return t('autoTrip.agoMin', { n: min });
  return t('autoTrip.agoH', { n: Math.floor(min / 60) });
}

/** Status line: ok / attention / off, always visible (S-07d). */
export function autoStatus(on: boolean, h: TripDetectHealth | null, lastRunAt: number, now: number) {
  if (!on) return { kind: 'off' as const, label: t('autoTrip.stOff'), fix: false };
  if (autoPausedBy(h)) {
    const perm = h && (!h.activityPermission || !h.backgroundLocation);
    return { kind: 'warn' as const, label: perm ? t('autoTrip.stPausedPerm') : t('autoTrip.stPaused'), fix: true };
  }
  if (h?.batteryOptimized) return { kind: 'warn' as const, label: t('autoTrip.stMayMiss'), fix: true };
  return {
    kind: 'ok' as const,
    label: lastRunAt ? t('autoTrip.stWorking', { ago: agoText(lastRunAt, now) }) : t('autoTrip.stWorkingNew'),
    fix: false,
  };
}

const needsSetup = (h: TripDetectHealth | null) => !!h && (!h.activityPermission || !h.backgroundLocation);

/** What the orange card says. iOS has no battery-saving pause, only permissions and Background App Refresh (B-95). */
function fixText(h: TripDetectHealth | null, samsung: boolean) {
  if (Platform.OS === 'ios') return needsSetup(h) ? t('autoTrip.iosPermNote') : t('autoTrip.iosRefreshNote');
  if (h?.batteryOptimized && !autoPausedBy(h)) return t('autoTrip.stMayMiss');
  return samsung ? t('autoTrip.samsungMayPause') : t('autoTrip.phoneMayPause');
}

/** S-07d Automatic trips [Pro]. */
export default function AutoTripsScreen() {
  const { settings, update } = useSettings();
  const { pro } = usePro();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [health, setHealth] = useState(() => nativeHealth());
  const [flags, setFlags] = useState(() => getAutoFlags());
  const [btOpen, setBtOpen] = useState(false);
  const refresh = useCallback(() => {
    setHealth(nativeHealth());
    setFlags(getAutoFlags());
  }, []);
  useFocusEffect(refresh);

  const supported = autoTripsSupported();
  // A phone that can't tell driving (iPhone without motion chip, simulator) never shows "Working".
  const on = settings.autoTrips && pro && supported;
  const now = useNow(60_000);
  const st = autoStatus(on, health, flags.lastRunAt, now);
  const android = Platform.OS === 'android';
  const samsung = isSamsung();
  const vanAddress = settings.vanBtDevice?.address ?? null;
  // Phương 19/11: headphones picked as the van would start a trip whenever they connect.
  const vanIsPersonal = useMemo(
    () => (android && vanAddress ? bondedDevices().find((d) => d.address === vanAddress)?.kind === 'personal' : false),
    [android, vanAddress],
  );

  const apply = async (patch: Partial<AppSettings>) => {
    update(patch);
    await syncAutoDetection();
    refresh();
  };

  const onToggle = async (v: boolean) => {
    if (!pro) {
      openPro('auto_trips');
      return;
    }
    if (v) {
      update({ autoTrips: true });
      router.push('/trip/setup');
      return;
    }
    await apply({ autoTrips: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ModalHeader
        icon={ChevronLeft}
        iconLabel={t('common.back')}
        onIcon={() => (router.canGoBack() ? router.back() : router.replace('/miles'))}
        title={t('autoTrip.title')}
        right={<Badge kind="pro" label={t('pro.badge')} />}
      />
      <ScrollBody>
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="h3">{t('autoTrip.record')}</Txt>
              {pro ? (
                <StatusDot kind={st.kind} label={st.label} />
              ) : (
                <Txt v="small" c="textSecondary">
                  {t('autoTrip.lockedSub')}
                </Txt>
              )}
            </View>
            {pro ? (
              <Toggle value={on} onChange={onToggle} label={t('autoTrip.record')} disabled={!supported} />
            ) : (
              <Button label={t('pro.badge')} size="sm" variant="outline" onPress={() => openPro('auto_trips')} />
            )}
          </View>
          {!supported ? (
            <Txt v="small" c="textSecondary">
              {t('autoTrip.notSupported')}
            </Txt>
          ) : null}
        </Card>

        {pro && on && st.fix ? (
          <Card variant="warn" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt v="body" style={{ flex: 1 }}>
              {fixText(health, samsung)}
            </Txt>
            <Button
              label={needsSetup(health) ? t('autoTrip.finishSetup') : android ? t('autoTrip.fix') : t('autoTrip.openIosSettings')}
              size="sm"
              onPress={() => {
                if (needsSetup(health)) router.push('/trip/setup');
                else if (android) router.push('/trip/battery');
                // iOS: Background App Refresh lives in the app's Settings page.
                else Linking.openSettings().catch(() => {});
              }}
            />
          </Card>
        ) : null}

        <Txt v="label" c="textSecondary" style={{ marginTop: 8 }}>
          {t('autoTrip.startFaster').toUpperCase()}
        </Txt>
        {android ? (
          <Group>
            <Row
              icon={<Bluetooth size={20} color={colors.textSecondary} />}
              title={t('autoTrip.vanBt')}
              sub={settings.vanBtDevice?.name ?? settings.vanBtDevice?.address ?? t('autoTrip.vanBtNone')}
              warn={vanIsPersonal ? t('autoTrip.btNotVan') : undefined}
              right={<ChevronRight size={20} color={colors.textTertiary} />}
              onPress={() => setBtOpen(true)}
            />
            <Divider />
            <Row
              icon={<Zap size={20} color={colors.textSecondary} />}
              title={t('autoTrip.startCharging')}
              right={<Toggle value={settings.startOnCharge} onChange={(v) => apply({ startOnCharge: v })} label={t('autoTrip.startCharging')} />}
            />
          </Group>
        ) : (
          <Txt v="small" c="textSecondary">
            {t('autoTrip.iosNote')}
          </Txt>
        )}

        <Txt v="label" c="textSecondary" style={{ marginTop: 8 }}>
          {t('autoTrip.mergeTitle').toUpperCase()}
        </Txt>
        <Segmented
          accessibilityLabel={t('autoTrip.mergeTitle')}
          options={MERGE.map((n) => ({ value: String(n), label: t('autoTrip.min', { n }) }))}
          value={String(settings.mergeStopMinutes)}
          onChange={(v) => apply({ mergeStopMinutes: Number(v) as MergeStopMinutes })}
        />
        <Txt v="small" c="textSecondary">
          {t('autoTrip.mergeHint')}
        </Txt>

        <Group>
          <Row
            icon={<Clock size={20} color={colors.textSecondary} />}
            title={t('autoTrip.workHours')}
            sub={t('autoTrip.workHoursSub')}
            right={<ChevronRight size={20} color={colors.textTertiary} />}
            onPress={() => router.push('/trip/work-hours')}
          />
        </Group>

        {android ? (
          <Pressable accessibilityRole="link" onPress={() => router.push('/trip/battery')} style={{ paddingVertical: 12 }}>
            <Txt v="body" c="work">
              {samsung ? t('autoTrip.batteryTips') : t('autoTrip.batteryTipsGeneric')}
            </Txt>
          </Pressable>
        ) : null}

        {__DEV__ && supported ? <DevTools vanAddress={settings.vanBtDevice?.address ?? null} onDone={refresh} /> : null}
      </ScrollBody>

      <VanBluetoothSheet
        visible={btOpen}
        onClose={() => setBtOpen(false)}
        current={settings.vanBtDevice?.address ?? null}
        onPick={async (d) => {
          setBtOpen(false);
          await apply({ vanBtDevice: d });
        }}
      />
    </View>
  );
}

function ScrollBody({ children }: { children: React.ReactNode }) {
  return <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>{children}</ScrollView>;
}

function Row({
  icon,
  title,
  sub,
  warn,
  right,
  onPress,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  /** Phương 19/11: e.g. headphones picked as the van. */
  warn?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, sub, warn].filter(Boolean).join('. ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 }, pressed && { opacity: 0.7 }]}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="body">{title}</Txt>
        {sub ? (
          <Txt v="small" c="textSecondary">
            {sub}
          </Txt>
        ) : null}
        {warn ? (
          <Txt v="small" c="sunText">
            {warn}
          </Txt>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

function VanBluetoothSheet({
  visible,
  onClose,
  current,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  current: string | null;
  onPick: (d: { address: string; name: string | null } | null) => void;
}) {
  const [devices, setDevices] = useState(() => bondedDevices());
  const [asked, setAsked] = useState(false);
  const allow = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      await PermissionsAndroid.request('android.permission.BLUETOOTH_CONNECT' as never).catch(() => null);
    }
    setAsked(true);
    setDevices(bondedDevices());
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={t('autoTrip.btTitle')}>
      <Txt v="small" c="textSecondary">
        {t('autoTrip.btSub')}
      </Txt>
      {devices.length === 0 ? (
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <Txt v="body">{t('autoTrip.btNone')}</Txt>
          {!asked ? <Button label={t('autoTrip.btAllow')} variant="outline" onPress={allow} /> : null}
        </View>
      ) : (
        devices.map((d) => (
          <Row
            key={d.address}
            title={d.name ?? d.address}
            sub={d.address === current ? '✓' : undefined}
            warn={d.kind === 'personal' ? t('autoTrip.btNotVan') : undefined}
            onPress={() => onPick({ address: d.address, name: d.name })}
          />
        ))
      )}
      {current ? <Button label={t('autoTrip.btClear')} variant="text" onPress={() => onPick(null)} /> : null}
    </Sheet>
  );
}

/** Dev builds only: push fake signals through the real native → headless JS path (adb / A13 checks). */
function DevTools({ vanAddress, onDone }: { vanAddress: string | null; onDone: () => void }) {
  const fire = (kind: string, activity: string | null = null, transition: string | null = null, address: string | null = null) => {
    simulateSignal(kind, activity, transition, address);
    setTimeout(() => {
      processAutoSignals().then(onDone);
    }, 1500);
  };
  return (
    <Card style={{ gap: 8, marginTop: 16 }}>
      <Txt v="label" c="textSecondary">
        {t('autoTrip.dev')}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button size="sm" variant="outline" label="driving enter" onPress={() => fire('activity', 'driving', 'enter')} />
        <Button size="sm" variant="outline" label="still enter" onPress={() => fire('activity', 'still', 'enter')} />
        <Button size="sm" variant="outline" label="walking enter" onPress={() => fire('activity', 'walking', 'enter')} />
        <Button size="sm" variant="outline" label="van BT" onPress={() => fire('bt_connected', null, null, vanAddress ?? 'AA:BB:CC:DD:EE:FF')} />
        <Button size="sm" variant="outline" label="wake" onPress={() => fire('wake')} />
      </View>
    </Card>
  );
}
