import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { router } from '@/services/router';
import { Briefcase, FileText, User, X } from '@/ui/icons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { t } from '@/i18n';
import { usePhotoAllowance, usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Chip, Dialog, IconButton, RoundButton, Segmented, Txt, useSnackbar } from '@/ui';

/** Home's fixed Expense/Income bar (72 + 2×12 padding): the Saved snackbar sits above it. */
const HOME_BAR = 96;

/**
 * S-03 Quick capture. Params: `type=income|expense` (default expense), `from=home` (lifts the snackbar above
 * Home's capture bar). Amount is typed on the system number pad, cash-register style, with a + − × ÷ bar above it
 * (Q20). Up to 3 photos (Q21); with Pro each is read on the device and fills empty fields (P1-12). No category field.
 */
export default function CaptureScreen() {
  const params = useLocalSearchParams<{ type?: string; from?: string }>();
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

  const [type, setType] = useState<EntryType>(params.type === 'income' ? 'income' : 'expense');
  const amount = useAmountExpr(0);
  const [at, setAt] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(settings.defaultScope);
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
    if (plan.note !== undefined) setNote(plan.note);
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
  const chipMinor = receiptMinor !== null && receiptMinor !== amount.minor ? receiptMinor : null;

  const focusAmount = () => {
    setNoteOpen(false);
    amountRef.current?.focus();
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
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
    const res = await takePhotos(source, slots.canAdd);
    if (res.ok) photos.add(res.uris);
    else if (res.reason === 'denied') setCameraDenied(true);
    else if (res.reason === 'failed') snack({ message: t('capture.photoFailed'), above: 'none' });
  };

  const reset = () => {
    amount.setMinor(0);
    setNote('');
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
        if (auto && !photoFailed) return undoAfterSave(db, row.id);
        const { orphaned } = deleteEntries(db, [row.id]);
        deleteReceiptFiles(orphaned);
      },
      above: keep ? 'none' : 'tabs',
      bottomOffset: !keep && params.from === 'home' ? HOME_BAR : 0,
    });
    savingRef.current = false;
    if (keep) reset();
    else close();
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                adjustsFontSizeToFit
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={{ flexShrink: 1 }}>
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
            autoFocus
            caretHidden
            contextMenuHidden
            accessibilityLabel={`${t('capture.amountLabel')}, ${currencySymbol(currency)}`}
            style={styles.hiddenInput}
          />
        </Pressable>

        <View style={{ paddingHorizontal: GUTTER, paddingBottom: keyboardUp ? 10 : 12 + insets.bottom, gap: 12 }}>
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
                value={note}
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
              onPress={() => addPhotos('camera')}
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
              <Txt maxFontSizeMultiplier={1.4} numberOfLines={2} center style={{ maxWidth: 150, fontSize: 13, fontFamily: fonts.semibold }} c="textSecondary">
                {scopeOn ? t('capture.tapForPersonal') : t('capture.tapForWork')}
              </Txt>
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
                    setNote(note.trim().toLowerCase() === n.toLowerCase() ? '' : n);
                    setFromReceipt((f) => ({ ...f, note: false }));
                  }}
                />
              ))}
            </ScrollView>
          ) : null}

          {slots.left !== null ? <PhotosLeft left={slots.left} low={slots.low} /> : null}

          <Button label={t('common.save')} variant={type} full disabled={amount.minor <= 0} onPress={save} />
          <Txt v="caption" c="textTertiary" center style={{ marginTop: -4, fontFamily: fonts.regular }}>
            {t('capture.noCategory')}
          </Txt>
        </View>
        {keyboardUp && !noteOpen ? <CalcBar onOp={amount.op} /> : null}
      </KeyboardAvoidingView>

      <CameraDeniedDialog visible={cameraDenied} onClose={() => setCameraDenied(false)} />
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
        body={t('capture.discardBody', {
          amount: formatMoney(amount.minor, currency),
          type: type === 'income' ? t('capture.typeIncome') : t('capture.typeExpense'),
          note: note.trim() ? ` · ${note.trim()}` : '',
        })}
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
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 20 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  amountBox: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', maxWidth: '100%' },
  noteLine: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, maxWidth: '100%' },
  thumbs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', paddingTop: 8 },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0, bottom: 0, left: 0 },
  noteField: { minHeight: 52, borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  row3: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', gap: 8 },
  scopeChip: { height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
