import { Briefcase, CheckCircle2, ChevronDown, Combine, Pencil, Plus, SkipForward, Split, User, X, type LucideIcon } from '@/ui/icons';
import { Zap } from '@/ui/icons';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listReceipts, updateEntry, type EntryListItem } from '@/db/entriesRepo';
import { currencySymbol, formatMoney, parseMinor, toDecimalString } from '@/domain/money';
import { checkSplit, defaultSplit, MAX_SPLIT_PARTS } from '@/domain/splitMerge';
import type { Currency, Scope } from '@/domain/types';
import { receiptUri } from '@/files/receipts';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { fonts, radius, useTheme } from '@/theme';
import { Button, Card, Chip, Divider, NUMERIC_INPUT, Segmented, Tag, Txt, useKeyboardUp } from '@/ui';

import { CategorySheet } from './CategorySheet';
import { useDateTimePicker } from './DateTimePick';
import { dateDotTime, dayMonth } from './format';
import { categoryIcon } from './icons';
import { newPartMinor, partMinor, sortCardScope } from './logic';
import { ReceiptViewer } from './ReceiptViewer';
import type { SortSuggestion } from './useSortWeek';

type Mode = 'view' | 'edit' | 'split';

interface Part {
  key: number;
  text: string;
  categoryId: string | null;
  scope: Scope;
}

/**
 * S-06 entry card (Q5: edit / split / merge without leaving Sort). Tapping a chip sorts it (card slides away);
 * "Edit" and "Split" open a compact form inside the card; "Merge" asks the parent to open the merge sheet.
 */
