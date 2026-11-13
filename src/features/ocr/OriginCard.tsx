import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import type { Currency, Minor } from '@/domain/types';
import { dayMonth } from '@/features/entries/format';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { fonts, useTheme } from '@/theme';
import { Txt } from '@/ui';
import { Receipt, Repeat, Zap } from '@/ui/icons';

import type { entryOrigin } from './repo';

/**
 * S-05 card (F-05): "Sorted by rule 'Shell → Fuel'" · Edit rule (yellow), "Created by recurring 'Van lease'" ·
 * Edit recurring (purple), and the OCR line "Read from receipt: £72.40 · Shell · 9 Nov" for checking.
 * Edit links: /rules?id= (S2) and /recurring?id= (S4).
 */
export function OriginCard({
  entry,
  origin,
  currency,
}: {
  entry: { ocrAmountMinor: Minor | null; ocrMerchant: string | null; ocrDate: number | null };
  origin: ReturnType<typeof entryOrigin>;
  currency: Currency;
}) {
  const { colors } = useTheme();
  const parts = [
    entry.ocrAmountMinor !== null ? formatMoney(entry.ocrAmountMinor, currency) : null,
    entry.ocrMerchant,
    entry.ocrDate !== null ? dayMonth(entry.ocrDate) : null,
  ].filter(Boolean);
  const read = parts.length > 0 ? t('ocr.readFrom', { parts: parts.join(' · ') }) : null;
  if (!origin.rule && !origin.recurring && !read) return null;

  const recurringOnly = origin.recurring && !origin.rule;
  return (
    <View style={[styles.card, { backgroundColor: recurringOnly ? colors.personalSoft : colors.sunSoft }]}>
      {origin.rule ? (
        <View style={{ gap: 2 }}>
          <View style={styles.row}>
            <Zap size={16} color={colors.text} />
            <Txt style={{ fontFamily: fonts.bold, flexShrink: 1 }} maxFontSizeMultiplier={1.6}>
              {t('ocr.sortedByRule', { rule: origin.rule.label })}
            </Txt>
          </View>
          <Link label={t('ocr.editRule')} color={colors.work} onPress={() => router.push(`/rules?id=${origin.rule!.id}`)} />
        </View>
      ) : null}
      {origin.recurring ? (
        <View style={{ gap: 2 }}>
          <View style={styles.row}>
            <Repeat size={16} color={colors.personal} />
            <Txt style={{ fontFamily: fonts.bold, flexShrink: 1, color: colors.personal }} maxFontSizeMultiplier={1.6}>
              {t('ocr.createdByRecurring', { name: origin.recurring.name })}
            </Txt>
          </View>
          <Link
            label={t('ocr.editRecurring')}
            color={colors.work}
            onPress={() => router.push(`/recurring?id=${origin.recurring!.id}`)}
          />
        </View>
      ) : null}
      {read ? (
        <View style={styles.row}>
          <Receipt size={16} color={colors.textSecondary} />
          <Txt v="small" c="textSecondary" style={{ flexShrink: 1 }} maxFontSizeMultiplier={1.8}>
            {read}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function Link({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={{ minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Txt style={{ color, fontFamily: fonts.bold, fontSize: 17 }} maxFontSizeMultiplier={1.6}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
