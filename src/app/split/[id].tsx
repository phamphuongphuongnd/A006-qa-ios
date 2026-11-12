import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { CheckCircle2, ChevronDown, Plus, Trash2, X } from '@/ui/icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { getEntry, listReceipts } from '@/db/entriesRepo';
import type { EntryRow } from '@/db/schema';
import { currencySymbol, formatMoney, toDecimalString } from '@/domain/money';
import { checkSplit, defaultSplit, MAX_SPLIT_PARTS } from '@/domain/splitMerge';
import type { Currency, Scope } from '@/domain/types';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { dateDotTime } from '@/features/entries/format';
import { newPartMinor, partMinor } from '@/features/entries/logic';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { receiptUri } from '@/files/receipts';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Button, Card, EmptyState, IconButton, ReceiptThumb, Segmented, Txt } from '@/ui';

interface Part {
  key: number;
  text: string;
  categoryId: string | null;
  scope: Scope;
  note: string;
}

/** S-06b Split entry: N parts (2–10) that must add up to the original; every part keeps the receipt photos. */
export default function SplitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Read once: after the split the source entry is gone and this screen leaves.
  const [entry] = useState(() => getEntry(db, id));
  if (!entry) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState title={t('common.entryGone')} action={<Button label={t('common.close')} variant="outline" onPress={() => router.back()} />} />
      </View>
    );
  }
  return <SplitEditor entry={entry} />;
}

