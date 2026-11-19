import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import type { Currency } from '@/domain/types';
import { formatExpr } from '@/features/ocr/calc';
import { AmountLimitHint, CalcBar } from '@/features/ocr/ui';
import type { AmountExpr } from '@/features/ocr/useAmountExpr';
import { t } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme';
import { NUMERIC_INPUT, Txt, useKeyboardUp } from '@/ui';
import { ParkingCircle } from '@/ui/icons';
import { refocus } from '@/features/ocr/refocus';

/**
 * "Parking & tolls" on a trip (Q28): an amount field with the calculator (Q20) — digits from the number pad
 * (cash-register style), "+ − × ÷" from the bar under the field while it is being edited. Empty = no parking.
 */
export function ParkingField({
  amount,
  currency,
  onDone,
  onEditingChange,
  inlineCalc = false,
}: {
  amount: AmountExpr;
  currency: Currency;
  onDone?: () => void;
  /** Screens show <ParkingKeyBar> in their bottom bar (above the keyboard) while this is true. */
  onEditingChange?: (editing: boolean) => void;
  /** Sheets have no bottom bar: show the "+ − × ÷" row under the field instead. */
  inlineCalc?: boolean;
}) {
  const { colors } = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [editing, setEditing] = useState(false);
  const keyboardUp = useKeyboardUp();
  // B-134b: Android's Back closes the keyboard without blurring the hidden field — the "+ − × ÷" strip stayed and the
  // amount showed twice. Keyboard gone = done editing.
  const wasUp = useRef(false);
  useEffect(() => {
    if (keyboardUp) wasUp.current = true;
    else if (wasUp.current && editing) {
      wasUp.current = false;
      ref.current?.blur();
      setEditing(false);
      onEditingChange?.(false);
    }
  }, [keyboardUp, editing, onEditingChange]);
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
          onEditingChange?.(true);
          refocus(ref.current);
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
          onEditingChange?.(false);
          onDone?.();
        }}
        keyboardType="decimal-pad"
        {...NUMERIC_INPUT}
        caretHidden
        contextMenuHidden
        style={styles.hidden}
      />
      {editing && inlineCalc ? <CalcBar onOp={amount.op} /> : null}
      {amount.invalid ? (
        <Txt v="caption" c="error">
          {t('ocr.checkSum')}
        </Txt>
      ) : amount.atLimit ? (
        <AmountLimitHint amount={amount} currency={currency} />
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

/**
 * Bottom-bar strip while Parking & tolls is being typed (the field itself is often under the keyboard): what was typed
 * ("2.50+1.00 = £3.50") and the "+ − × ÷" row.
 */
export function ParkingKeyBar({ amount, currency }: { amount: AmountExpr; currency: Currency }) {
  const shown = formatMoney(amount.shownMinor, currency);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Txt v="small" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {t('s6.parking')}
        </Txt>
        <Txt v="body" style={[{ fontFamily: fonts.bold, flexShrink: 1 }, amount.invalid && { opacity: 0.4 }]} numberOfLines={1} accessibilityLiveRegion="polite">
          {amount.isExpression ? `${formatExpr(amount.expr)} = ${shown}` : shown}
        </Txt>
      </View>
      {/* B-134b: the field (and its "Max …") is under the keyboard while typing — say it here too. */}
      <AmountLimitHint amount={amount} currency={currency} />
      <CalcBar onOp={amount.op} />
    </View>
  );
}
