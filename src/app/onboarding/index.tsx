import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/ui';
import { t } from '@/i18n';
import { spacing, type, useTheme } from '@/theme';

/** S-01a Welcome. Visual polish comes from the mockup. */
export default function Welcome() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={styles.body}>
        <Text style={[type.h1, { color: colors.text, fontSize: 30 }]} accessibilityRole="header">
          {t('onboarding.welcomeTitle')}
        </Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>{t('onboarding.welcomeBody')}</Text>
      </View>
      <Button label={t('onboarding.getStarted')} onPress={() => router.push('/onboarding/region')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
