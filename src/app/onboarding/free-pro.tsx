import { ScrollView, View } from 'react-native';

import { PRO_FALLBACK_PRICE } from '@/domain/pro';
import { OnboardingPage } from '@/features/entries/OnboardingTop';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Button, Txt } from '@/ui';
import { Check, Plus, Shield, type LucideIcon } from '@/ui/icons';

/**
 * S-01e Free & Pro (X6): the free limits said plainly at install. Never starts the trial here; "See Pro" opens S-19
 * (built by S5) without leaving onboarding.
 */
export default function FreeProStep() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const price = PRO_FALLBACK_PRICE[settings.region === 'US' ? 'US' : 'UK'];

  const column = (title: string, sub: string | null, items: string, Icon: LucideIcon, pro: boolean) => (
    <View
      accessible
      accessibilityLabel={`${title}${sub ? ` ${sub}` : ''}: ${items.split('|').join(', ')}`}
      style={{
        flex: 1,
        minWidth: 150,
        gap: 10,
        padding: 14,
        borderRadius: radius.card,
        backgroundColor: pro ? colors.sunSoft : colors.surface,
        borderWidth: pro ? 2 : 1,
        borderColor: pro ? colors.sun : colors.line,
      }}>
      <Txt v="h3">
        {title}
        {sub ? <Txt v="small" c="textSecondary" style={{ fontFamily: fonts.semibold }}>{` ${sub}`}</Txt> : null}
      </Txt>
      {items.split('|').map((it) => (
        <View key={it} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Icon size={18} color={colors.text} style={{ marginTop: 3 }} />
          <Txt style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{it}</Txt>
        </View>
      ))}
    </View>
  );

  return (
    <OnboardingPage
      step={5}
      bottom={
        <>
          <Button label={t('pro.onboarding.continueFree')} full onPress={() => router.push('/onboarding/reminder')} />
          <Button label={t('pro.onboarding.seePro')} variant="text" full onPress={() => router.push('/onboarding/pro')} />
        </>
      }>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 20, gap: 16 }}>
        <Txt v="h1" accessibilityRole="header">
          {t('pro.onboarding.title')}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {column(t('pro.onboarding.free'), null, t('pro.onboarding.freeItems'), Check, false)}
          {column(t('pro.onboarding.pro'), t('pro.onboarding.perYear', { price }), t('pro.onboarding.proItems'), Plus, true)}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: radius.card, backgroundColor: colors.surface }}>
          <Shield size={22} color={colors.ok} />
          <Txt style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{t('pro.onboarding.promise')}</Txt>
        </View>
      </ScrollView>
    </OnboardingPage>
  );
}
