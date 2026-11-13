import { router } from '@/services/router';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, type LucideIcon } from '@/ui/icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { fonts, GUTTER, useTheme, type ColorName } from '@/theme';
import { IconButton, Sheet, Txt } from '@/ui';

/** Pushed-screen header from the mockups: back button · centred h3 title · optional right slot (48dp). */
export function NavHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={[styles.top, { paddingHorizontal: GUTTER - 8 }]}>
      <IconButton icon={ChevronLeft} label={t('settings.back')} onPress={onBack ?? goBack} />
      <Txt v="h3" center numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Txt>
      <View style={{ width: 48, alignItems: 'center' }}>{right}</View>
    </View>
  );
}

export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** `.lbl` section label above a settings group. */
export function GroupLabel({ children, first }: { children: string; first?: boolean }) {
  return (
    <Txt v="label" c="textSecondary" accessibilityRole="header" style={{ paddingHorizontal: 4, paddingTop: first ? 6 : 10 }}>
      {children}
    </Txt>
  );
}

/** Settings row with value + chevron (the mockup `.set` with `.m2` value). */
export function NavRow({
  title,
  value,
  onPress,
  icon,
  right,
  danger,
  external,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  icon?: LucideIcon;
  right?: ReactNode;
  danger?: boolean;
  /** Opens a web page: ↗ instead of the chevron (B-30). */
  external?: boolean;
}) {
  const { colors } = useTheme();
  const Icon = icon;
  const body = (
    <>
      {Icon ? <Icon size={22} color={danger ? colors.error : colors.textSecondary} strokeWidth={2} /> : null}
      <Txt style={{ flex: 1, fontFamily: danger ? fonts.bold : fonts.regular }} c={danger ? 'error' : 'text'}>
        {title}
      </Txt>
      {value ? (
        <Txt c="textSecondary" numberOfLines={1} style={{ maxWidth: '55%' }}>
          {value}
        </Txt>
      ) : null}
      {right}
      {external ? (
        <ArrowUpRight size={18} color={colors.textTertiary} />
      ) : onPress && !danger ? (
        <ChevronRight size={18} color={colors.textTertiary} />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
      {body}
    </Pressable>
  );
}

/** Small coloured pill used as a row value (e.g. "34 days" on Backup & restore). */
export function Pill({ label, bg, fg }: { label: string; bg: ColorName; fg: ColorName }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 24, borderRadius: 12, paddingHorizontal: 9, justifyContent: 'center', backgroundColor: colors[bg] }}>
      <Txt v="caption" c={fg} style={{ fontFamily: fonts.bold }}>
        {label}
      </Txt>
    </View>
  );
}

export interface Option<T> {
  value: T;
  label: string;
  sub?: string;
}

/** Bottom sheet with a single-choice list (tick on the current value). */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option<T>[];
  value: T | null;
  onPick: (v: T) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: 0 }}>
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                onPick(o.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.opt,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: on ? fonts.bold : fonts.regular }}>{o.label}</Txt>
                {o.sub ? (
                  <Txt v="small" c="textSecondary">
                    {o.sub}
                  </Txt>
                ) : null}
              </View>
              {on ? <Check size={22} color={colors.primaryText} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "10 Nov 2026" */
export const formatDate = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
/** "10 Nov 2026, 18:22" */
export const formatDateTime = (at: number) => {
  const d = new Date(at);
  return `${formatDate(at)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
/** "1,204" */
export const formatCount = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 6, paddingHorizontal: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 4 },
});
