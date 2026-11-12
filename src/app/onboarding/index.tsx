import { router } from '@/services/router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WelcomeArt } from '@/features/entries/art';
import { StepDots } from '@/features/entries/OnboardingTop';
import { t } from '@/i18n';
import { GUTTER, useTheme } from '@/theme';
import { Button, Txt } from '@/ui';

/** S-01a Welcome. No sign-in, by design. */
export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: 48, gap: 28 }}>
        <View style={{ alignItems: 'center' }}>
          <WelcomeArt />
        </View>
        <View style={{ gap: 14 }}>
          <Txt v="h1" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 40 }}>
            {t('onboarding.welcomeTitle')}
          </Txt>
          <Txt c="textSecondary" style={{ fontSize: 17, lineHeight: 26 }}>
            {t('onboarding.welcomeBody')}
          </Txt>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: Math.max(insets.bottom, 16) + 20, paddingTop: 12, gap: 20 }}>
        <StepDots step={1} total={4} />
        <Button label={t('onboarding.getStarted')} full onPress={() => router.push('/onboarding/region')} />
      </View>
    </View>
  );
}
