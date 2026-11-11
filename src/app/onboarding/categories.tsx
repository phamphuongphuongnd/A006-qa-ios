import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { t } from '@/i18n';
import { radius, spacing, type, useTheme } from '@/theme';

/** S-01c Your categories. Read-only preview. */
export default function CategoriesStep() {
  const { colors } = useTheme();
  const all = listCategories(db);
  const section = (label: string, kind: 'income' | 'expense') => (
    <View style={{ gap: spacing.sm }}>
      <Text style={[type.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.chips}>
        {all
          .filter((c) => c.type === kind)
          .map((c) => (
            <Text key={c.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: c.color, color: colors.text }]}>
              {c.name}
            </Text>
          ))}
      </View>
    </View>
  );
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ gap: spacing.lg }}>
        <Text style={[type.title, { color: colors.text }]} accessibilityRole="header">
          {t('onboarding.categoriesTitle')}
        </Text>
        <Text style={[type.body, { color: colors.textMuted }]}>{t('onboarding.categoriesBody')}</Text>
        {section(t('common.income'), 'income')}
        {section(t('common.expenses'), 'expense')}
      </ScrollView>
      <Button label={t('onboarding.looksGood')} onPress={() => router.push('/onboarding/reminder')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1.5, borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, overflow: 'hidden' },
});
