import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { router } from '@/services/router';
import { Briefcase, FileText, User, X } from '@/ui/icons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { createEntry, deleteEntries, topNotes } from '@/db/entriesRepo';
import { currencySymbol, formatMoney } from '@/domain/money';
import { currencyOf, type EntryType, type Scope } from '@/domain/types';
import { CameraDeniedDialog, takePhotos } from '@/features/entries/photo';
import { useDateTimePicker } from '@/features/entries/DateTimePick';
import { dateTimeLabel } from '@/features/entries/format';
import { MAX_PHOTOS_PER_ENTRY, photoSlots, planFill } from '@/features/ocr/fill';
import type { ParsedReceipt } from '@/features/ocr/parseReceipt';
import { attachReadings, ocrAvailable, ocrDev, type PendingRead } from '@/features/ocr/reader';
import { afterSave, undoAfterSave } from '@/features/ocr/rulesHook';
import {
  CalcBar,
  ExprLine,
  FromReceiptTag,
  PendingThumbs,
  PhotoButton,
  PhotoSourceSheet,
  PhotosLeft,
  PhotosUsedUpSheet,
  ReadingChip,
  ReceiptSaysChip,
  trialOffered,
} from '@/features/ocr/ui';
import { useAmountExpr } from '@/features/ocr/useAmountExpr';
import { useCapturePhotos } from '@/features/ocr/useCapturePhotos';
import { deleteReceiptFiles, saveReceipt } from '@/files/receipts';
import { useAppLocked } from '@/services/data';
import { t, tn } from '@/i18n';
import { usePhotoAllowance, usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Chip, Dialog, IconButton, RoundButton, Segmented, Txt, useSnackbar } from '@/ui';
import { refocus } from '@/features/ocr/refocus';
import { cameraPhotosSince, clearDraft, readDraft, saveDraft } from '@/features/entries/captureDraft';

/** Home's fixed Expense/Income bar (72 + 2×12 padding): the Saved snackbar sits above it. */
const HOME_BAR = 96;

/**
 * S-03 Quick capture. Params: `type=income|expense` (default expense), `from=home` (lifts the snackbar above
 * Home's capture bar). Amount is typed on the system number pad, cash-register style, with a + − × ÷ bar above it
 * (Q20). Up to 3 photos (Q21); with Pro each is read on the device and fills empty fields (P1-12). No category field.
 */