export function SortEntryCard({
  entry,
  suggestion,
  stacked,
  nameOf,
  onSort,
  onSkip,
  onMerge,
  onSplit,
}: {
  entry: EntryListItem;
  suggestion: SortSuggestion;
  stacked: boolean;
  nameOf: (categoryId: string) => string;
  onSort: (categoryId: string, name: string, scope: Scope) => void;
  onSkip: () => void;
  onMerge: () => void;
  /** Split & sort pressed: parts as typed. Returns false if the split failed. */
  onSplit: (parts: { amountMinor: number; categoryId: string | null; scope: Scope }[]) => boolean;
}) {
  const { colors } = useTheme();
  const [scope, setScope] = useState<Scope>(() => sortCardScope(entry.scope, suggestion.scope));
  const [mode, setMode] = useState<Mode>('view');
  const [more, setMore] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [x] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardUp = useKeyboardUp();
  const open = mode !== 'view';
  // Where the Edit panel starts inside the card (B-128).
  const editY = useRef(0);
  // The screen shrinks after the keyboard opens; scroll once the card has its new height. Split: to the end ("Left to
  // assign" / "Split & sort", B-38). Edit: to the panel's top — its end is Date / chips, which hid Amount + Done (B-128).
  const keepFormInView = useCallback(() => {
    if (mode === 'split') scrollRef.current?.scrollToEnd({ animated: true });
    else if (mode === 'edit') scrollRef.current?.scrollTo({ y: Math.max(0, editY.current - 8), animated: true });
  }, [mode]);
  useEffect(() => {
    if (!keyboardUp || !open) return;
    const id = setTimeout(keepFormInView, 150);
    return () => clearTimeout(id);
  }, [keyboardUp, open, keepFormInView]);
  const receipts = useLive(() => (entry.receiptCount > 0 ? listReceipts(db, entry.id) : []), [entry.id, entry.receiptCount], ['receipts']);
  const currency = entry.currency as Currency;
  const income = entry.type === 'income';

  // Card slides away (200 ms), then the entry is sorted and the next card takes its place.
  const pick = (categoryId: string, name: string) => {
    if (busy.current) return;
    busy.current = true;
    Animated.timing(x, { toValue: -480, duration: 200, useNativeDriver: true }).start(() => onSort(categoryId, name, scope));
  };
  const skip = () => {
    if (busy.current) return;
    busy.current = true;
    Animated.timing(x, { toValue: 480, duration: 200, useNativeDriver: true }).start(() => {
      busy.current = false;
      x.setValue(0);
      onSkip();
    });
  };

  const best = suggestion.categories;
  const pro = suggestion.kind === 'suggested';
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: stacked ? 16 : 0, bottom: 0 }, { transform: [{ translateX: x }] }]}>
      <Card style={[styles.card, { shadowColor: '#161D2B' }]}>
        {/* Scrolls when large text or an open form makes the card taller than the space (B-24). */}
        {/* Keyboard open on Edit / Split: the card shrinks above it (Sort screen) → keep "Left to assign" / Done in view (B-38). */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          // B-114 v2: inside the Sort screen's own scroll (large text) Android only scrolls an inner list with this —
          // without it the split form's "Split & sort" could never be reached.
          nestedScrollEnabled
          contentContainerStyle={[styles.cardBody, mode === 'view' && { paddingBottom: 8 }]}
          // B-43: when the card scrolls, show it (Android keeps the bar; iOS flashes it once the content is taller).
          persistentScrollbar
          onContentSizeChange={() => scrollRef.current?.flashScrollIndicators()}
          keyboardShouldPersistTaps="handled"
          onLayout={() => {
            if (keyboardUp && open) keepFormInView();
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: income ? colors.income : colors.expense }} />
                <Txt style={{ fontSize: 14, fontFamily: fonts.bold }}>{income ? t('common.income') : t('common.expense')}</Txt>
              </View>
              <Txt v="amount" c="text" style={{ fontSize: 44, lineHeight: 50 }} adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(entry.amountMinor, currency)}
              </Txt>
              <Txt v="h3" numberOfLines={2}>
                {entry.note || t('common.noNote')}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt v="small" c="textSecondary">
                  {dateDotTime(entry.occurredAt)}
                </Txt>
                {entry.scope === 'personal' && mode === 'view' ? <Tag kind="personal" label={t('common.personal')} /> : null}
              </View>
            </View>
            {receipts[0] ? (
              <Pressable accessibilityRole="imagebutton" accessibilityLabel={t('sort.viewReceipt')} onPress={() => setViewer(true)} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 72, height: 88, borderRadius: 12, overflow: 'hidden' }}>
                  <Image source={{ uri: receiptUri(receipts[0].filePath) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                </View>
                {receipts.length > 1 ? (
                  <Txt v="caption" c="textSecondary">
                    {`1/${receipts.length}`}
                  </Txt>
                ) : null}
              </Pressable>
            ) : null}
          </View>

          {mode === 'edit' ? (
            <View onLayout={(e) => (editY.current = e.nativeEvent.layout.y)}>
              <EditPanel entry={entry} onDone={() => setMode('view')} />
            </View>
          ) : null}
          {mode === 'split' ? (
            <SplitPanel
              entry={entry}
              onClose={() => setMode('view')}
              onSplit={(parts) => {
                if (onSplit(parts)) setMode('view');
              }}
            />
          ) : null}

          {mode !== 'split' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {pro ? <Zap size={18} color={colors.textTertiary} /> : null}
                <Txt v="label" c="textTertiary">
                  {pro ? t('sort.suggested') : t('sortV2.mostUsed')}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {best.map((c, i) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    icon={pro && i === 0 ? categoryIcon(c.icon) : undefined}
                    state={pro && i === 0 ? 'best' : 'default'}
                    onPress={() => pick(c.id, c.name)}
                  />
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMore(true)}
                  style={[styles.more, { backgroundColor: colors.surfaceAlt, borderColor: colors.lineStrong }]}>
                  <Txt style={{ fontSize: 15, fontFamily: fonts.semibold }}>{t('sort.more')}</Txt>
                </Pressable>
              </View>
              <Segmented<Scope>
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'work', label: t('common.work'), icon: Briefcase },
                  { value: 'personal', label: t('common.personal'), icon: User },
                ]}
              />
            </>
          ) : null}
        </ScrollView>
        {/* B-43: pinned under the scrolling part — three rows of chips or a route sketch never push it out of sight. */}
        {mode === 'view' ? (
          <View testID="sort-card-actions" style={styles.footer}>
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <CardAction label={t('sortV2.edit')} icon={Pencil} onPress={() => setMode('edit')} />
              <CardAction label={t('sort.split')} icon={Split} onPress={() => setMode('split')} />
              <CardAction label={t('sortV2.merge')} icon={Combine} onPress={onMerge} />
              <CardAction label={t('sort.skip')} icon={SkipForward} onPress={skip} />
            </View>
          </View>
        ) : null}
      </Card>
      <CategorySheet
        visible={more}
        onClose={() => setMore(false)}
        type={entry.type}
        onPick={(id) => {
          setMore(false);
          if (id) pick(id, nameOf(id));
        }}
      />
      <ReceiptViewer
        uri={viewer && receipts[0] ? receiptUri(receipts[0].filePath) : null}
        caption={`${entry.note || t('common.noNote')} · ${formatMoney(entry.amountMinor, currency)} · ${dayMonth(entry.occurredAt)}`}
        onClose={() => setViewer(false)}
      />
    </Animated.View>
  );
}

