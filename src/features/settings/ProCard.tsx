import { Pressable, View } from 'react-native';

import { dayMonth } from '@/features/entries/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { usePro } from '@/state/pro';
import { radius, useTheme } from '@/theme';
import { Txt } from '@/ui';
import { ChevronRight, Sun } from '@/ui/icons';

/** S-15 first row: "Sunday Sort Pro" with Free · See Pro / Trial · 5 days left / Pro · renews 6 Apr → S-19. */
export function ProCard() {
  'use no memo';
  const { colors } = useTheme();
  const { status } = usePro();
  const sub =
    status.kind === 'trial'
      ? status.daysLeft === 1
        ? t('pro.status.trialOne')
        : t('pro.status.trial', { days: status.daysLeft })
      : status.kind === 'pro'
        ? status.renewsAt
          ? status.autoRenewing
            ? t('pro.status.pro', { date: dayMonth(status.renewsAt) })
            : t('pro.status.proNoRenew', { date: dayMonth(status.renewsAt) })
          : t('pro.badge')
        : status.kind === 'expired'
          ? t('pro.status.expired', { date: dayMonth(status.endedAt) })
          : t('pro.status.free');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('pro.name')}. ${sub}`}
      onPress={() => router.push('/pro')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 6,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.sun,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Sun size={26} color={colors.sunText} />
      <View style={{ flex: 1 }}>
        <Txt v="h3">{t('pro.name')}</Txt>
        <Txt v="small" c="textSecondary">
          {sub}
        </Txt>
      </View>
      <ChevronRight size={22} color={colors.textSecondary} />
    </Pressable>
  );
}
