import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { GUTTER, useTheme } from '@/theme';
import { IconButton } from '@/ui';

/** Step dots: the current and earlier steps are navy pills. `wide` = 24dp pills (S-01b–d), else S-01a's dot row. */
export function StepDots({ step, total, wide }: { step: number; total: number; wide?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const on = wide ? i < step : i === step - 1;
        return <View key={i} style={{ width: wide || on ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: on ? colors.primary : colors.lineStrong }} />;
      })}
    </View>
  );
}

/** Onboarding page: back button + progress dots, content, pinned bottom actions. */
export function OnboardingPage({ step, children, bottom }: { step: 1 | 2 | 3; children: ReactNode; bottom: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 6 }}>
        <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} />
        <StepDots step={step} total={3} wide />
        <View style={{ width: 48 }} />
      </View>
      {children}
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 12, gap: 4 }}>{bottom}</View>
    </View>
  );
}
