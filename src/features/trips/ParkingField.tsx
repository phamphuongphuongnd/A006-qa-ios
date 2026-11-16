import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import type { Currency } from '@/domain/types';
import { formatExpr } from '@/features/ocr/calc';
import { CalcBar } from '@/features/ocr/ui';
import type { AmountExpr } from '@/features/ocr/useAmountExpr';
import { t } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme';
import { Txt } from '@/ui';
import { ParkingCircle } from '@/ui/icons';

/**
 * "Parking & tolls" on a trip (Q28): an amount field with the calculator (Q20) — digits from the number pad
 * (cash-register style), "+ − × ÷" from the bar under the field while it is being edited. Empty = no parking.
 */
export function ParkingField({ amount, currency, onDone }: { amount: AmountExpr; currency: Currency; onDone?: () => void }) {
  const { colors } = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [editing, setEditing] = useState(false);
  const has = amount.shownMinor > 0;
  const shown = has ? formatMoney(amount.shownMinor, currency) : formatMoney(0, currency);

  return (
    <View style={{ gap: 6 }}>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {t('s6.parking')}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('s6.parking')}, ${has ? shown : t('s6.parkingNone')}${amount.invalid ? `. ${t('ocr.checkSum')}` : ''}`}
        onPress={() => {
          setEditing(true);
          ref.current?.focus();
        }}
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: editing ? colors.primary : colors.lineStrong },
        ]}>
        <ParkingCircle size={22} color={colors.textSecondary} strokeWidth={2} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="body" size={17} c={has ? 'text' : 'textTertiary'} style={[{ fontFamily: fonts.bold }, amount.invalid && { opacity: 0.4 }]} numberOfLines={1}>
            {amount.isExpression ? `${formatExpr(amount.expr)} = ${shown}` : shown}
          </Txt>
        </View>
      </Pressable>
      <TextInput
        ref={ref}
        value={amount.expr}
        selection={amount.selection}
        onChangeText={amount.onChangeText}
        onBlur={() => {
          setEditing(false);
          onDone?.();
        }}
        keyboardType="number-pad"
        caretHidden
        contextMenuHidden
        style={styles.hidden}
      />
      {editing ? <CalcBar onOp={amount.op} /> : null}
      {amount.invalid ? (
        <Txt v="caption" c="error">
          {t('ocr.checkSum')}
        </Txt>
      ) : (
        <Txt v="caption" c="textSecondary">
          {t('s6.parkingHint')}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 56,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
