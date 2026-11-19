import { router } from '@/services/router';
import { ChevronLeft } from '@/ui/icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRO_PAUSED } from '@/domain/pro';
import { t } from '@/i18n';
import { GUTTER, useTheme } from '@/theme';
import { IconButton } from '@/ui';

/**
 * Onboarding steps S-01a…f (v2 mockup: the current step is a navy pill, the rest grey dots). While Pro is paused the
 * S-01e "Free & Pro" page is skipped: 5 steps, Reminder is step 5.
 */
export const ONBOARDING_STEPS = PRO_PAUSED ? 5 : 6;
/** Step number of S-01f Reminder (last page). */
export const REMINDER_STEP = ONBOARDING_STEPS;

/** Step dots: the current step is a navy pill (`wide` = earlier steps too). */
export function StepDots({ step, total = ONBOARDING_STEPS, wide }: { step: number; total?: number; wide?: boolean }) {
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

/** Onboarding page: back button, content, progress dots + pinned bottom actions (`step` = 1…ONBOARDING_STEPS, S-01a = 1). */
export function OnboardingPage({ step, children, bottom }: { step: number; children: ReactNode; bottom: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 6 }}>
        <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} />
      </View>
      {children}
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 12, paddingTop: 8, gap: 4 }}>
        <View style={{ paddingBottom: 14 }}>
          <StepDots step={step} />
        </View>
        {bottom}
      </View>
    </View>
  );
}
