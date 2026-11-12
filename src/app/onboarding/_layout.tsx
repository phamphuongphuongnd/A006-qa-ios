import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** S-01a–d. Every step draws its own top bar (back + progress dots) from the mockup. */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
