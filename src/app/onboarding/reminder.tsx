import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { spacing, type, useTheme } from '@/theme';

/**
 * S-01d Weekly reminder. Day/time picker and the notification permission request are built in F-17;
 * for now both buttons finish onboarding (reminder flag only).
 */
export default function ReminderStep() {
  const { colors } = useTheme();
  const { settings, update } = useSettings();
  const finish = (on: boolean) => update({ onboarded: true, reminder: { ...settings.reminder, on } });
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[type.title, { color: colors.text }]} accessibilityRole="header">
        {t('onboarding.reminderTitle')}
      </Text>
      <Text style={[type.heading, { color: colors.textMuted }]}>Sun · 18:00</Text>
      <View style={{ flex: 1 }} />
      <Button label={t('onboarding.reminderOn')} onPress={() => finish(true)} />
      <Button label={t('common.notNow')} variant="text" onPress={() => finish(false)} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flex: 1, padding: spacing.lg, gap: spacing.md } });
