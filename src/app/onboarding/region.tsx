import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import type { Region } from '@/domain/types';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { radius, spacing, type, useTheme } from '@/theme';

function deviceRegion(): Region | null {
  const code = getLocales()[0]?.regionCode;
  return code === 'GB' ? 'UK' : code === 'US' ? 'US' : null;
}

/** S-01b Choose your region. */
export default function RegionStep() {
  const { colors } = useTheme();
  const { settings, setRegion } = useSettings();
  const [pick, setPick] = useState<Region | null>(settings.region ?? deviceRegion());

  const options: { id: Region; title: string; sub: string }[] = [
    { id: 'UK', title: t('onboarding.regionUK'), sub: t('onboarding.regionUKSub') },
    { id: 'US', title: t('onboarding.regionUS'), sub: t('onboarding.regionUSSub') },
  ];

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[type.title, { color: colors.text }]} accessibilityRole="header">
        {t('onboarding.regionTitle')}
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: spacing.md }}>
        {options.map((o) => {
          const on = pick === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPick(o.id)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: on ? colors.primary : colors.border, borderWidth: on ? 2 : 1 }]}>
              <Text style={[type.heading, { color: colors.text }]}>{o.title}</Text>
              <Text style={[type.caption, { color: colors.textMuted }]}>{o.sub}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[type.caption, { color: colors.textMuted }]}>{t('onboarding.regionLater')}</Text>
      <View style={{ flex: 1 }} />
      <Button
        label={t('common.continue')}
        disabled={!pick}
        onPress={() => {
          if (!pick) return;
          setRegion(pick);
          router.push('/onboarding/categories');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  card: { padding: spacing.md, borderRadius: radius.card, gap: spacing.xs, minHeight: 72 },
});