export default function CaptureScreen() {
  const params = useLocalSearchParams<{ type?: string; from?: string; restore?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const navigation = useNavigation();
  const picker = useDateTimePicker();
  const region = settings.region ?? 'UK';
  const currency = currencyOf(region);
  const { status, pro } = usePro();
  const allowance = usePhotoAllowance();

  // B-84: an entry typed before Android killed the app comes back as the starting values.
  // A draft only exists when the last Quick capture was cut off — whatever opened this one (Home, widget, shortcut).
  const [draft] = useState(() => readDraft());
  const [type, setType] = useState<EntryType>(draft?.type ?? (params.type === 'income' ? 'income' : 'expense'));
  const amount = useAmountExpr(0, draft?.expr);
  const [at, setAt] = useState<number | null>(draft?.at ?? null);
  const [note, setNote] = useState(draft?.note ?? '');
  const [noteKey, setNoteKey] = useState(0);
  const setNoteFromApp = (v: string) => {
    setNote(v);
    setNoteKey((k) => k + 1);
  };
  const [noteOpen, setNoteOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(draft?.scope ?? settings.defaultScope);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [usedUp, setUsedUp] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /** Fields the receipt filled ("From receipt", P1-12); touching a field clears its flag. */
  const [fromReceipt, setFromReceipt] = useState({ amount: false, note: false, at: false });
  /** "Receipt says £… · Use" when the typed amount differs from the receipt. */
  const [receiptMinor, setReceiptMinor] = useState<number | null>(null);
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);
  const noteRef = useRef<ComponentRef<typeof TextInput>>(null);
  /** Blocks a second Save tap while receipt photos are still being copied. */
  const savingRef = useRef(false);

  // OCR is Pro (§6); free photos are still attached, just not read — and nothing here sells Pro.
  const ocrOn = (pro || (__DEV__ && ocrDev.forceOn)) && ocrAvailable();
  const form = useRef({ amountMinor: 0, note: '', at: null as number | null });
  useEffect(() => {
    form.current = { amountMinor: amount.minor, note, at };
  });
  const onReading = (r: ParsedReceipt) => {
    const plan = planFill(form.current, r, Date.now());
    if (plan.amountMinor !== undefined) {
      amount.setMinor(plan.amountMinor);
      setReceiptMinor(null);
    }
    if (plan.chipMinor !== undefined) setReceiptMinor(plan.chipMinor);
    if (plan.note !== undefined) setNoteFromApp(plan.note);
    if (plan.at !== undefined) setAt(plan.at);
    if (plan.amountMinor !== undefined || plan.note !== undefined || plan.at !== undefined) {
      setFromReceipt((f) => ({
        amount: f.amount || plan.amountMinor !== undefined,
        note: f.note || plan.note !== undefined,
        at: f.at || plan.at !== undefined,
      }));
    }
  };
  const photos = useCapturePhotos({ ocrOn, region, onReading });
  const slots = photoSlots(allowance.left, photos.photos.length);

  const notes = useLive(() => topNotes(db, type), [type], ['entries']);
  const dirty = amount.expr !== '' || note.trim() !== '' || photos.photos.length > 0;

  // B-84: put back an entry typed before Android killed the app, plus a camera photo it kept for us.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const taken = new Set<string>();
    if (draft) {
      const fromCamera = draft.cameraStartedAt ? cameraPhotosSince(draft.cameraStartedAt, draft.photoUris).slice(0, MAX_PHOTOS_PER_ENTRY) : [];
      const uris = [...draft.photoUris, ...fromCamera].slice(0, MAX_PHOTOS_PER_ENTRY);
      if (uris.length) photos.add(uris);
      fromCamera.forEach((u) => taken.add(u));
      snack({ message: t('capture.draftRestored'), above: 'none' });
    }
    // QA-100 MOD-10: the camera result reaches the recreated Activity a moment after this screen opens — ask again
    // shortly after and whenever the app comes back to the front, and take each photo once.
    const fetchPending = () =>
      ImagePicker.getPendingResultAsync()
        .then((r) => {
          if (!r || !('assets' in r) || r.canceled || !r.assets?.length) return;
          const uris = r.assets.map((x) => x.uri).filter((u) => !taken.has(u));
          uris.forEach((u) => taken.add(u));
          if (uris.length) photos.add(uris);
        })
        .catch(() => {});
    fetchPending();
    const timers = [setTimeout(fetchPending, 1000), setTimeout(fetchPending, 3000)];
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') fetchPending();
    });
    return () => {
      timers.forEach(clearTimeout);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, []);

  // Keep what is typed until Save / Discard (B-84).
  const photoKey = photos.uris.join('|');
  // QA-100 QI-3: written a moment after typing stops — a file write on every keystroke slowed the JS thread enough for
  // iOS to scramble fast typing in the note field.
  useEffect(() => {
    if (leaving) return;
    const id = setTimeout(() => {
      if (dirty) saveDraft({ type, expr: amount.expr, note, scope, at, photoUris: photoKey ? photoKey.split('|') : [] });
      else clearDraft();
    }, 400);
    return () => clearTimeout(id);
  }, [dirty, type, amount.expr, note, scope, at, photoKey, leaving]);
  const chipMinor = receiptMinor !== null && receiptMinor !== amount.minor ? receiptMinor : null;

  const focusAmount = () => {
    setNoteOpen(false);
    refocus(amountRef.current);
  };

  // Ask before throwing away a typed entry (✕, Android back, swipe down).
  usePreventRemove(dirty && !leaving, () => setConfirmDiscard(true));

  // Leave only after the render that switched the guard off.
  useEffect(() => {
    if (!leaving) return;
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/');
  }, [leaving, navigation]);

  useEffect(() => {
    if (noteOpen) setTimeout(() => noteRef.current?.focus(), 50);
  }, [noteOpen]);

  // Opened from the widget / a notification with App lock on: autoFocus fired under the lock screen, so bring the
  // number pad up once it lifts (B-21).
  const locked = useAppLocked();
  useEffect(() => {
    if (!locked && !noteOpen) {
      const id = setTimeout(() => amountRef.current?.focus(), 150);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the lock lifts
  }, [locked]);

  // With the keyboard down the bottom row must clear the system nav bar (B-21); with it up the keyboard covers it.
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [photoAsk, setPhotoAsk] = useState(false);
  const [squeezed, setSqueezed] = useState(false);
  // QA-100 OLD-9: measured, not guessed — where the keyboard starts and how much the calculator row still sits under it.
  const keyboardTop = useRef<number | null>(null);
  const [calcLift, setCalcLift] = useState(0);
  // QA-100 B-98: on Android < 11 the Save row stayed partly under the keyboard whatever offset KeyboardAvoidingView got —
  // measure it and lift it by what is still covered.
  const [saveLift, setSaveLift] = useState(0);
  const bottomRef = useRef<ComponentRef<typeof View>>(null);
  const calcRef = useRef<ComponentRef<typeof View>>(null);
  const [middleHeight, setMiddleHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardUp(true);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      setKeyboardUp(false);
      setSqueezed(false);
      setCalcLift(0);
      setSaveLift(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  // QA-100 OLD-1: on short screens (360×640dp) the number pad leaves ~390dp; the helper lines go while it is up so the
  // amount keeps its room (it had shrunk to ~4px).
  // QA-100 MOD-2: big text on a tall phone (997dp at 200%) and an unfolded Fold in landscape squeeze the same way.
  // Besides the size guess, measure: once the amount area is squeezed under 80dp with the keyboard up, stay compact
  // until the keyboard goes down (no flip-flop as the helper lines come and go).
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const tight = keyboardUp && (squeezed || windowHeight / Math.max(1, fontScale) < 720);
  // QA-100 OLD-2: before Android 11 the keyboard height RN reports leaves out the nav bar the app draws behind
  // (edge-to-edge), so the calculator row ended up half under the keyboard.
  // QA-100 OLD-12: the shortfall measured on Android 8/7 is exactly the status bar (24dp) — the keyboard height RN reports
  // there is short by the bars the app draws behind. Add both bars (too much only leaves a gap; too little hid Save).
  const keyboardOffset = 0;
  const oldAndroid = Platform.OS === 'android' && Number(Platform.Version) < 30;
  /** Keyboard top in window coordinates: before Android 11 the window starts under the status bar, screenY doesn't. */
  const keyboardTopInWindow = () => {
    const top = keyboardTop.current;
    if (top === null) return null;
    return oldAndroid ? top - (StatusBar.currentHeight ?? 0) : top;
  };
  // QA-100 B-58/B-72: before Android 11 the window doesn't shrink for the keyboard the way RN measures, and the row
  // at the bottom stayed half under it (19dp ≈ the status bar). There the calculator row sits right under the amount.
  const calcUnderAmount = Platform.OS === 'android' && Number(Platform.Version) < 30;

  // QA-100 OLD-9: Android's adjustsFontSizeToFit sized the amount once, while its area was still ~0 under the opening
  // keyboard, and never grew it back (4px on Android 8). Size it from the measured height and the text's length instead.
  const { width: windowWidth } = useWindowDimensions();
  const shownText = formatMoney(amount.shownMinor, currency);
  const byHeight = middleHeight > 0 ? (middleHeight - 16) * 0.78 : 64;
  const byWidth = (windowWidth - 80) / (Math.max(5, shownText.length + (amount.isExpression ? 2 : 0)) * 0.62);
  const amountSize = Math.round(Math.max(24, Math.min(64, byHeight, byWidth)));

  const close = () => setLeaving(true);

  const onAmountText = (text: string) => {
    amount.onChangeText(text);
    if (fromReceipt.amount) setFromReceipt((f) => ({ ...f, amount: false }));
  };

  const addPhotos = async (source: 'camera' | 'library') => {
    if (slots.locked) {
      setUsedUp(true);
      return;
    }
    if (slots.canAdd <= 0) return;
    // B-89: if Android kills the app while the camera is open, the next start finds this draft and the photo by time.
    if (source === 'camera') saveDraft({ type, expr: amount.expr, note, scope, at, photoUris: photos.uris, cameraStartedAt: Date.now() });
    const res = await takePhotos(source, slots.canAdd);
    if (!res.ok && !dirty) clearDraft(); // cancelled on an empty entry: nothing to bring back
    if (res.ok) photos.add(res.uris);
    else if (res.reason === 'denied') setCameraDenied(true);
    else if (res.reason === 'failed') snack({ message: t('capture.photoFailed'), above: 'none' });
  };

  const reset = () => {
    amount.setMinor(0);
    setNoteFromApp('');
    setNoteOpen(false);
    photos.reset();
    setAt(null);
    setFromReceipt({ amount: false, note: false, at: false });
    setReceiptMinor(null);
    setScope(settings.defaultScope);
    amountRef.current?.focus();
  };

  const save = async () => {
    const minor = amount.minor;
    if (minor <= 0 || savingRef.current) return;
    savingRef.current = true;
    try {
      await saveOnce(minor);
    } catch {
      // QA-100 OLD-8: a full phone (SQLITE_FULL) failed silently — the driver thought it was saved. Keep the amount.
      savingRef.current = false;
      // OLD-10: on old Android the snackbar sat behind the keyboard — put the keyboard away first.
      Keyboard.dismiss();
      snack({ message: t('capture.saveFailed'), tone: 'error', above: 'none' });
    }
  };

  /** QA-100 MOD-7: a double tap on Save saved two entries — the latch stays shut until the screen has moved on. */
  const saveOnce = async (minor: number) => {
    const items: PendingRead[] = [];
    let photoFailed = false;
    for (const p of photos.photos) {
      try {
        items.push({ filePath: await saveReceipt(p.uri), read: p.read });
      } catch {
        photoFailed = true;
      }
    }
    // Readings already done go in with the entry (rules match on the merchant at save); late ones attach after.
    const row = createEntry(db, {
      type,
      amountMinor: minor,
      currency,
      occurredAt: at ?? undefined,
      note,
      scope,
      receiptPaths: items.map((i) => i.filePath),
      ...photos.finishedFields(),
    });
    // Rules [Pro] sort it now (S2's applyRulesOnSave via rulesHook); a reading that lands later re-applies them.
    const auto = afterSave(db, row.id);
    if (items.some((i) => i.read)) void attachReadings(db, row.id, items, afterSave);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const keep = settings.keepAdding;
    snack({
      message: photoFailed
        ? t('capture.photoFailed')
        : auto
          ? t('ocr.savedAutoSorted', { name: auto.categoryName })
          : t('capture.saved', {
              amount: formatMoney(minor, currency),
              type: type === 'income' ? t('capture.typeIncome') : t('capture.typeExpense'),
            }),
      actionLabel: t('common.undo'),
      onAction: () => {
        // "Saved · Fuel (auto-sorted)" + Undo takes back the sorting, not the entry (F-02).
        if (auto && !photoFailed) return undoAfterSave(db, row.id, auto.previousScope);
        const { orphaned } = deleteEntries(db, [row.id]);
        deleteReceiptFiles(orphaned);
      },
      above: keep ? 'none' : 'tabs',
      bottomOffset: !keep && params.from === 'home' ? HOME_BAR : 0,
    });
    clearDraft();
    if (keep) {
      reset();
      // Open the latch once the cleared amount has rendered (a second tap in the same frame still saw the old one).
      setTimeout(() => {
        savingRef.current = false;
      }, 300);
    } else close();
  };

  const pickDate = () =>
    picker.open({
      value: new Date(at ?? Date.now()),
      mode: 'datetime',
      maximumDate: new Date(),
      title: t('capture.dateLabel'),
      onPick: (d) => {
        setAt(d.getTime());
        setFromReceipt((f) => ({ ...f, at: false }));
      },
    });

  const tone = type === 'income' ? 'incomeText' : 'expenseText';
  const caretColor = type === 'income' ? colors.incomeButton : colors.expenseButton;
  const scopeOn = scope === 'work';
  const shown = formatMoney(amount.shownMinor, currency);
  const hasPhotos = photos.photos.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
        {/* Top row: close · Expense|Income · date chip */}
        <View style={[styles.top, { paddingHorizontal: Platform.OS === 'ios' ? GUTTER : 12 }]}>
          <IconButton icon={X} label={t('common.close')} onPress={() => (dirty ? setConfirmDiscard(true) : close())} />
          <View style={{ flex: 1, maxWidth: 204 }}>
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: 'expense', label: t('common.expense'), tone: 'expense' },
                { value: 'income', label: t('common.income'), tone: 'income' },
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('capture.dateLabel')}: ${at ? dateTimeLabel(at) : t('capture.now')}${fromReceipt.at ? `, ${t('ocr.fromReceipt')}` : ''}`}
            onPress={pickDate}
            hitSlop={6}
            style={[
              styles.dateChip,
              fromReceipt.at
                ? { backgroundColor: colors.sunSoft, borderColor: colors.sun, borderWidth: 2 }
                : { backgroundColor: colors.surface, borderColor: at ? colors.primary : colors.lineStrong, borderWidth: at ? 2 : 1.5 },
            ]}>
            <Txt maxFontSizeMultiplier={1.4} style={{ fontSize: at ? 13 : 14, fontFamily: fonts.semibold }}>
              {at ? dateTimeLabel(at) : t('capture.now')}
            </Txt>
          </Pressable>
        </View>

        {/* Amount */}
        <Pressable
          accessibilityRole="none"
          onPress={() => {
            setFromReceipt((f) => ({ ...f, amount: false }));
            focusAmount();
          }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setMiddleHeight(h);
            if (keyboardUp && !squeezed && h < 80) setSqueezed(true);
          }}
          style={styles.middle}>
          <ExprLine amount={amount} />
          <View style={[styles.amountBox, fromReceipt.amount && { backgroundColor: colors.sunSoft }]}>
            <View
              accessible
              accessibilityLabel={`${t('capture.amountLabel')} ${formatMoney(amount.minor, currency)}${amount.invalid ? `. ${t('ocr.checkSum')}` : ''}`}
              style={[styles.amountRow, amount.invalid && { opacity: 0.4 }]}>
              <Txt
                v="amountTyped"
                c={amount.shownMinor > 0 ? tone : 'textTertiary'}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
                style={{ flexShrink: 1, fontSize: amountSize, lineHeight: Math.round(amountSize * 1.12) }}>
                {amount.isExpression ? t('ocr.equals', { amount: shown }) : shown}
              </Txt>
              {!noteOpen && !fromReceipt.amount ? <Caret color={caretColor} /> : null}
            </View>
            {fromReceipt.amount ? <FromReceiptTag /> : null}
          </View>
          {note.trim() && !noteOpen ? (
            <View style={[styles.noteLine, fromReceipt.note && { backgroundColor: colors.sunSoft }]}>
              <FileText size={18} color={colors.textSecondary} />
              <Txt v="small" c="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {note.trim()}
              </Txt>
              {fromReceipt.note ? (
                <Txt v="caption" c="sunText" style={{ fontFamily: fonts.bold }}>
                  · {t('ocr.fromReceipt')}
                </Txt>
              ) : null}
            </View>
          ) : null}
          <TextInput
            ref={amountRef}
            value={amount.expr}
            selection={amount.selection}
            onChangeText={onAmountText}
            keyboardType="number-pad"
            // OLD-12: the pad's ✓ key saves (it only closed the keyboard before).
            returnKeyType="done"
            onSubmitEditing={() => {
              if (amount.minor > 0) save();
            }}
            submitBehavior="submit"
            autoFocus
            caretHidden
            contextMenuHidden
            accessibilityLabel={`${t('capture.amountLabel')}, ${currencySymbol(currency)}`}
            style={styles.hiddenInput}
          />
        </Pressable>
        {calcUnderAmount && keyboardUp && !noteOpen ? (
          <View style={{ paddingHorizontal: GUTTER, paddingBottom: 4 }}>
            <CalcBar onOp={amount.op} />
          </View>
        ) : null}

        <View
          ref={bottomRef}
          onLayout={() => {
            if (!oldAndroid || !keyboardUp) return;
            bottomRef.current?.measureInWindow((_x, y, _w, h) => {
              const top = keyboardTopInWindow();
              if (top === null) return;
              const covered = Math.round(y + h - top);
              if (covered > 1) setSaveLift((l) => Math.min(l + covered, 200));
            });
          }}
          style={{ paddingHorizontal: GUTTER, paddingBottom: keyboardUp ? 10 + saveLift : 12 + insets.bottom, gap: tight ? 8 : 12 }}>
          {chipMinor !== null ? (
            <ReceiptSaysChip
              minor={chipMinor}
              currency={currency}
              onUse={() => {
                amount.setMinor(chipMinor);
                setReceiptMinor(null);
                setFromReceipt((f) => ({ ...f, amount: true }));
              }}
            />
          ) : null}

          {hasPhotos || photos.reading ? (
            <View style={styles.thumbs}>
              <PendingThumbs uris={photos.uris} onRemove={photos.remove} />
              {photos.reading ? (
                <ReadingChip />
              ) : photos.photos.length < MAX_PHOTOS_PER_ENTRY ? (
                <Txt v="small" c="textSecondary">
                  {t('ocr.photoCount', { count: photos.photos.length, max: MAX_PHOTOS_PER_ENTRY })}
                </Txt>
              ) : null}
            </View>
          ) : null}

          {noteOpen ? (
            <View
              style={[
                styles.noteField,
                { borderColor: fromReceipt.note ? colors.sun : colors.primary, backgroundColor: fromReceipt.note ? colors.sunSoft : colors.surface },
              ]}>
              <TextInput
                ref={noteRef}
                // QI-3: not a controlled value (iOS reordered fast typing); remounted when the app fills it (chip, receipt).
                key={noteKey}
                defaultValue={note}
                onChangeText={(v) => {
                  setNote(v);
                  if (fromReceipt.note) setFromReceipt((f) => ({ ...f, note: false }));
                }}
                maxLength={120}
                placeholder={t('capture.notePlaceholder')}
                placeholderTextColor={colors.placeholder}
                returnKeyType="done"
                onSubmitEditing={focusAmount}
                maxFontSizeMultiplier={1.6}
                style={{ flex: 1, minHeight: 48, fontSize: 17, fontFamily: fonts.regular, color: colors.text }}
              />
            </View>
          ) : null}

          {/* Photo · Work/Personal · Note */}
          <View style={styles.row3}>
            <PhotoButton
              count={photos.photos.length}
              max={MAX_PHOTOS_PER_ENTRY}
              locked={slots.locked}
              onPress={() => (slots.locked ? addPhotos('camera') : setPhotoAsk(true))}
              onLongPress={() => addPhotos('library')}
            />
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: scopeOn }}
                accessibilityLabel={`${scopeOn ? t('common.work') : t('common.personal')}. ${scopeOn ? t('capture.tapForPersonal') : t('capture.tapForWork')}`}
                onPress={() => setScope(scopeOn ? 'personal' : 'work')}
                style={[styles.scopeChip, { backgroundColor: scopeOn ? colors.workSoft : colors.personalSoft }]}>
                {scopeOn ? <Briefcase size={20} color={colors.work} /> : <User size={20} color={colors.personal} />}
                <Txt maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontFamily: fonts.bold, color: scopeOn ? colors.work : colors.personal }}>
                  {scopeOn ? t('common.work') : t('common.personal')}
                </Txt>
              </Pressable>
              {tight ? null : (
                <Txt maxFontSizeMultiplier={1.4} numberOfLines={2} center style={{ maxWidth: 150, fontSize: 13, fontFamily: fonts.semibold }} c="textSecondary">
                  {scopeOn ? t('capture.tapForPersonal') : t('capture.tapForWork')}
                </Txt>
              )}
            </View>
            <RoundButton
              icon={FileText}
              label={t('capture.note')}
              active={noteOpen}
              onPress={() => (noteOpen ? focusAmount() : setNoteOpen(true))}
            />
          </View>

          {notes.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 8 }}>
              {notes.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  size="s"
                  state={note.trim().toLowerCase() === n.toLowerCase() ? 'on' : 'default'}
                  onPress={() => {
                    setNoteFromApp(note.trim().toLowerCase() === n.toLowerCase() ? '' : n);
                    setFromReceipt((f) => ({ ...f, note: false }));
                  }}
                />
              ))}
            </ScrollView>
          ) : null}

          {slots.left !== null && !tight ? <PhotosLeft left={slots.left} low={slots.low} /> : null}

          <Button label={t('common.save')} variant={type} full disabled={amount.minor <= 0} onPress={save} />
          {tight ? null : (
            <Txt v="caption" c="textTertiary" center style={{ marginTop: -4, fontFamily: fonts.regular }}>
              {t('capture.noCategory')}
            </Txt>
          )}
        </View>
        {!calcUnderAmount && keyboardUp && !noteOpen ? (
          <View
            ref={calcRef}
            style={{ marginBottom: calcLift }}
            onLayout={() =>
              // Lift the row by whatever part of it the keyboard still covers (old Android reports a short keyboard).
              calcRef.current?.measureInWindow((_x, y, _w, h) => {
                const top = keyboardTop.current;
                if (top === null) return;
                const covered = Math.round(y + h - top);
                if (covered > 1) setCalcLift((l) => Math.min(l + covered, 160));
              })
            }>
            <CalcBar onOp={amount.op} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <CameraDeniedDialog visible={cameraDenied} onClose={() => setCameraDenied(false)} />
      <PhotoSourceSheet
        visible={photoAsk}
        onClose={() => setPhotoAsk(false)}
        onPick={(source) => {
          setPhotoAsk(false);
          addPhotos(source);
        }}
      />
      <PhotosUsedUpSheet
        visible={usedUp}
        onClose={() => setUsedUp(false)}
        trialAvailable={trialOffered(status)}
        onSkip={() => {
          setUsedUp(false);
          if (amount.minor > 0) save();
          else focusAmount();
        }}
      />
      <Dialog
        visible={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title={t('capture.discardTitle')}
        body={`${t('capture.discardBody', {
          amount: formatMoney(amount.minor, currency),
          type: type === 'income' ? t('capture.typeIncome') : t('capture.typeExpense'),
          note: note.trim() ? ` · ${note.trim()}` : '',
        })}${photos.photos.length ? ` ${tn('capture.discardPhotos', photos.photos.length)}` : ''}`}
        actions={[
          {
            label: t('common.keepEditing'),
            onPress: () => {
              setConfirmDiscard(false);
              amountRef.current?.focus();
            },
          },
          {
            label: t('common.discard'),
            variant: 'danger',
            onPress: () => {
              setConfirmDiscard(false);
              clearDraft();
              close();
            },
          },
        ]}
      />
      {picker.element}
    </View>
  );
}

/** Blinking caret after the amount (the real input is hidden). */
function Caret({ color }: { color: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <View style={{ width: 3, height: 56, borderRadius: 2, backgroundColor: color, opacity: on ? 1 : 0 }} />;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 10, paddingBottom: 6 },
  dateChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', maxWidth: 150 },
  middle: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 20 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  amountBox: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', maxWidth: '100%' },
  noteLine: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, maxWidth: '100%' },
  thumbs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', paddingTop: 8 },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0, bottom: 0, left: 0 },
  noteField: { minHeight: 52, borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  row3: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', gap: 8 },
  scopeChip: { height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
