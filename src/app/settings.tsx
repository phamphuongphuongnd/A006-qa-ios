import Constants from 'expo-constants';
import { type Href } from 'expo-router';
import { router } from '@/services/router';
import * as WebBrowser from 'expo-web-browser';
import { CloudUpload, Download, Lock, RotateCcw, Tag as TagIcon, Trash2 } from '@/ui/icons';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { count } from 'drizzle-orm';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { convertAllTo, countNotIn, entryCount } from '@/db/entriesRepo';
import { recurring, rules } from '@/db/schema';
import type { AppSettings } from '@/db/settingsRepo';
import { changeVehicleCostMethod } from '@/db/vehicleCostsRepo';
import { VEHICLE_COST_METHODS } from '@/domain/vehicleCosts';
import { currencySymbol, parseRate } from '@/domain/money';
import { currencyOf, type Region, type Scope, type VehicleCostMethod } from '@/domain/types';
import { deleteAllReceiptFiles } from '@/features/backup/backupFile';
import { wipeAllData } from '@/features/backup/dataStore';
import { stopOrphanRecording } from '@/features/trips/controller';
import { formatRate, ratesOn, type RateTier } from '@/domain/mileage';
import { ABOUT_LINKS, openRate, rateUrl } from '@/features/settings/about';
import { authenticate, deviceCanLock } from '@/features/settings/LockedView';
import { cancelSortReminders } from '@/features/settings/notifications';
import { backupDue, daysSince, timeLabel, WEEKDAYS } from '@/features/settings/reminder';
import { GroupLabel, NavHeader, NavRow, OptionSheet, Pill, type Option } from '@/features/settings/ui';
import { listSavedTrips } from '@/features/savedTrips/repo';
import { trashCount } from '@/features/trash/repo';
import { t, tn } from '@/i18n';
import { ProCard } from '@/features/settings/ProCard';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Badge, Dialog, Field, Group, Segmented, Sheet, Toggle, Txt } from '@/ui';

type Picker = 'region' | 'scope' | 'unit' | 'lockAfter' | 'vehicle' | 'odometer' | null;

const LOCK_AFTER: Option<AppSettings['lockAfterMs']>[] = [
  { value: 0, label: 'Immediately' },
  { value: 60_000, label: 'After 1 minute' },
  { value: 300_000, label: 'After 5 minutes' },
];

