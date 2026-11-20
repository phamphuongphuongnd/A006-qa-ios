import type { LucideIcon } from '@/ui/icons';
import React, { forwardRef, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';

import { MODAL_FOCUS_DELAY_MS, useModalShown } from './modalShown';
import { Txt } from './Txt';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Selected skin: neutral (white pill), expense, income. */
  tone?: 'neutral' | 'expense' | 'income';
}

/** `.seg` — segmented control; Expense/Income use the coloured selected skin. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[styles.seg, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((o) => {
        const on = o.value === value;
        const bg = !on ? 'transparent' : o.tone === 'expense' ? colors.expenseButton : o.tone === 'income' ? colors.incomeButton : colors.surface;
        const fg = !on
          ? colors.textSecondary
          : o.tone === 'expense'
            ? colors.onExpenseButton
            : o.tone === 'income'
              ? colors.onIncomeButton
              : colors.text;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segBtn, { backgroundColor: bg }, on && o.tone !== 'expense' && o.tone !== 'income' && styles.segShadow]}>
            {Icon && <Icon size={18} color={fg} strokeWidth={2.2} />}
            <Text
              maxFontSizeMultiplier={1.6}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ flexShrink: 1, color: fg, fontSize: 15, fontFamily: fonts.bold }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** `.tg` — 52×32 switch. */
export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { colors, dark } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.tg, { backgroundColor: value ? colors.primary : colors.lineStrong, opacity: disabled ? 0.4 : 1 }]}>
      <View style={[styles.knob, { left: value ? 24 : 4, backgroundColor: value && dark ? '#12161C' : '#FFFFFF' }]} />
    </Pressable>
  );
}

/**
 * B-126 (a real Pixel 11 opened Gboard QWERTY on a number field): numeric fields carry no text-only flags
 * (capitalisation, autocorrect, autofill), so every keyboard shows its number pad.
 */
export const NUMERIC_INPUT = { inputMode: 'decimal', autoCapitalize: 'none', autoCorrect: false, autoComplete: 'off' } as const;

const NUMERIC_KEYBOARDS = new Set(['decimal-pad', 'number-pad', 'numeric', 'phone-pad']);

/** `.fld` + `.inp` — labelled text field with error text. */
export const Field = forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextInputProps & { label?: string; error?: string | null; left?: ReactNode; right?: ReactNode; focused?: boolean }
>(function Field({ label, error, left, right, style, onFocus, onBlur, ...rest }, ref) {
  const { colors } = useTheme();
  const inner = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const setRef = useCallback(
    (node: React.ComponentRef<typeof TextInput> | null) => {
      inner.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  // B-149: autoFocus inside a Dialog / Sheet waits for its Modal window (see modalShown.ts).
  const modalShown = useModalShown();
  const deferFocus = Platform.OS === 'android' && !!rest.autoFocus && modalShown !== null;
  useEffect(() => {
    if (!deferFocus || !modalShown) return;
    const id = setTimeout(() => inner.current?.focus(), MODAL_FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [deferFocus, modalShown]);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.inp,
          { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.lineStrong, borderWidth: error ? 2 : 1.5 },
        ]}>
        {left}
        <TextInput
          ref={setRef}
          placeholderTextColor={colors.placeholder}
          maxFontSizeMultiplier={1.6}
          style={[
            { flex: 1, minHeight: 52, fontSize: 17, fontFamily: fonts.regular, color: colors.text },
            style,
            // An empty field shows its hint in the plain face, so it never reads as a typed value (B-05).
            !rest.value ? { fontFamily: fonts.regular, letterSpacing: 0 } : null,
          ]}
          onFocus={onFocus}
          onBlur={onBlur}
          {...(rest.keyboardType && NUMERIC_KEYBOARDS.has(rest.keyboardType) ? NUMERIC_INPUT : null)}
          {...rest}
          autoFocus={deferFocus ? false : rest.autoFocus}
        />
        {right}
      </View>
      {error ? (
        <Txt v="small" c="error" style={{ fontFamily: fonts.semibold }} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : null}
    </View>
  );
});

/** `.set` — settings row: icon, title/subtitle, trailing control or chevron. */
export function SettingRow({
  icon: Icon,
  title,
  subtitle,
  value,
  right,
  onPress,
  danger,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const body = (
    <>
      {Icon && <Icon size={22} color={danger ? colors.error : colors.textSecondary} strokeWidth={2} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="body" c={danger ? 'error' : 'text'} style={{ fontFamily: fonts.semibold }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="small" c="textSecondary">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt v="small" c="textSecondary" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Txt>
      ) : null}
      {right}
    </>
  );
  if (!onPress) return <View style={styles.set}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.set, pressed && { backgroundColor: colors.surfaceAlt }]}>
      {body}
    </Pressable>
  );
}

/** Round selection circle used in multi-select lists (`.sel`). */
export function SelectCircle({ on }: { on: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: on ? 0 : 2,
        borderColor: colors.lineStrong,
        backgroundColor: on ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {on ? <Text style={{ color: colors.onPrimary, fontSize: 14, fontFamily: fonts.extrabold }}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 4, borderRadius: 26, gap: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segShadow: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tg: { width: 52, height: 32, borderRadius: 16, justifyContent: 'center' },
  knob: { position: 'absolute', top: 4, width: 24, height: 24, borderRadius: 12, elevation: 1 },
  inp: { minHeight: 56, borderRadius: radius.input, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  set: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 6, paddingHorizontal: 16 },
});