function SplitEditor({ entry }: { entry: EntryRow }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const actions = useEntryActions();
  const currency = entry.currency as Currency;
  const total = entry.amountMinor;

  const [parts, setParts] = useState<Part[]>(() =>
    defaultSplit(total, 2).map((m, i) => ({ key: i, text: toDecimalString(m), categoryId: null, scope: entry.scope, note: entry.note })),
  );
  const [picking, setPicking] = useState<number | null>(null);
  const data = useLive(
    () => ({ receipts: listReceipts(db, entry.id), cats: listCategories(db, { includeHidden: true }) }),
    [entry.id],
    ['receipts', 'categories'],
  );

  const minors = parts.map((p) => partMinor(p.text));
  const check = checkSplit(total, minors);
  const update = (key: number, patch: Partial<Part>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const addPart = () =>
    setParts((ps) => {
      if (ps.length >= MAX_SPLIT_PARTS) return ps;
      const m = newPartMinor(total, ps.map((p) => partMinor(p.text)));
      const key = Math.max(...ps.map((p) => p.key)) + 1;
      return [...ps, { key, text: m > 0 ? toDecimalString(m) : '', categoryId: null, scope: entry.scope, note: entry.note }];
    });

  const doSplit = () => {
    if (!check.valid) return;
    const ok = actions.split(
      entry.id,
      parts.map((p) => ({ amountMinor: partMinor(p.text), categoryId: p.categoryId, scope: p.scope, note: p.note })),
    );
    if (ok) router.back();
  };

  const remaining = check.remaining;
  const balanced = remaining === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 8 : insets.top }}>
      <View style={[styles.top, { paddingHorizontal: GUTTER }]}>
        <IconButton icon={X} label={t('common.close')} onPress={() => router.back()} />
        <Txt v="h3" accessibilityRole="header">
          {t('sort.splitTitle', { amount: formatMoney(total, currency) })}
        </Txt>
        <View style={{ width: 48 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {data.receipts[0] ? <ReceiptThumb uri={receiptUri(data.receipts[0].filePath)} size={48} /> : null}
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.bold }}>{entry.note || t('common.noNote')}</Txt>
              <Txt v="small" c="textSecondary">
                {data.receipts.length > 0 ? `${dateDotTime(entry.occurredAt)} · ${t('sort.splitReceiptAll')}` : dateDotTime(entry.occurredAt)}
              </Txt>
            </View>
          </View>

          {parts.map((p, i) => {
            const cat = p.categoryId ? data.cats.find((c) => c.id === p.categoryId) : undefined;
            return (
              <Card key={p.key} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Txt v="label" c="textTertiary">
                    {t('sort.part', { n: i + 1 })}
                  </Txt>
                  {parts.length > 2 ? (
                    <IconButton icon={Trash2} size={40} label={t('sort.removePart')} onPress={() => setParts((ps) => ps.filter((x) => x.key !== p.key))} />
                  ) : (
                    <View style={{ height: 40 }} />
                  )}
                </View>
                <View style={[styles.amountInput, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
                  <Txt c="textTertiary" style={{ fontSize: 22, fontFamily: fonts.semibold }}>
                    {currencySymbol(currency)}
                  </Txt>
                  <TextInput
                    value={p.text}
                    onChangeText={(v) => update(p.key, { text: v.replace(/[^\d.]/g, '') })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                    accessibilityLabel={`${t('sort.part', { n: i + 1 })} ${t('capture.amountLabel')}`}
                    maxFontSizeMultiplier={1.4}
                    style={{ flex: 1, minHeight: 52, fontSize: 22, fontFamily: fonts.extrabold, color: colors.text, fontVariant: ['tabular-nums'] }}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('entries.mergeCategory')}, ${cat?.name ?? t('common.unsorted')}`}
                    onPress={() => setPicking(p.key)}
                    style={[styles.catChip, { borderColor: cat ? colors.primary : colors.lineStrong, borderWidth: cat ? 2 : 1.5, backgroundColor: colors.surface }]}>
                    <Txt numberOfLines={1} maxFontSizeMultiplier={1.6} style={{ fontSize: 14, fontFamily: fonts.semibold, flexShrink: 1 }}>
                      {cat?.name ?? t('common.unsorted')}
                    </Txt>
                    <ChevronDown size={16} color={colors.text} />
                  </Pressable>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Segmented<Scope>
                      value={p.scope}
                      onChange={(scope) => update(p.key, { scope })}
                      options={[
                        { value: 'work', label: t('common.work') },
                        { value: 'personal', label: t('common.personal') },
                      ]}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt v="small" c="textSecondary">
                    {`${t('sort.partNote')}:`}
                  </Txt>
                  <TextInput
                    value={p.note}
                    onChangeText={(v) => update(p.key, { note: v })}
                    maxLength={120}
                    placeholder={t('entries.notePlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    accessibilityLabel={`${t('sort.part', { n: i + 1 })} ${t('sort.partNote')}`}
                    maxFontSizeMultiplier={1.6}
                    style={{ flex: 1, minHeight: 40, fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary }}
                  />
                </View>
              </Card>
            );
          })}

          <View style={{ alignSelf: 'flex-start' }}>
            <Button label={t('sort.addPart')} icon={Plus} variant="outline" size="sm" disabled={parts.length >= MAX_SPLIT_PARTS} onPress={addPart} />
          </View>
        </ScrollView>

        <View style={[styles.bottom, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} accessible accessibilityLiveRegion="polite">
            <Txt style={{ fontFamily: fonts.bold }}>{t('sort.leftToAssign')}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {balanced ? <CheckCircle2 size={22} color={colors.incomeText} /> : null}
              <Txt v="amount" size={20} c={balanced ? 'incomeText' : 'expenseText'}>
                {balanced
                  ? formatMoney(0, currency)
                  : remaining > 0
                    ? t('sort.left', { amount: formatMoney(remaining, currency) })
                    : t('sort.over', { amount: formatMoney(-remaining, currency) })}
              </Txt>
            </View>
          </View>
          <Button label={t('sort.splitAction')} full disabled={!check.valid} onPress={doSplit} />
        </View>
      </KeyboardAvoidingView>

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

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6 },
  amountInput: { minHeight: 56, borderRadius: radius.input, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catChip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  bottom: { paddingHorizontal: GUTTER, paddingTop: 12, gap: 12, borderTopWidth: 1 },
});