/** S-15 Settings. */
/** Rates in force today, e.g. "45p / 25p" or "$0.76". */
const currentRatesText = (rates: RateTier[], currency: 'GBP' | 'USD') =>
  ratesOn(rates, Date.now())
    .map((x) => formatRate(x.minorPerMile, currency))
    .join(' / ');

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, setRegion } = useSettings();
  const region: Region = settings.region ?? 'UK';
  const [picker, setPicker] = useState<Picker>(null);
  const [regionAsk, setRegionAsk] = useState<Region | null>(null);
  // B-14: entries in the old currency are converted at a rate the user types (the app has no network).
  const [convertCount, setConvertCount] = useState(0);
  const [rateText, setRateText] = useState('');
  const [rateError, setRateError] = useState(false);
  const [howSheet, setHowSheet] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteText, setDeleteText] = useState('');
  const [canLock, setCanLock] = useState<boolean | null>(null);

  const categoryCount = useLive(() => listCategories(db).length, [], ['categories']);
  const counts = useLive(
    () => ({
      rules: db.select({ n: count() }).from(rules).get()?.n ?? 0,
      recurring: db.select({ n: count() }).from(recurring).get()?.n ?? 0,
    }),
    [],
    ['rules', 'recurring'],
  );
  const { pro } = usePro();
  const proLock = pro ? undefined : (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}>
      <Badge kind="pro" label={t('pro.badge')} />
    </View>
  );
  const [vehicleAsk, setVehicleAsk] = useState<VehicleCostMethod | null>(null);
  const pickVehicle = (to: VehicleCostMethod, confirmed = false) => {
    const res = changeVehicleCostMethod(db, to, { confirmed });
    if (res.status === 'needs_confirm') setTimeout(() => setVehicleAsk(to), Platform.OS === 'ios' ? 400 : 0);
    else if (res.status === 'saved') update({ vehicleCostMethod: to });
  };
  const hasData = useLive(() => entryCount(db) > 0, [], ['entries']);
  const trashItems = useLive(() => trashCount(db), [], ['trash']);
  const regularCount = useLive(() => listSavedTrips(db).length, [], ['saved_trips']);

  useEffect(() => {
    let live = true;
    deviceCanLock().then((ok) => live && setCanLock(ok));
    return () => {
      live = false;
    };
  }, []);

  const lockLabels = [t('settings.lockImmediately'), t('settings.lock1'), t('settings.lock5')];
  const lockOptions = LOCK_AFTER.map((o, i) => ({ ...o, label: lockLabels[i] }));
  const r = settings.reminder;

  const setAppLock = async (on: boolean) => {
    if (!on) {
      update({ appLock: false });
      return;
    }
    if (!(await deviceCanLock())) {
      setCanLock(false);
      return;
    }
    if (await authenticate(t('lock.enablePrompt'))) update({ appLock: true });
  };

  const deleteAll = async () => {
    setDeleteStep(0);
    setDeleteText('');
    wipeAllData(db);
    try {
      deleteAllReceiptFiles();
    } catch {
      // Files are unreachable without DB rows anyway; ignore.
    }
    await cancelSortReminders().catch(() => {});
    await stopOrphanRecording().catch(() => {});
    // Settings table is empty now → onboarded false → the navigator shows onboarding.
    update({});
  };

  const days = daysSince(settings.lastBackupAt);
  const due = backupDue(settings, hasData);
  const backupPill =
    days === null ? (
      <Pill label={t('settings.backupNever')} bg={due ? 'expenseSoft' : 'surfaceAlt'} fg={due ? 'expenseText' : 'textSecondary'} />
    ) : (
      <Pill label={tn('settings.backupDays', days, { days })} bg={due ? 'expenseSoft' : 'surfaceAlt'} fg={due ? 'expenseText' : 'textSecondary'} />
    );

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('screens.settings')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: insets.bottom + 32, gap: 8 }}>
        <ProCard />

        <GroupLabel>{t('settings.regionTax')}</GroupLabel>
        <Group>
          <NavRow title={t('settings.region')} value={t(`settings.${region}`)} onPress={() => setPicker('region')} />
          <NavRow title={t('settings.currency')} value={region === 'UK' ? t('settings.currencyGBP') : t('settings.currencyUSD')} />
          <NavRow title={t('settings.taxYear')} value={region === 'UK' ? t('settings.taxYearUK') : t('settings.taxYearUS')} />
          <NavRow title={t('vehicle.title')} value={t(`vehicle.method.${settings.vehicleCostMethod}`)} onPress={() => setPicker('vehicle')} />
          <NavRow
            title={t('settings.mileageRates')}
            value={currentRatesText(settings.mileageRates[region], region === 'UK' ? 'GBP' : 'USD')}
            onPress={() => router.push('/mileage-rates' as Href)}
          />
        </Group>

        <GroupLabel>{t('settings.logging')}</GroupLabel>
        <Group>
          <NavRow
            title={t('settings.defaultScope')}
            value={settings.defaultScope === 'work' ? t('common.work') : t('common.personal')}
            onPress={() => setPicker('scope')}
          />
          <NavRow
            title={t('settings.keepAdding')}
            right={<Toggle value={settings.keepAdding} onChange={(v) => update({ keepAdding: v })} label={t('settings.keepAdding')} />}
          />
          <NavRow
            title={t('settings.distanceUnit')}
            value={settings.distanceUnit === 'mi' ? t('settings.miles') : t('settings.kilometres')}
            onPress={() => setPicker('unit')}
          />
        </Group>

        <GroupLabel>{t('settingsV2.trips')}</GroupLabel>
        <Group>
          <NavRow title={t('settingsV2.autoTrips')} right={proLock} value={pro ? (settings.autoTrips ? t('settingsV2.on') : t('settingsV2.off')) : undefined} onPress={() => router.push('/trip/auto')} />
          {Platform.OS === 'android' ? (
            <NavRow title={t('settingsV2.nfcTag')} value={settings.nfcTagWritten ? t('settingsV2.nfcReady') : t('settingsV2.nfcNotSet')} onPress={() => router.push('/trip/nfc')} />
          ) : (
            <NavRow title={t('settingsV2.nfcTag')} onPress={() => router.push('/trip/nfc')} />
          )}
          <NavRow title={t('settingsV2.workHours')} value={settings.workHours.on ? t('settingsV2.on') : t('settingsV2.off')} onPress={() => router.push('/trip/work-hours')} />
          <NavRow title={t('tripCheck.setting')} value={t(`tripCheck.${settings.odometerCheck}`)} onPress={() => setPicker('odometer')} />
          <NavRow title={t('s6.regularTrips')} value={regularCount > 0 ? String(regularCount) : undefined} onPress={() => router.push('/regular-trips')} />
        </Group>

        <GroupLabel>{t('settingsV2.sorting')}</GroupLabel>
        <Group>
          <NavRow title={t('settingsV2.rules')} right={proLock} value={pro ? String(counts.rules) : undefined} onPress={() => router.push('/rules')} />
          <NavRow title={t('settingsV2.recurring')} right={proLock} value={pro ? String(counts.recurring) : undefined} onPress={() => router.push('/recurring')} />
          <NavRow icon={TagIcon} title={t('settings.categories')} value={String(categoryCount)} onPress={() => router.push('/categories')} />
        </Group>

        <GroupLabel>{t('settingsV2.notifications')}</GroupLabel>
        <Group>
          <NavRow title={t('settingsV2.notificationsRow')} value={r.on ? `${WEEKDAYS[r.weekday].slice(0, 3)} ${timeLabel(r.hour, r.minute)}` : t('settingsV2.remindersOff')} onPress={() => router.push('/notifications')} />
        </Group>

        <GroupLabel>{t('settings.security')}</GroupLabel>
        <Group>
          <View>
            <NavRow
              icon={Lock}
              title={t('settings.appLock')}
              right={
                <Toggle
                  value={settings.appLock}
                  onChange={setAppLock}
                  disabled={canLock === false && !settings.appLock}
                  label={t('settings.appLock')}
                />
              }
            />
            {canLock === false && !settings.appLock ? (
              <Txt v="small" c="textSecondary" style={{ paddingHorizontal: 16, paddingBottom: 12, marginTop: -4 }}>
                {t('lock.noLock')}
              </Txt>
            ) : null}
          </View>
          {settings.appLock ? (
            <NavRow
              title={t('settings.lockAfter')}
              value={lockOptions.find((o) => o.value === settings.lockAfterMs)?.label}
              onPress={() => setPicker('lockAfter')}
            />
          ) : null}
        </Group>

        <GroupLabel>{t('settings.yourData')}</GroupLabel>
        <Group>
          <NavRow icon={CloudUpload} title={t('settings.backup')} right={backupPill} onPress={() => router.push('/backup')} />
          <NavRow icon={Download} title={t('settings.export')} onPress={() => router.push('/export')} />
          <NavRow
            icon={RotateCcw}
            title={t('s6.trashTitle')}
            value={trashItems > 0 ? t('s6.trashCount', { count: trashItems }) : undefined}
            onPress={() => router.push('/recently-deleted')}
          />
          <NavRow icon={Trash2} title={t('settings.deleteAll')} danger onPress={() => setDeleteStep(1)} />
        </Group>

        <GroupLabel>{t('settings.appearance')}</GroupLabel>
        <Group>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Txt>{t('settings.theme')}</Txt>
            <View style={{ width: 228 }}>
              <Segmented<AppSettings['theme']>
                accessibilityLabel={t('settings.theme')}
                options={[
                  { value: 'system', label: t('settings.themeSystem') },
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                ]}
                value={settings.theme}
                onChange={(v) => update({ theme: v })}
              />
            </View>
          </View>
        </Group>

        <GroupLabel>{t('settings.about')}</GroupLabel>
        <Group>
          {[
            <NavRow key="how" title={t('settings.howItWorks')} onPress={() => setHowSheet(true)} />,
            ABOUT_LINKS.privacyUrl ? (
              <NavRow
                key="privacy"
                title={t('settings.privacy')}
                external
                onPress={() => WebBrowser.openBrowserAsync(ABOUT_LINKS.privacyUrl!)}
              />
            ) : null,
            <NavRow key="tax" title={t('settings.notTaxAdvice')} onPress={() => router.push('/disclaimer')} />,
            rateUrl() ? <NavRow key="rate" title={t('settings.rate')} onPress={() => openRate()} /> : null,
            ABOUT_LINKS.contactEmail ? (
              <NavRow key="contact" title={t('settings.contact')} onPress={() => Linking.openURL(`mailto:${ABOUT_LINKS.contactEmail}`)} />
            ) : null,
            <View key="version" style={{ minHeight: 56, justifyContent: 'center', paddingHorizontal: 16 }}>
              <Txt c="textSecondary">{t('settings.version', { version })}</Txt>
            </View>,
          ]}
        </Group>
      </ScrollView>

      <OptionSheet<Region>
        visible={picker === 'region'}
        title={t('settings.region')}
        options={[
          { value: 'UK', label: t('settings.UK'), sub: t('onboarding.regionUKSub') },
          { value: 'US', label: t('settings.US'), sub: t('onboarding.regionUSSub') },
        ]}
        value={region}
        onPick={(v) => {
          // iOS can't present the dialog while the sheet is still sliding away.
          if (v !== region) {
            setConvertCount(countNotIn(db, currencyOf(v)));
            setRateText('');
            setRateError(false);
            setTimeout(() => setRegionAsk(v), Platform.OS === 'ios' ? 400 : 0);
          }
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet<VehicleCostMethod>
        visible={picker === 'vehicle'}
        title={t('vehicle.title')}
        options={VEHICLE_COST_METHODS.map((m) => ({ value: m, label: t(`vehicle.method.${m}`), sub: t(`vehicle.methodHint.${m}`) }))}
        value={settings.vehicleCostMethod}
        onPick={(v) => pickVehicle(v)}
        onClose={() => setPicker(null)}
      />
      <Dialog
        visible={vehicleAsk !== null}
        title={t('vehicle.changeTitle')}
        body={region === 'US' ? t('vehicle.changeBodyUS') : t('vehicle.changeBody')}
        onClose={() => setVehicleAsk(null)}
        actions={[
          { label: t('settings.cancel'), onPress: () => setVehicleAsk(null) },
          {
            label: t('vehicle.change'),
            onPress: () => {
              if (vehicleAsk) pickVehicle(vehicleAsk, true);
              setVehicleAsk(null);
            },
          },
        ]}
      />
      <OptionSheet<Scope>
        visible={picker === 'scope'}
        title={t('settings.defaultScope')}
        options={[
          { value: 'work', label: t('common.work') },
          { value: 'personal', label: t('common.personal') },
        ]}
        value={settings.defaultScope}
        onPick={(v) => update({ defaultScope: v })}
        onClose={() => setPicker(null)}
      />
      <OptionSheet<AppSettings['distanceUnit']>
        visible={picker === 'unit'}
        title={t('settings.distanceUnit')}
        options={[
          { value: 'mi', label: t('settings.miles') },
          { value: 'km', label: t('settings.kilometres') },
        ]}
        value={settings.distanceUnit}
        onPick={(v) => update({ distanceUnit: v })}
        onClose={() => setPicker(null)}
      />
      <OptionSheet<AppSettings['odometerCheck']>
        visible={picker === 'odometer'}
        title={t('tripCheck.setting')}
        options={[
          { value: 'off', label: t('tripCheck.off') },
          { value: 'weekly', label: t('tripCheck.weekly'), sub: region === 'UK' ? t('tripCheck.weeklySubUK') : t('tripCheck.weeklySub') },
          { value: 'monthly', label: t('tripCheck.monthly'), sub: region === 'UK' ? t('tripCheck.monthlySubUK') : t('tripCheck.monthlySub') },
        ]}
        value={settings.odometerCheck}
        onPick={(v) => update({ odometerCheck: v })}
        onClose={() => setPicker(null)}
      />
      <OptionSheet<AppSettings['lockAfterMs']>
        visible={picker === 'lockAfter'}
        title={t('settings.lockAfter')}
        options={lockOptions}
        value={settings.lockAfterMs}
        onPick={(v) => update({ lockAfterMs: v })}
        onClose={() => setPicker(null)}
      />


      <Sheet visible={howSheet} onClose={() => setHowSheet(false)} title={t('settings.howItWorks')}>
        {[t('settings.how1'), t('settings.how2'), t('settings.how3'), t('settings.how4')].map((line, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="caption" c="sunText">
                {i + 1}
              </Txt>
            </View>
            <Txt style={{ flex: 1 }}>{line}</Txt>
          </View>
        ))}
        <Txt v="small" c="textSecondary">
          {t('common.estimateOnly')}
        </Txt>
      </Sheet>

      <Dialog
        visible={regionAsk !== null}
        title={t('settings.changeRegionTitle')}
        body={
          convertCount > 0 && regionAsk
            ? t(convertCount === 1 ? 'settings.changeRegionConvertOne' : 'settings.changeRegionConvert', {
                count: String(convertCount),
                from: currencySymbol(currencyOf(region)),
                to: currencySymbol(currencyOf(regionAsk)),
              })
            : t('settings.changeRegionBody')
        }
        onClose={() => setRegionAsk(null)}
        actions={[
          { label: t('settings.cancel'), onPress: () => setRegionAsk(null) },
          {
            label: t('settings.change'),
            variant: 'primary',
            onPress: () => {
              if (!regionAsk) return;
              if (convertCount > 0) {
                const rate = parseRate(rateText);
                if (rate === null) {
                  setRateError(true);
                  return;
                }
                convertAllTo(db, currencyOf(regionAsk), rate);
              }
              setRegion(regionAsk);
              setRegionAsk(null);
            },
          },
        ]}>
        {convertCount > 0 && regionAsk ? (
          <Field
            label={t('settings.rateLabel', { from: currencySymbol(currencyOf(region)), to: currencySymbol(currencyOf(regionAsk)) })}
            value={rateText}
            onChangeText={(v) => {
              setRateText(v);
              setRateError(false);
            }}
            keyboardType="decimal-pad"
            autoFocus
            placeholder={region === 'UK' ? 'e.g. 1.27' : 'e.g. 0.79'}
            error={rateError ? t('settings.rateError') : null}
          />
        ) : null}
      </Dialog>

      <Dialog
        visible={deleteStep === 1}
        title={t('settings.deleteAllTitle')}
        body={t('settings.deleteAllBody')}
        onClose={() => setDeleteStep(0)}
        actions={[
          { label: t('settings.cancel'), onPress: () => setDeleteStep(0) },
          { label: t('settings.deleteContinue'), variant: 'danger', onPress: () => setDeleteStep(2) },
        ]}
      />
      <Dialog
        visible={deleteStep === 2}
        title={t('settings.deleteTypeTitle')}
        body={t('settings.deleteTypeBody')}
        onClose={() => {
          setDeleteStep(0);
          setDeleteText('');
        }}
        actions={[
          {
            label: t('settings.cancel'),
            onPress: () => {
              setDeleteStep(0);
              setDeleteText('');
            },
          },
          {
            label: t('settings.deleteAll'),
            variant: 'danger',
            disabled: deleteText.trim() !== t('settings.deleteWord'),
            onPress: () => {
              if (deleteText.trim() === t('settings.deleteWord')) deleteAll();
            },
          },
        ]}>
        <Field
          value={deleteText}
          onChangeText={setDeleteText}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          placeholder={t('settings.deleteWord')}
          accessibilityLabel={t('settings.deleteTypeTitle')}
          style={{ fontFamily: fonts.extrabold, letterSpacing: 1.6 }}
        />
      </Dialog>
    </View>
  );
}
