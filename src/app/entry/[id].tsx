import { useFocusEffect, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { router } from '@/services/router';
import { CalendarClock, ChevronDown, Copy, ImagePlus, MoreHorizontal, Repeat, Split, Trash2, X } from '@/ui/icons';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { addReceipt, createEntry, getEntry, listReceipts, splitSiblings, updateEntry, type EntryPatch } from '@/db/entriesRepo';
import type { EntryRow as EntryRowT } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { readingToEntryFields } from '@/domain/receiptSignal';
import type { Currency, EntryType, Scope } from '@/domain/types';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { useDateTimePicker } from '@/features/entries/DateTimePick';
import { EntryRow } from '@/features/entries/EntryRow';
import { dateTimeLabel, dayMonth } from '@/features/entries/format';
import { categoryIcon } from '@/features/entries/icons';
import { CameraDeniedDialog, takePhotos } from '@/features/entries/photo';
import { ReceiptViewer } from '@/features/entries/ReceiptViewer';
import { useEntryActions, useReceiptRemoval } from '@/features/entries/useEntryActions';
import { MAX_PHOTOS_PER_ENTRY, photoSlots } from '@/features/ocr/fill';
import { OriginCard } from '@/features/ocr/OriginCard';
import { ocrAvailable, ocrDev, readReceipt } from '@/features/ocr/reader';
import { entryOrigin, fillEntryOcr, setReceiptOcrText } from '@/features/ocr/repo';
import { afterSave } from '@/features/ocr/rulesHook';
import { LinkedLines } from '@/features/entries/LinkedLines';
import { formatDay } from '@/features/trips/format';
import { AmountLimitHint, CalcBar, ExprLine, PhotoSourceSheet, PhotosUsedUpSheet, trialOffered } from '@/features/ocr/ui';
import { useAmountExpr } from '@/features/ocr/useAmountExpr';
import { openPro } from '@/features/pro/openPro';
import { receiptUri, saveReceipt } from '@/files/receipts';
import { t } from '@/i18n';
import { usePhotoAllowance, usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Badge, Button, Dialog, EmptyState, Group, IconButton, NUMERIC_INPUT, ReceiptThumb, Segmented, Sheet, Txt, useSnackbar } from '@/ui';
import { refocus } from '@/features/ocr/refocus';

type Draft = Pick<EntryRowT, 'type' | 'amountMinor' | 'occurredAt' | 'note' | 'categoryId' | 'scope'>;

const draftOf = (e: EntryRowT): Draft => ({
  type: e.type,
  amountMinor: e.amountMinor,
  occurredAt: e.occurredAt,
  note: e.note,
  categoryId: e.categoryId,
  scope: e.scope,
});

/**
 * S-05 Entry detail — edit in place (amount has the + − × ÷ calculator, Q20); ⋯ = Split / Duplicate / Make recurring
 * [Pro] / Delete; receipts open full screen; a photo added here is read on the device with Pro (P1-12) and shown as
 * "Read from receipt: …" for checking. Shows the rule / recurring template that made or sorted the entry (F-05).
 */
export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useLive(() => getEntry(db, id), [id], ['entries']);
  if (!entry) return <Gone />;
  return <Editor key={entry.id} entry={entry} />;
}

function Gone() {
  // Deleted, merged or split away: once this screen is (again) on top, go back to where we came from.
  // Only while focused, so a screen already leaving never pops a second one.
  useFocusEffect(
    useCallback(() => {
      const tm = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/entries')), 50);
      return () => clearTimeout(tm);
    }, []),
  );
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState title={t('common.entryGone')} />
    </View>
  );
}

