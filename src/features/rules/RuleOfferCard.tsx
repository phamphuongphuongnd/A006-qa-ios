import { Zap } from '@/ui/icons';
import { View } from 'react-native';

import { PRO_PAUSED } from '@/domain/pro';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Txt } from '@/ui';

import type { RuleOffer } from './repo';

/** P1-10 offer in the Sort queue: "Always sort 'DPD' as Delivery income?" · Always / Not now. */
export function RuleOfferCard({ offer, onAlways, onNotNow }: { offer: RuleOffer; onAlways: () => void; onNotNow: () => void }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 12, borderWidth: 2, borderColor: colors.sun }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Zap size={20} color={colors.sunText} />
        <Txt v="label" style={{ color: colors.sunText }}>
          {t('sortV2.suggestedRule')}
        </Txt>
        {PRO_PAUSED ? null : <Badge kind="pro" label="PRO" />}
      </View>
      <Txt v="h2" accessibilityRole="header">
        {t('sortV2.offerTitle', { name: offer.matchText, category: offer.categoryName })}
      </Txt>
      <Txt c="textSecondary">{t('sortV2.offerBody', { name: offer.matchText })}</Txt>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('sortV2.always')} variant="sun" full onPress={onAlways} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('common.notNow')} variant="outline" full onPress={onNotNow} />
        </View>
      </View>
    </Card>
  );
}