/** Edit in place: amount · note · date, "Done" saves (never leaves Sort). */
function EditPanel({ entry, onDone }: { entry: EntryListItem; onDone: () => void }) {
  const { colors } = useTheme();
  const currency = entry.currency as Currency;
  const [amount, setAmount] = useState(toDecimalString(entry.amountMinor));
  const [note, setNote] = useState(entry.note);
  const [at, setAt] = useState(entry.occurredAt);
  const [error, setError] = useState(false);
  const picker = useDateTimePicker();

  const done = () => {
    const minor = parseMinor(amount);
    if (minor === null || minor <= 0) {
      setError(true);
      return;
    }
    const patch: Parameters<typeof updateEntry>[2] = {};
    if (minor !== entry.amountMinor) patch.amountMinor = minor;
    if (note.trim() !== entry.note) patch.note = note;
    if (at !== entry.occurredAt) patch.occurredAt = at;
    if (Object.keys(patch).length > 0) updateEntry(db, entry.id, patch);
    onDone();
  };

  const box = [styles.box, { backgroundColor: colors.surface }];
  return (
    <View style={[styles.panel, { backgroundColor: colors.surfaceAlt }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt v="h3" accessibilityRole="header">
          {t('sortV2.edit')}
        </Txt>
        <Button label={t('common.done')} size="sm" onPress={done} />
      </View>
      <View style={[box, error && { borderWidth: 2, borderColor: colors.error }]}>
        <Txt v="caption" c="textSecondary">
          {t('sortV2.amount')}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt style={{ fontSize: 20, fontFamily: fonts.bold }}>{currencySymbol(currency)}</Txt>
          <TextInput
            value={amount}
            onChangeText={(v) => {
              setAmount(v.replace(/[^\d.]/g, ''));
              setError(false);
            }}
            keyboardType="decimal-pad"
            {...NUMERIC_INPUT}
            accessibilityLabel={t('sortV2.amount')}
            maxFontSizeMultiplier={1.6}
            style={{ flex: 1, minHeight: 40, fontSize: 20, fontFamily: fonts.bold, color: colors.text, padding: 0 }}
          />
        </View>
      </View>
      {error ? (
        <Txt v="small" c="error" accessibilityLiveRegion="polite">
          {t('sortV2.amountInvalid')}
        </Txt>
      ) : null}
      <View style={box}>
        <Txt v="caption" c="textSecondary">
          {t('sortV2.note')}
        </Txt>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={120}
          accessibilityLabel={t('sortV2.note')}
          placeholder={t('entries.notePlaceholder')}
          placeholderTextColor={colors.placeholder}
          maxFontSizeMultiplier={1.6}
          style={{ minHeight: 36, fontSize: 17, fontFamily: fonts.regular, color: colors.text, padding: 0 }}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('sortV2.date')}, ${dateDotTime(at)}`}
        onPress={() => picker.open({ value: new Date(at), mode: 'datetime', maximumDate: new Date(), onPick: (d) => setAt(d.getTime()) })}
        style={box}>
        <Txt v="caption" c="textSecondary">
          {t('sortV2.date')}
        </Txt>
        <Txt style={{ fontSize: 17 }}>{dateDotTime(at)}</Txt>
      </Pressable>
      {picker.element}
    </View>
  );
}

/** Split in place: parts (amount · category · W/P), "+ Add part", "Left to assign", "Split & sort". */
function SplitPanel({
  entry,
  onClose,
  onSplit,
}: {
  entry: EntryListItem;
  onClose: () => void;
  onSplit: (parts: { amountMinor: number; categoryId: string | null; scope: Scope }[]) => void;
}) {
  const { colors } = useTheme();
  const currency = entry.currency as Currency;
  const total = entry.amountMinor;
  const [parts, setParts] = useState<Part[]>(() => defaultSplit(total, 2).map((m, i) => ({ key: i, text: toDecimalString(m), categoryId: null, scope: entry.scope })));
  const [picking, setPicking] = useState<number | null>(null);
  const cats = useLive(() => listCategories(db, { includeHidden: true }), [], ['categories']);
  const check = checkSplit(total, parts.map((p) => partMinor(p.text)));
  const update = (key: number, patch: Partial<Part>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const addPart = () =>
    setParts((ps) => {
      if (ps.length >= MAX_SPLIT_PARTS) return ps;
      const m = newPartMinor(total, ps.map((p) => partMinor(p.text)));
      return [...ps, { key: Math.max(...ps.map((p) => p.key)) + 1, text: m > 0 ? toDecimalString(m) : '', categoryId: null, scope: entry.scope }];
    });
  const balanced = check.remaining === 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt v="h3" accessibilityRole="header">
          {t('sortV2.splitInto')}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={t('sortV2.closeSplit')} onPress={onClose} hitSlop={10} style={{ padding: 6 }}>
          <X size={22} color={colors.text} />
        </Pressable>
      </View>
      {parts.map((p, i) => {
        const cat = p.categoryId ? cats.find((c) => c.id === p.categoryId) : undefined;
        return (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.partAmount, { backgroundColor: colors.surfaceAlt }]}>
              <TextInput
                value={p.text}
                onChangeText={(v) => update(p.key, { text: v.replace(/[^\d.]/g, '') })}
                keyboardType="decimal-pad"
                {...NUMERIC_INPUT}
                placeholder="0.00"
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={`${t('sort.part', { n: i + 1 })} ${t('capture.amountLabel')}`}
                maxFontSizeMultiplier={1.4}
                style={{ minHeight: 48, fontSize: 18, fontFamily: fonts.bold, color: colors.text, fontVariant: ['tabular-nums'], padding: 0 }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('sortV2.partCategory', { n: i + 1 })}, ${cat?.name ?? t('common.unsorted')}`}
              onPress={() => setPicking(p.key)}
              style={[styles.partCat, { backgroundColor: cat ? colors.primary : colors.surface, borderColor: cat ? colors.primary : colors.lineStrong }]}>
              {/* B-52: shrinks to fit ("Choose", a category name) instead of "Choo..". */}
              <Txt
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                maxFontSizeMultiplier={1.4}
                style={{ fontSize: 15, fontFamily: fonts.semibold, color: cat ? colors.onPrimary : colors.text, flexShrink: 1 }}>
                {cat?.name ?? t('sortV2.choose')}
              </Txt>
              {cat ? null : <ChevronDown size={16} color={colors.text} />}
            </Pressable>
            <ScopePill value={p.scope} onChange={(scope) => update(p.key, { scope })} label={t('sortV2.partScope', { n: i + 1 })} />
          </View>
        );
      })}
      <View style={{ alignSelf: 'flex-start' }}>
        <Button label={t('sort.addPart')} icon={Plus} variant="text" size="sm" disabled={parts.length >= MAX_SPLIT_PARTS} onPress={addPart} />
      </View>
      <View
        accessible
        accessibilityLiveRegion="polite"
        style={[styles.left, { backgroundColor: balanced ? colors.incomeSoft : colors.warnSoft }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          {balanced ? <CheckCircle2 size={18} color={colors.incomeText} /> : null}
          <Txt style={{ fontFamily: fonts.semibold, color: balanced ? colors.incomeText : colors.warnText }}>{t('sort.leftToAssign')}</Txt>
        </View>
        <Txt v="amount" size={18} style={{ color: balanced ? colors.incomeText : colors.warnText }}>
          {balanced
            ? formatMoney(0, currency)
            : check.remaining > 0
              ? t('sort.left', { amount: formatMoney(check.remaining, currency) })
              : t('sort.over', { amount: formatMoney(-check.remaining, currency) })}
        </Txt>
      </View>
      <Button
        label={t('sortV2.splitAndSort')}
        full
        disabled={!check.valid}
        onPress={() => onSplit(parts.map((p) => ({ amountMinor: partMinor(p.text), categoryId: p.categoryId, scope: p.scope })))}
      />
      <CategorySheet
        visible={picking !== null}
        onClose={() => setPicking(null)}
        type={entry.type}
        allowUnsorted
        selectedId={parts.find((p) => p.key === picking)?.categoryId ?? null}
        onPick={(cid) => {
          if (picking !== null) update(picking, { categoryId: cid });
          setPicking(null);
        }}
      />
    </View>
  );
}

