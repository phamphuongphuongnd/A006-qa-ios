import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, useTheme } from '@/theme';

import { Button, type ButtonVariant } from './Button';
import { Txt } from './Txt';

// ---------------- Snackbar ----------------

export interface SnackOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Fires when the snackbar goes away without the action (e.g. commit a deferred delete). */
  onDismiss?: () => void;
  /** ms; default 5000 with an action, 3000 without. */
  duration?: number;
  /** Lift above a bottom bar: 'tabs' (default), 'none' for full-screen modals. */
  above?: 'tabs' | 'none';
  /** Extra lift on top of `above`, e.g. Home's fixed Expense/Income bar. */
  bottomOffset?: number;
  tone?: 'default' | 'error';
}

const SnackCtx = createContext<(o: SnackOptions) => void>(() => {});

/** `.snack` — one at a time; a new one replaces (and dismisses) the current. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<(SnackOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<(SnackOptions & { id: number }) | null>(null);

  const close = useCallback((acted: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    const s = current.current;
    current.current = null;
    setSnack(null);
    if (s && !acted) s.onDismiss?.();
  }, []);

  const show = useCallback(
    (o: SnackOptions) => {
      if (current.current) close(false);
      const s = { ...o, id: Date.now() };
      current.current = s;
      setSnack(s);
      timer.current = setTimeout(() => close(false), o.duration ?? (o.actionLabel ? 5000 : 3000));
    },
    [close],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <SnackCtx.Provider value={show}>
      {children}
      {snack && <SnackView s={snack} onAction={() => { snack.onAction?.(); close(true); }} />}
    </SnackCtx.Provider>
  );
}

function SnackView({ s, onAction }: { s: SnackOptions; onAction: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + ((s.above ?? 'tabs') === 'tabs' ? 90 : 16) + (s.bottomOffset ?? 0);
  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: bottom }]}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.snack, { backgroundColor: s.tone === 'error' ? colors.error : colors.snackbar }]}>
        <Text maxFontSizeMultiplier={1.6} style={{ flex: 1, color: s.tone === 'error' ? colors.onError : colors.onSnackbar, fontSize: 15, fontFamily: fonts.semibold }}>
          {s.message}
        </Text>
        {s.actionLabel ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.snackBtn}>
            <Text style={{ color: colors.snackbarAction, fontSize: 15, fontFamily: fonts.extrabold }}>{s.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const useSnackbar = () => useContext(SnackCtx);

// ---------------- Bottom sheet ----------------

/** `.sheet` — modal bottom sheet with grab handle and scrim. Tap scrim / back to close. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} />
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <View style={[styles.grab, { backgroundColor: colors.lineStrong }]} />
          {title ? (
            <Txt v="h2" accessibilityRole="header">
              {title}
            </Txt>
          ) : null}
          {scroll ? (
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            children
          )}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------- Dialog ----------------

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

/** `.dlg` — centred alert with title, body and right-aligned actions (last = primary). */
export function Dialog({
  visible,
  title,
  body,
  actions,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  body?: string;
  actions: DialogAction[];
  onClose: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.dlgWrap, { backgroundColor: colors.scrim }]}>
        <View accessibilityViewIsModal style={[styles.dlg, { backgroundColor: colors.surface }]}>
          <Txt v="h2" accessibilityRole="header">
            {title}
          </Txt>
          {body ? (
            <Txt v="body" c="textSecondary">
              {body}
            </Txt>
          ) : null}
          {children}
          <View style={styles.acts}>
            {actions.map((a) => (
              <Button key={a.label} label={a.label} onPress={a.onPress} variant={a.variant ?? 'text'} size="sm" />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  snack: {
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  snackBtn: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 10, paddingHorizontal: 20, gap: 16, maxHeight: '92%' },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
  dlgWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  dlg: { borderRadius: radius.dialog, padding: 24, gap: 10 },
  acts: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
