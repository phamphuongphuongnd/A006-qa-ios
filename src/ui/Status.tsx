import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, type ColorName, useTheme } from '@/theme';
import { X, type LucideIcon } from '@/ui/icons';

import { Button } from './Button';
import { Txt } from './Txt';

/**
 * Bản 2 shared pieces (design/components: Badge, StatusDot, AlertCard).
 */

export type BadgeKind = 'pro' | 'trial' | 'auto' | 'recurring' | 'unsorted' | 'neutral';

const BADGE: Record<BadgeKind, { bg: ColorName; fg: ColorName; ring?: ColorName; pill?: boolean }> = {
  pro: { bg: 'sunSoft', fg: 'sunText', ring: 'sun' },
  trial: { bg: 'sunSoft', fg: 'sunText', ring: 'sun', pill: true },
  auto: { bg: 'workSoft', fg: 'work' },
  recurring: { bg: 'personalSoft', fg: 'personal' },
  unsorted: { bg: 'sunSoft', fg: 'sunText' },
  neutral: { bg: 'surfaceAlt', fg: 'textSecondary' },
};

/** 22dp label: "PRO", "Trial · 5 days left", "Auto", "Recurring", "Unsorted", "Edited" / "GPS" / "NFC" (neutral). */
export function Badge({ kind, label }: { kind: BadgeKind; label: string }) {
  const { colors } = useTheme();
  const b = BADGE[kind];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors[b.bg], borderRadius: b.pill ? 999 : 8 },
        b.ring && { borderWidth: 1.5, borderColor: colors[b.ring] },
      ]}>
      <Text maxFontSizeMultiplier={1.6} style={{ color: colors[b.fg], fontSize: 12, lineHeight: 16, fontFamily: fonts.bold }}>
        {label}
      </Text>
    </View>
  );
}

export type StatusKind = 'ok' | 'warn' | 'off' | 'live';

const DOT: Record<StatusKind, { dot: ColorName; text: ColorName }> = {
  ok: { dot: 'ok', text: 'okText' },
  warn: { dot: 'warn', text: 'warnText' },
  off: { dot: 'off', text: 'textSecondary' },
  live: { dot: 'live', text: 'text' },
};

/** 10dp dot with a soft halo, always next to words ("Working · last check 2 min ago" / "Paused by battery saving"). */
export function StatusDot({ kind, label, action, onAction }: { kind: StatusKind; label: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  const d = DOT[kind];
  return (
    <View style={styles.statusRow} accessible accessibilityLabel={action ? `${label}. ${action}` : label}>
      <View style={[styles.halo, { backgroundColor: colors[d.dot] + '33' }]}>
        <View style={[styles.dot, { backgroundColor: colors[d.dot] }]} />
      </View>
      <Txt v="small" c={d.text} style={{ flexShrink: 1 }}>
        {label}
      </Txt>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Txt v="small" c={d.text} style={{ fontFamily: fonts.bold, textDecorationLine: 'underline' }}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Home alert card (at most one, priority decided by the caller): problems use `warn`, information (Pro renewal)
 * uses `info`. One main action + optional text action; ✕ hides it (caller snoozes 7 days) unless `pinned`.
 */
export function AlertCard({
  tone,
  icon: Icon,
  title,
  body,
  action,
  onAction,
  secondary,
  onSecondary,
  onClose,
  children,
}: {
  tone: 'warn' | 'info';
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
  /** Omit for cards that cannot be hidden (trip stopped recording). */
  onClose?: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const bg = tone === 'warn' ? colors.warnSoft : colors.sunSoft;
  const fg: ColorName = tone === 'warn' ? 'warnText' : 'sunText';
  return (
    <View style={[styles.alert, { backgroundColor: bg }]} accessibilityRole="alert">
      <View style={styles.alertHead}>
        <Icon size={24} color={colors[fg]} strokeWidth={1.75} />
        <Txt v="h3" style={{ flex: 1 }}>
          {title}
        </Txt>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Hide">
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <Txt v="body" c="textSecondary">
        {body}
      </Txt>
      {children}
      <View style={styles.alertActions}>
        <Button label={action} onPress={onAction} size="sm" />
        {secondary && onSecondary ? <Button label={secondary} onPress={onSecondary} size="sm" variant="text" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minHeight: 22, paddingHorizontal: 8, justifyContent: 'center', alignSelf: 'flex-start' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  halo: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  alert: { borderRadius: 16, padding: 16, gap: 8 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
