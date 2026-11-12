import { router } from 'expo-router';
import { Tag } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import type { EntryType } from '@/domain/types';
import { OnboardingPage } from '@/features/entries/OnboardingTop';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Txt } from '@/ui';

/** S-01c Your categories — read-only preview of the region's defaults. */
export default function CategoriesStep() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const all = useLive(() => listCategories(db), [], ['categories']);
  const form = settings.region === 'US' ? 'Schedule C' : 'SA103';

  const section = (label: string, kind: EntryType) => (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Txt v="label" c="textTertiary">
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {all
          .filter((c) => c.type === kind)
          .map((c) => (
            <View
              key={c.id}
              style={{
                minHeight: 36,
                borderRadius: 18,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: colors.lineStrong,
              }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kind === 'income' ? colors.income : colors.expense }} />
              <Txt style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>{c.name}</Txt>
            </View>
          ))}
      </View>
    </View>
  );

  return (
    <OnboardingPage step={2} bottom={<Button label={t('onboarding.looksGood')} full onPress={() => router.push('/onboarding/reminder')} />}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 20, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Txt v="h1" accessibilityRole="header">
            {t('onboarding.categoriesTitle')}
          </Txt>
          <Txt c="textSecondary">{t('onboarding.categoriesBody')}</Txt>
        </View>
        {section(t('common.income'), 'income')}
        {section(t('common.expenses'), 'expense')}
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceAlt, marginTop: 4 }}>
          <Tag size={20} color={colors.textSecondary} />
          <Txt v="small" c="textSecondary" style={{ flex: 1 }}>
            {t('onboarding.regionNote', { form })}
          </Txt>
        </View>
      </ScrollView>
    </OnboardingPage>
  );
}