function Editor({ entry }: { entry: EntryRowT }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const snack = useSnackbar();
  const actions = useEntryActions();
  const removeReceipt = useReceiptRemoval();
  const picker = useDateTimePicker();
  const currency = entry.currency as Currency;

  const [draft, setDraft] = useState<Draft>(() => draftOf(entry));
  const [editingAmount, setEditingAmount] = useState(false);
  const [menu, setMenu] = useState(false);
  const [photoAsk, setPhotoAsk] = useState(false);
  const [sheet, setSheet] = useState<'category' | 'siblings' | null>(null);
  const [dialog, setDialog] = useState<'delete' | 'discard' | null>(null);
  const [viewer, setViewer] = useState<{ id: string; entryId: string; filePath: string } | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [usedUp, setUsedUp] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);
  const amount = useAmountExpr(entry.amountMinor);
  const { status, pro } = usePro();
  const allowance = usePhotoAllowance();
  const { settings } = useSettings();
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const data = useLive(
    () => ({
      receipts: listReceipts(db, entry.id),
      cats: listCategories(db, { includeHidden: true }),
      siblings: entry.splitGroupId ? splitSiblings(db, entry.splitGroupId) : [],
      origin: entryOrigin(db, entry),
    }),
    [entry.id, entry.splitGroupId, entry.ruleId, entry.recurringId],
    ['receipts', 'categories', 'entries', 'rules', 'recurring'],
  );
  const category = draft.categoryId ? data.cats.find((c) => c.id === draft.categoryId) : undefined;

  const saved = draftOf(entry);
  // The amount lives in the calculator; an invalid sum keeps the saved amount out of the patch and blocks Save.
  const current: Draft = { ...draft, amountMinor: amount.minor > 0 ? amount.minor : saved.amountMinor };
  const patch: EntryPatch = {};
  (Object.keys(current) as (keyof Draft)[]).forEach((k) => {
    if (current[k] !== saved[k]) (patch as Record<string, unknown>)[k] = current[k];
  });
  const dirty = Object.keys(patch).length > 0 || amount.minor !== saved.amountMinor;
  const valid = amount.minor > 0;

  usePreventRemove(dirty && !leaving, () => setDialog('discard'));
  useEffect(() => {
    if (!leaving) return;
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/entries');
  }, [leaving, navigation]);

  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const setType = (type: EntryType) => {
    // A category belongs to one side; switching side leaves the entry unsorted.
    const keep = category && category.type === type;
    set({ type, categoryId: keep ? draft.categoryId : null });
  };

  const save = () => {
    if (!dirty || !valid) return;
    updateEntry(db, entry.id, patch);
    snack({ message: t('entries.changesSaved') });
    setLeaving(true);
  };

  const slots = photoSlots(allowance.left, 0, MAX_PHOTOS_PER_ENTRY);
  const ocrOn = (pro || (__DEV__ && ocrDev.forceOn)) && ocrAvailable();

  const addPhoto = async (source: 'camera' | 'library') => {
    // Photos already attached never lock (P1-4); only a new one counts against the free allowance.
    if (slots.locked) {
      setUsedUp(true);
      return;
    }
    const res = await takePhotos(source, slots.canAdd);
    if (!res.ok) {
      if (res.reason === 'denied') setCameraDenied(true);
      else if (res.reason === 'failed') snack({ message: t('capture.photoFailed'), above: 'none' });
      return;
    }
    const entryId = entry.id;
    for (const uri of res.uris) {
      let name: string;
      try {
        name = await saveReceipt(uri);
        addReceipt(db, entryId, name);
      } catch {
        snack({ message: t('capture.photoFailed'), above: 'none', tone: 'error' });
        continue;
      }
      if (!ocrOn) continue;
      readReceipt(uri, settings.region ?? 'UK').then((r) => {
        if (!r) return;
        try {
          setReceiptOcrText(db, entryId, name, r.text);
          // A still-unsorted entry may now match a rule by the receipt's merchant.
          if (fillEntryOcr(db, entryId, readingToEntryFields(r.reading))) afterSave(db, entryId);
        } catch {
          // Entry deleted meanwhile.
        }
      });
    }
  };

  const makeRecurring = () => {
    setMenu(false);
    if (pro) router.push(`/recurring?from=${entry.id}`);
    else openPro('recurring');
  };

  const duplicate = () => {
    setMenu(false);
    createEntry(db, {
      type: entry.type,
      amountMinor: entry.amountMinor,
      currency,
      occurredAt: entry.occurredAt,
      note: entry.note,
      scope: entry.scope,
      categoryId: entry.categoryId,
      receiptPaths: data.receipts.map((r) => r.filePath),
    });
    snack({ message: t('entries.duplicated'), above: 'none' });
  };

  const amountColor = draft.type === 'income' ? 'incomeText' : 'expenseText';
  const splitFrom = entry.splitGroupId && entry.splitFromMinor ? entry.splitFromMinor : null;

  return (
    // Keyboard up (amount / note): the Save bar rides above it, as on Quick capture (B-36).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 8 : insets.top }}>
      <View style={[styles.top, { paddingHorizontal: GUTTER }]}>
        <IconButton icon={X} label={t('common.close')} onPress={() => (dirty ? setDialog('discard') : setLeaving(true))} />
        <Txt v="h3" accessibilityRole="header">
          {draft.type === 'income' ? t('common.income') : t('common.expense')}
        </Txt>
        <IconButton icon={MoreHorizontal} label={t('entries.detailMore')} filled onPress={() => setMenu(true)} />
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        <View>
          <View style={{ paddingHorizontal: GUTTER, gap: 14, paddingTop: 6 }}>
            <View style={{ alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 6 }}>
              <ExprLine amount={amount} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('entries.editAmount')}, ${formatMoney(amount.shownMinor, currency)}${amount.invalid ? `. ${t('ocr.checkSum')}` : ''}`}
                onPress={() => {
                  setEditingAmount(true);
                  refocus(amountRef.current);
                }}
                style={[styles.amountBox, editingAmount && { borderColor: colors.primary }]}>
                <Txt
                  v="amount"
                  c={amount.shownMinor > 0 ? amountColor : 'textTertiary'}
                  style={[{ fontSize: 52, lineHeight: 60 }, amount.invalid && { opacity: 0.4 }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}>
                  {amount.isExpression
                    ? t('ocr.equals', { amount: formatMoney(amount.shownMinor, currency) })
                    : formatMoney(amount.shownMinor, currency)}
                </Txt>
              </Pressable>
              <TextInput
                ref={amountRef}
                value={amount.expr}
                selection={amount.selection}
                onChangeText={amount.onChangeText}
                onBlur={() => setEditingAmount(false)}
                keyboardType="decimal-pad"
                {...NUMERIC_INPUT}
                caretHidden
                contextMenuHidden
                style={styles.hidden}
              />
              <AmountLimitHint amount={amount} currency={currency} />
              <View style={{ width: 220 }}>
                <Segmented
                  value={draft.type}
                  onChange={setType}
                  options={[
                    { value: 'expense', label: t('common.expense'), tone: 'expense' },
                    { value: 'income', label: t('common.income'), tone: 'income' },
                  ]}
                />
              </View>
              {splitFrom ? (
                <Pressable accessibilityRole="button" onPress={() => setSheet('siblings')} style={styles.splitLink}>
                  <Split size={16} color={colors.textSecondary} />
                  <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.medium, textDecorationLine: 'underline' }}>
                    {t('entries.splitFrom', { amount: formatMoney(splitFrom, currency), date: dayMonth(entry.occurredAt) })}
                  </Txt>
                </Pressable>
              ) : null}
            </View>

            <Group>
              <Row label={t('entries.dateTime')}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('entries.dateTime')}, ${dateTimeLabel(draft.occurredAt)}`}
                  onPress={() =>
                    picker.open({
                      value: new Date(draft.occurredAt),
                      mode: 'datetime',
                      title: t('entries.dateTime'),
                      onPick: (d) => set({ occurredAt: d.getTime() }),
                    })
                  }
                  style={styles.rowPress}>
                  <Txt style={{ flex: 1 }}>{dateTimeLabel(draft.occurredAt)}</Txt>
                  <CalendarClock size={20} color={colors.textTertiary} />
                </Pressable>
              </Row>
              <Row label={t('entries.note')}>
                <TextInput
                  value={draft.note}
                  onChangeText={(v) => set({ note: v })}
                  maxLength={120}
                  placeholder={t('entries.notePlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  accessibilityLabel={t('entries.note')}
                  maxFontSizeMultiplier={1.6}
                  style={{ flex: 1, minHeight: 44, fontSize: 16, fontFamily: fonts.regular, color: colors.text }}
                />
              </Row>
              <Row label={t('entries.mergeCategory')}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('entries.mergeCategory')}, ${category?.name ?? t('common.unsorted')}`}
                    onPress={() => setSheet('category')}
                    style={[styles.catChip, { borderColor: patch.categoryId !== undefined ? colors.primary : colors.lineStrong, borderWidth: patch.categoryId !== undefined ? 2 : 1.5 }]}>
                    {category ? (() => {
                      const Icon = categoryIcon(category.icon);
                      return <Icon size={16} color={category.color} />;
                    })() : null}
                    <Txt maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ fontSize: 14, fontFamily: fonts.semibold, flexShrink: 1 }}>
                      {category?.name ?? t('common.unsorted')}
                    </Txt>
                    <ChevronDown size={16} color={colors.text} />
                  </Pressable>
                </View>
                {patch.categoryId !== undefined ? (
                  <View accessibilityLabel={t('entries.changed')} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                ) : null}
              </Row>
              <Row label={t('entries.use')}>
                <View style={{ flex: 1 }}>
                  <Segmented<Scope>
                    value={draft.scope}
                    onChange={(scope) => set({ scope })}
                    options={[
                      { value: 'work', label: t('common.work') },
                      { value: 'personal', label: t('common.personal') },
                    ]}
                  />
                </View>
              </Row>
            </Group>

            <OriginCard entry={entry} origin={data.origin} currency={currency} />
            <LinkedLines entry={entry} />

            <View style={{ gap: 6 }}>
              <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
                {t('entries.receipts')}
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {data.receipts.map((r) => (
                  <ReceiptThumb key={r.id} uri={receiptUri(r.filePath)} size={72} onPress={() => setViewer(r)} />
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.addPhoto')}
                  accessibilityHint={t('capture.photoHint')}
                  onPress={() => setPhotoAsk(true)}
                  onLongPress={() => addPhoto('library')}
                  style={[styles.addPhoto, { borderColor: colors.lineStrong }]}>
                  <ImagePlus size={22} color={colors.textSecondary} />
                  <Txt maxFontSizeMultiplier={1.3} numberOfLines={2} center style={{ fontSize: 12, fontFamily: fonts.bold }} c="textSecondary">
                    {t('common.addPhoto')}
                  </Txt>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: keyboardUp ? 12 : Math.max(insets.bottom, 16) + 12 }}>
        {dirty && entry.exportedAt ? (
          <Txt v="small" c="sunText" center style={{ marginBottom: 8, fontFamily: fonts.semibold }} accessibilityLiveRegion="polite">
            {t('s6.exportedWarn', { date: formatDay(entry.exportedAt) })}
          </Txt>
        ) : null}
        <Button label={t('entries.saveChanges')} full disabled={!dirty || !valid} onPress={save} />
      </View>
      {keyboardUp && editingAmount ? <CalcBar onOp={amount.op} /> : null}

      {/* ⋯ menu */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessibilityLabel={t('common.close')} />
        <View style={[styles.menu, { top: (Platform.OS === 'ios' ? 8 : insets.top) + 68, right: 16, backgroundColor: colors.surface, borderColor: colors.line }]}>
          <MenuItem
            icon={Split}
            label={t('entries.split')}
            onPress={() => {
              setMenu(false);
              router.push(`/split/${entry.id}`);
            }}
          />
          <MenuItem icon={Copy} label={t('entries.duplicate')} onPress={duplicate} />
          <MenuItem icon={Repeat} label={t('ocr.makeRecurring')} pro={!pro} onPress={makeRecurring} />
          <MenuItem
            icon={Trash2}
            label={t('common.delete')}
            danger
            onPress={() => {
              setMenu(false);
              setDialog('delete');
            }}
          />
        </View>
      </Modal>

      <CategorySheet
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        type={draft.type}
        allowUnsorted
        selectedId={draft.categoryId}
        title={t('entries.mergeCategory')}
        onPick={(cid) => {
          set({ categoryId: cid });
          setSheet(null);
        }}
      />
      <Sheet visible={sheet === 'siblings'} onClose={() => setSheet(null)} title={t('entries.splitParts')}>
        <View>
          {data.siblings.map((s, i) => (
            <EntryRow
              key={s.id}
              entry={{ ...s, receiptCount: 0 }}
              category={s.categoryId ? data.cats.find((c) => c.id === s.categoryId) : undefined}
              currency={currency}
              divider={i > 0}
              onPress={() => {
                setSheet(null);
                if (s.id !== entry.id) router.replace(`/entry/${s.id}`);
              }}
            />
          ))}
        </View>
      </Sheet>

      <PhotoSourceSheet
        visible={photoAsk}
        onClose={() => setPhotoAsk(false)}
        onPick={(source) => {
          setPhotoAsk(false);
          addPhoto(source);
        }}
      />

      <Dialog
        visible={dialog === 'discard'}
        onClose={() => setDialog(null)}
        title={t('entries.discardChangesTitle')}
        body={t('entries.discardChangesBody')}
        actions={[
          { label: t('common.keepEditing'), onPress: () => setDialog(null) },
          {
            label: t('common.discard'),
            variant: 'danger',
            onPress: () => {
              setDialog(null);
              setLeaving(true);
            },
          },
        ]}
      />
      <Dialog
        visible={dialog === 'delete'}
        onClose={() => setDialog(null)}
        title={t('entries.deleteTitle')}
        body={t('entries.deleteBody')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDialog(null) },
          {
            label: t('common.delete'),
            variant: 'danger',
            onPress: () => {
              setDialog(null);
              setLeaving(true);
              actions.remove([entry.id]);
            },
          },
        ]}
      />
      <CameraDeniedDialog visible={cameraDenied} onClose={() => setCameraDenied(false)} />
      <PhotosUsedUpSheet visible={usedUp} onClose={() => setUsedUp(false)} trialAvailable={trialOffered(status)} />
      <ReceiptViewer
        uri={viewer ? receiptUri(viewer.filePath) : null}
        caption={`${entry.note || t('common.noNote')} · ${formatMoney(entry.amountMinor, currency)} · ${dayMonth(entry.occurredAt)}`}
        onClose={() => setViewer(null)}
        onDelete={() => {
          if (viewer) removeReceipt(viewer);
          setViewer(null);
        }}
      />
      {picker.element}
    </KeyboardAvoidingView>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      {/* QA-100 MOD-6: a fixed 96dp broke "Category" mid-word at 200% text — at least 96, as wide as the word needs. */}
      <Txt v="caption" c="textSecondary" maxFontSizeMultiplier={1.6} style={{ minWidth: 96, flexShrink: 0, fontFamily: fonts.bold }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

function MenuItem({ icon: Icon, label, onPress, danger, pro }: { icon: typeof Copy; label: string; onPress: () => void; danger?: boolean; pro?: boolean }) {
  const { colors } = useTheme();
  const c = danger ? colors.error : colors.text;
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.surfaceAlt }]}>
      <Icon size={22} color={c} />
      <Txt style={{ color: c, flex: 1 }}>{label}</Txt>
      {pro ? <Badge kind="pro" label="PRO" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6 },
  amountBox: { borderRadius: 16, borderWidth: 2, borderColor: 'transparent', paddingHorizontal: 12, maxWidth: '100%' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  splitLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 6, paddingHorizontal: 16 },
  rowPress: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 },
  catChip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  addPhoto: {
    minWidth: 72,
    minHeight: 72,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  menu: {
    position: 'absolute',
    width: 240,
    padding: 6,
    borderRadius: radius.card,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 12, borderRadius: 10 },
});
