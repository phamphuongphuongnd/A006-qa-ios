import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { db } from '@/db/client';
import { changeVehicleCostMethod } from '@/db/vehicleCostsRepo';
import type { VehicleCostMethod } from '@/domain/types';
import { VEHICLE_COST_METHODS } from '@/domain/vehicleCosts';
import { OnboardingPage } from '@/features/entries/OnboardingTop';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Button, SelectCircle, Sheet, Txt } from '@/ui';

/** S-01c How do you claim your vehicle? (product.md §5.3, P1-6). "Not sure yet" pre-selected. */
export default function VehicleStep() {
  const { colors } = useTheme();
  const { settings, update } = useSettings();
  const [pick, setPick] = useState<VehicleCostMethod>(settings.vehicleCostMethod ?? 'unsure');
  const [explain, setExplain] = useState(false);

  const hint = (m: VehicleCostMethod) =>
    m === 'mileage'
      ? settings.region === 'US'
        ? t('vehicle.onboarding.mileageUS')
        : t('vehicle.onboarding.mileageUK')
      : m === 'actual'
        ? t('vehicle.onboarding.actual')
        : t('vehicle.onboarding.unsure');

  const next = () => {
    // A fresh install has no Work data yet, so this never needs the "Change how you claim…" dialog.
    const r = changeVehicleCostMethod(db, pick, { confirmed: true });
    if (r.status === 'saved') update({ vehicleCostMethod: r.settings.vehicleCostMethod });
    router.push('/onboarding/categories');
  };

  return (
    <OnboardingPage step={3} bottom={<Button label={t('common.continue')} full onPress={next} />}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 20, gap: 16 }}>
        <Txt v="h1" accessibilityRole="header">
          {t('vehicle.onboarding.title')}
        </Txt>
        <View accessibilityRole="radiogroup" style={{ gap: 14 }}>
          {VEHICLE_COST_METHODS.map((m) => {
            const on = pick === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${t(`vehicle.method.${m}`)}. ${hint(m)}`}
                onPress={() => setPick(m)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: 16,
                  borderRadius: radius.card,
                  backgroundColor: colors.surface,
                  borderWidth: on ? 2.5 : 1,
                  borderColor: on ? colors.primary : colors.line,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <SelectCircle on={on} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt v="h3">{t(`vehicle.method.${m}`)}</Txt>
                  <Txt v="small" c="textSecondary">
                    {hint(m)}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="link" onPress={() => setExplain(true)} hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
          <Txt c="work" style={{ fontFamily: fonts.bold }}>{t('vehicle.onboarding.difference')}</Txt>
        </Pressable>
      </ScrollView>
      <Sheet
        visible={explain}
        onClose={() => setExplain(false)}
        title={t('vehicle.onboarding.difference')}
        footer={<Button label={t('vehicle.onboarding.gotIt')} full onPress={() => setExplain(false)} />}>
        {(['diffMileage', 'diffActual', 'diffOnTop', 'diffKeep'] as const).map((k) => (
          <Txt key={k}>{t(`vehicle.onboarding.${k}`)}</Txt>
        ))}
        <Txt v="small" c="textSecondary">
          {t('vehicle.onboarding.estimate')}
        </Txt>
      </Sheet>
    </OnboardingPage>
  );
}
