import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENT_MAX, fonts, radius, useTheme } from '@/theme';

import { Button, type ButtonVariant } from './Button';
import { useKeyboardGap } from './keyboardGap';
import { ModalShownContext, useShownState } from './modalShown';
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

/**
 * Top edge (window y) of the FAB on the focused screen, or null. A snackbar over a tab screen sits above it, so a late
 * tap on "Undo" can never land on the FAB underneath once the snackbar has gone (B-27).
 */
const FabTopCtx = createContext<(top: number | null) => void>(() => {});
export const useReportFabTop = () => useContext(FabTopCtx);

/** `.snack` — one at a time; a new one replaces (and dismisses) the current. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<(SnackOptions & { id: number }) | null>(null);
  const [fabTop, setFabTop] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<(SnackOptions & { id: number }) | null>(null);
  const screenReader = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReader.current = on)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => (screenReader.current = on));
    return () => sub.remove();
  }, []);

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
      // TalkBack / VoiceOver needs time to reach "Undo" by swiping: keep action snackbars up longer then.
      const base = o.duration ?? (o.actionLabel ? 5000 : 3000);
      timer.current = setTimeout(() => close(false), o.actionLabel && screenReader.current ? Math.max(base, 10000) : base);
    },
    [close],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Window y of the bottom edge of the area the snackbar is laid out in (same coordinates as the FAB's measure).
  const frame = useRef<ComponentRef<typeof View>>(null);
  const [frameBottom, setFrameBottom] = useState<number | null>(null);
  const measureFrame = useCallback(() => frame.current?.measureInWindow((_x, y, _w, h) => setFrameBottom(y + h)), []);

  return (
    <SnackCtx.Provider value={show}>
      <FabTopCtx.Provider value={setFabTop}>{children}</FabTopCtx.Provider>
      <View ref={frame} pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={measureFrame} />
      {snack && (
        <SnackView
          s={snack}
          fabClearance={fabTop != null && frameBottom != null && fabTop < frameBottom ? frameBottom - fabTop + 8 : 0}
          onAction={() => { snack.onAction?.(); close(true); }}
        />
      )}
    </SnackCtx.Provider>
  );
}

function SnackView({ s, fabClearance, onAction }: { s: SnackOptions; fabClearance: number; onAction: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const overTabs = (s.above ?? 'tabs') === 'tabs';
  let bottom = insets.bottom + (overTabs ? 90 : 16) + (s.bottomOffset ?? 0);
  if (overTabs) bottom = Math.max(bottom, fabClearance);
  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: bottom }]}>
      {/* No role on the row: an Android "alert" container swallows its children, so TalkBack couldn't focus Undo. */}
      <View
        style={[styles.snack, { backgroundColor: s.tone === 'error' ? colors.error : colors.snackbar }]}>
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" maxFontSizeMultiplier={1.6} style={{ flex: 1, color: s.tone === 'error' ? colors.onError : colors.onSnackbar, fontSize: 15, fontFamily: fonts.semibold }}>
          {s.message}
        </Text>
        {s.actionLabel ? (
          <Pressable accessible accessibilityRole="button" accessibilityLabel={s.actionLabel} onPress={onAction} hitSlop={8} style={styles.snackBtn}>
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
  const { shown, onShow } = useShownState(visible);
  // B-153: Android, where the keyboard-avoiding view stops short of the keyboard (Galaxy A13).
  const keyboard = useKeyboardGap(visible);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={onShow} statusBarTranslucent navigationBarTranslucent>
      <ModalShownContext.Provider value={shown}>
        {/* Android too: the modal window doesn't resize for the keyboard, so a field's Save would sit under it (B-32). */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, paddingBottom: keyboard.gap }}>
          {keyboard.marker}
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
      </ModalShownContext.Provider>
    </Modal>
  );
}

// ---------------- Dialog ----------------

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
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
  const { shown, onShow } = useShownState(visible);
  // B-153: Android, where the keyboard-avoiding view stops short of the keyboard (Galaxy A13).
  const keyboard = useKeyboardGap(visible);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={onShow} statusBarTranslucent>
      <ModalShownContext.Provider value={shown}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.dlgWrap, { backgroundColor: colors.scrim, paddingBottom: keyboard.gap }]}>
          {keyboard.marker}
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
                <Button key={a.label} label={a.label} onPress={a.onPress} variant={a.variant ?? 'text'} size="sm" disabled={a.disabled} />
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ModalShownContext.Provider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  snack: {
    width: '100%',
    maxWidth: CONTENT_MAX - 24,
    alignSelf: 'center',
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
  // B-146: on an iPad / tablet the sheet is as wide as the content column, centred — not the whole window.
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 10, paddingHorizontal: 20, gap: 16, maxHeight: '92%', width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
  dlgWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  dlg: { borderRadius: radius.dialog, padding: 24, gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  acts: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
