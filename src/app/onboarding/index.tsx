import { router } from '@/services/router';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WelcomeArt } from '@/features/entries/art';
import { StepDots } from '@/features/entries/OnboardingTop';
import { t } from '@/i18n';
import { GUTTER, useTheme } from '@/theme';
import { Button, Txt } from '@/ui';
import { HintScroll } from '@/ui/HintScroll';

/** S-01a Welcome. No sign-in, by design. */
export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Short phone or big text: smaller art so the promise is readable above the button without scrolling.
  const { height, fontScale } = useWindowDimensions();
  const roomy = height / Math.max(1, fontScale) >= 700;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <HintScroll contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: roomy ? 48 : 16, gap: roomy ? 28 : 16 }}>
        <View style={{ alignItems: 'center' }}>
          <WelcomeArt scale={roomy ? 1 : 0.55} />
        </View>
        <View style={{ gap: 14 }}>
          <Txt v="h1" accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ fontSize: 34, lineHeight: 40 }}>
            {t('onboarding.welcomeTitle')}
          </Txt>
          <Txt c="textSecondary" style={{ fontSize: 17, lineHeight: 26 }}>
            {t('onboarding.welcomeBody')}
          </Txt>
        </View>
      </HintScroll>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 20, paddingTop: 12, gap: 20 }}>
        <StepDots step={1} />
        <Button label={t('onboarding.getStarted')} full onPress={() => router.push('/onboarding/region')} />
      </View>
    </View>
  );
}
