import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { Info } from '@/ui/icons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Region } from '@/domain/types';
import { FlagUK, FlagUS } from '@/features/entries/art';
import { OnboardingPage } from '@/features/entries/OnboardingTop';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { GUTTER, radius, useTheme } from '@/theme';
import { Button, SelectCircle, Txt } from '@/ui';

function deviceRegion(): Region | null {
  const code = getLocales()[0]?.regionCode;
  return code === 'GB' ? 'UK' : code === 'US' ? 'US' : null;
}

/** S-01b Choose your region. Pre-selected from the device locale; nothing selected outside UK/US. */
export default function RegionStep() {
  const { colors } = useTheme();
  const { settings, setRegion } = useSettings();
  const [pick, setPick] = useState<Region | null>(settings.region ?? deviceRegion());

  const options: { id: Region; title: string; sub: string; flag: ReactNode }[] = [
    { id: 'UK', title: t('onboarding.regionUK'), sub: t('onboarding.regionUKSub'), flag: <FlagUK /> },
    { id: 'US', title: t('onboarding.regionUS'), sub: t('onboarding.regionUSSub'), flag: <FlagUS /> },
  ];

  return (
    <OnboardingPage
      step={1}
      bottom={
        <Button
          label={t('common.continue')}
          full
          disabled={!pick}
          onPress={() => {
            if (!pick) return;
            setRegion(pick);
            router.push('/onboarding/categories');
          }}
        />
      }>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 20, gap: 18 }}>
        <Txt v="h1" accessibilityRole="header">
          {t('onboarding.regionTitle')}
        </Txt>
        <View accessibilityRole="radiogroup" style={{ gap: 18 }}>
          {options.map((o) => {
            const on = pick === o.id;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${o.title}. ${o.sub}`}
                onPress={() => setPick(o.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: 18,
                  borderRadius: radius.card,
                  backgroundColor: colors.surface,
                  borderWidth: on ? 2.5 : 1,
                  borderColor: on ? colors.primary : colors.line,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <View style={{ borderRadius: 5, overflow: 'hidden', marginTop: 2 }}>{o.flag}</View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt v="h3" style={{ fontSize: 19 }}>
                    {o.title}
                  </Txt>
                  <Txt v="small" c="textSecondary">
                    {o.sub}
                  </Txt>
                </View>
                <SelectCircle on={on} />
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Info size={20} color={colors.textSecondary} />
          <Txt v="small" c="textSecondary" style={{ flex: 1 }}>
            {t('onboarding.regionLater')}
          </Txt>
        </View>
      </ScrollView>
    </OnboardingPage>
  );
}