/** Small text action under the card ("Edit · Split · Merge · Skip"): four fit on a 360dp phone. */
function CardAction({ label, icon: Icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  const { colors } = useTheme();
  // QA-100 (phiên B, 360dp + text 2.0): side by side the labels were cut to "E… Sp.. Mer… Sk.." — at large text the
  // icon goes above a smaller label so all four fit.
  const stack = useWindowDimensions().fontScale >= 1.3;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.action, stack && { flexDirection: 'column', gap: 2, flexGrow: 1 }, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon size={18} color={colors.text} />
      <Txt numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: stack ? 13 : 15, fontFamily: fonts.semibold, flexShrink: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Compact W | P switch for a split part. */
function ScopePill({ value, onChange, label }: { value: Scope; onChange: (s: Scope) => void; label: string }) {
  const { colors } = useTheme();
  const opt = (s: Scope, text: string) => {
    const on = value === s;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={`${label}: ${s === 'work' ? t('common.work') : t('common.personal')}`}
        onPress={() => onChange(s)}
        style={[styles.pillOpt, on && { backgroundColor: s === 'work' ? colors.workFill : colors.personalFill }]}>
        <Txt style={{ fontSize: 15, fontFamily: fonts.bold, color: on ? colors.onScope : colors.textSecondary }}>{text}</Txt>
      </Pressable>
    );
  };
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
      {opt('work', t('sortV2.work1'))}
      {opt('personal', t('sortV2.personal1'))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 0,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  cardBody: { flexGrow: 1, gap: 14, padding: 20 },
  footer: { gap: 6, paddingHorizontal: 20, paddingBottom: 8 },
  more: { height: 44, borderRadius: 22, paddingHorizontal: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: radius.card, padding: 14, gap: 10 },
  box: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  partAmount: { width: 92, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  partCat: { flex: 1, minWidth: 0, minHeight: 48, borderRadius: 24, borderWidth: 1.5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  pill: { flexDirection: 'row', borderRadius: 24, padding: 3, gap: 2 },
  pillOpt: { width: 40, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  action: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, flexShrink: 1 },
  left: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, paddingHorizontal: 14, minHeight: 48 },
});
