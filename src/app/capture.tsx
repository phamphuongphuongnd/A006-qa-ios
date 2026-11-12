import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { Briefcase, Camera, FileText, User, X } from '@/ui/icons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { createEntry, deleteEntries, topNotes } from '@/db/entriesRepo';
import { currencySymbol, formatMoney } from '@/domain/money';
import { currencyOf, type EntryType, type Scope } from '@/domain/types';
import { CameraDeniedDialog, takePhoto } from '@/features/entries/photo';
import { useDateTimePicker } from '@/features/entries/DateTimePick';
import { dateTimeLabel } from '@/features/entries/format';
import { keypadText, keypadValue } from '@/features/entries/logic';
import { deleteReceiptFiles, saveReceipt } from '@/files/receipts';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Chip, Dialog, IconButton, ReceiptThumb, RoundButton, Segmented, Txt, useSnackbar } from '@/ui';

/** Home's fixed Expense/Income bar (72 + 2×12 padding): the Saved snackbar sits above it. */
const HOME_BAR = 96;

/**
 * S-03 Quick capture. Params: `type=income|expense` (default expense), `from=home` (lifts the snackbar above
 * Home's capture bar). Amount is typed on the system number pad, cash-register style. No category field.
 */
export default function CaptureScreen() {
  const params = useLocalSearchParams<{ type?: string; from?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const navigation = useNavigation();
  const picker = useDateTimePicker();
  const currency = currencyOf(settings.region ?? 'UK');

  const [type, setType] = useState<EntryType>(params.type === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState(0);
  const [at, setAt] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(settings.defaultScope);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);
  const noteRef = useRef<ComponentRef<typeof TextInput>>(null);
  /** Blocks a second Save tap while the receipt photo is still being copied. */
  const savingRef = useRef(false);

  const notes = useLive(() => topNotes(db, type), [type], ['entries']);
  const dirty = amount > 0 || note.trim() !== '' || photo !== null;

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

  const close = () => setLeaving(true);

  const onAmountText = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const next = keypadValue(digits);
    // Over the 999,999.99 limit the extra digit is ignored — tell the hand, not the eyes.
    if (digits.length > keypadText(amount).length && next === amount) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(next);
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    const res = await takePhoto(source);
    if (res.ok) setPhoto(res.uri);
    else if (res.reason === 'denied') setCameraDenied(true);
    else if (res.reason === 'failed') snack({ message: t('capture.photoFailed'), above: 'none' });
  };

  const reset = () => {
    setAmount(0);
    setNote('');
    setNoteOpen(false);
    setPhoto(null);
    setAt(null);
    setScope(settings.defaultScope);
    amountRef.current?.focus();
  };

  const save = async () => {
    if (amount <= 0 || savingRef.current) return;
    savingRef.current = true;
    let receiptPaths: string[] = [];
    let photoFailed = false;
    if (photo) {
      try {
        receiptPaths = [await saveReceipt(photo)];
      } catch {
        photoFailed = true;
      }
    }
    const row = createEntry(db, { type, amountMinor: amount, currency, occurredAt: at ?? undefined, note, scope, receiptPaths });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const keep = settings.keepAdding;
    snack({
      message: photoFailed
        ? t('capture.photoFailed')
        : t('capture.saved', {
            amount: formatMoney(amount, currency),
            type: type === 'income' ? t('capture.typeIncome') : t('capture.typeExpense'),
          }),
      actionLabel: t('common.undo'),
      onAction: () => {
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
      onPick: (d) => setAt(d.getTime()),
    });

  const tone = type === 'income' ? 'incomeText' : 'expenseText';
  const caretColor = type === 'income' ? colors.incomeButton : colors.expenseButton;
  const scopeOn = scope === 'work';

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
            accessibilityLabel={`${t('capture.dateLabel')}: ${at ? dateTimeLabel(at) : t('capture.now')}`}
            onPress={pickDate}
            hitSlop={6}
            style={[
              styles.dateChip,
              { backgroundColor: colors.surface, borderColor: at ? colors.primary : colors.lineStrong, borderWidth: at ? 2 : 1.5 },
            ]}>
            <Txt maxFontSizeMultiplier={1.4} style={{ fontSize: at ? 13 : 14, fontFamily: fonts.semibold }}>
              {at ? dateTimeLabel(at) : t('capture.now')}
            </Txt>
          </Pressable>
        </View>

        {/* Amount */}
        <Pressable accessibilityRole="none" onPress={focusAmount} style={styles.middle}>
          <View accessible accessibilityLabel={`${t('capture.amountLabel')} ${formatMoney(amount, currency)}`} style={styles.amountRow}>
            <Txt
              v="amountTyped"
              c={amount > 0 ? tone : 'textTertiary'}
              adjustsFontSizeToFit
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{ flexShrink: 1 }}>
              {formatMoney(amount, currency)}
            </Txt>
            {!noteOpen ? <Caret color={caretColor} /> : null}
          </View>
          {note.trim() && !noteOpen ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FileText size={18} color={colors.textSecondary} />
              <Txt v="small" c="textSecondary" numberOfLines={1}>
                {note.trim()}
              </Txt>
            </View>
          ) : null}
          <TextInput
            ref={amountRef}
            value={keypadText(amount)}
            onChangeText={onAmountText}
            keyboardType="number-pad"
            autoFocus
            caretHidden
            contextMenuHidden
            accessibilityLabel={`${t('capture.amountLabel')}, ${currencySymbol(currency)}`}
            style={styles.hiddenInput}
          />
        </Pressable>

        <View style={{ paddingHorizontal: GUTTER, paddingBottom: 12, gap: 14 }}>
          {noteOpen ? (
            <View style={[styles.noteField, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
              <TextInput
                ref={noteRef}
                value={note}
                onChangeText={setNote}
                maxLength={120}
                placeholder={t('capture.notePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                onSubmitEditing={focusAmount}
                maxFontSizeMultiplier={1.6}
                style={{ flex: 1, minHeight: 48, fontSize: 17, fontFamily: fonts.regular, color: colors.text }}
              />
            </View>
          ) : null}

          {/* Photo · Work/Personal · Note */}
          <View style={styles.row3}>
            {photo ? (
              <View style={{ alignItems: 'center', gap: 6, minWidth: 64 }}>
                <View>
                  <ReceiptThumb uri={photo} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('capture.removePhoto')}
                    onPress={() => setPhoto(null)}
                    hitSlop={10}
                    style={[styles.removePhoto, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                    <X size={14} color={colors.onPrimary} strokeWidth={3} />
                  </Pressable>
                </View>
                <Txt style={{ fontSize: 13, fontFamily: fonts.semibold }} c="textSecondary">
                  {t('common.receipt')}
                </Txt>
              </View>
            ) : (
              <RoundButton
                icon={Camera}
                label={t('capture.photo')}
                onPress={() => addPhoto('camera')}
                onLongPress={() => addPhoto('library')}
              />
            )}
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
              <Txt style={{ fontSize: 13, fontFamily: fonts.semibold }} c="textSecondary">
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
                  onPress={() => setNote(note.trim().toLowerCase() === n.toLowerCase() ? '' : n)}
                />
              ))}
            </ScrollView>
          ) : null}

          <Button label={t('common.save')} variant={type} full disabled={amount <= 0} onPress={save} />
          <Txt v="caption" c="textTertiary" center style={{ marginTop: -4, fontFamily: fonts.regular }}>
            {t('capture.noCategory')}
          </Txt>
        </View>
      </KeyboardAvoidingView>

      <CameraDeniedDialog visible={cameraDenied} onClose={() => setCameraDenied(false)} />
      <Dialog
        visible={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title={t('capture.discardTitle')}
        body={t('capture.discardBody', {
          amount: formatMoney(amount, currency),
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
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0, bottom: 0, left: 0 },
  noteField: { minHeight: 52, borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  row3: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  scopeChip: { height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  removePhoto: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
