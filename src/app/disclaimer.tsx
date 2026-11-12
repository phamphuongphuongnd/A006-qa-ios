import { Info, ShieldAlert } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavHeader } from '@/features/settings/ui';
import { t } from '@/i18n';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Txt } from '@/ui';

/** S-16 Not tax advice. */
export default function DisclaimerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('disclaimer.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: insets.bottom + 32, gap: 18 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            marginTop: 8,
            backgroundColor: colors.sunSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ShieldAlert size={30} color={colors.sunText} strokeWidth={2} />
        </View>
        <Txt v="h1" accessibilityRole="header">
          {t('disclaimer.heading')}
        </Txt>
        <Txt size={17} style={{ lineHeight: 28 }}>
          {t('disclaimer.p1')}
        </Txt>
        <Txt size={17} c="textSecondary" style={{ lineHeight: 28 }}>
          {t('disclaimer.p2')}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 12, borderRadius: 16, padding: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center' }}>
          <Info size={22} color={colors.textSecondary} />
          <Txt style={{ flex: 1, fontFamily: fonts.bold }}>{t('disclaimer.check')}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}
