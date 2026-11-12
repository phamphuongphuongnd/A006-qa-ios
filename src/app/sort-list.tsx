import { router, useLocalSearchParams } from 'expo-router';
import { Check, LayoutGrid, ListChecks } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EntryListItem } from '@/db/entriesRepo';
import type { Currency } from '@/domain/types';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { signedAmount, weekdayTime } from '@/features/entries/format';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { useSortWeek, WeekPickerSheet, WeekProgress } from '@/features/entries/useSortWeek';
import { t } from '@/i18n';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Button, Chip, Dialog, EmptyState, Tag, Txt } from '@/ui';

/** S-06a Sort · List view: best suggestion per entry, ✓ to accept, or accept all at once. Param: `week` (start ms). */
export default function SortListScreen() {
  const params = useLocalSearchParams<{ week?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<number | null>(params.week ? Number(params.week) : null);
  const [weekSheet, setWeekSheet] = useState(false);
  const [picking, setPicking] = useState<EntryListItem | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const actions = useEntryActions({ above: 'none', bottomOffset: 80 });
  const s = useSortWeek(chosen);
  const week = s.week;

  const rows = s.queue.map((e) => ({ entry: e, best: s.suggestFor(e).categories[0] }));
  const acceptable = rows.filter((r) => r.best);

  const finishIfDone = (sortedNow: number) => {
    if (week && sortedNow >= s.queue.length) router.replace(`/sort-done?week=${week.start}`);
  };

  const accept = (e: EntryListItem, categoryId: string, name: string) => {
    actions.sortOne(e.id, categoryId, name);
    finishIfDone(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.top, { paddingHorizontal: GUTTER }]}>
        <Txt v="h1" accessibilityRole="header" style={{ flex: 1 }}>
          {t('sort.title')}
        </Txt>
        <Button label={t('sort.cardView')} icon={LayoutGrid} variant="text" size="sm" onPress={() => router.back()} />
      </View>

      {!week || rows.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState title={t('sort.nothing')} body={t('sort.nothingSub')} />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 12 }}>
            <WeekProgress week={week} done={s.done} total={s.total} onPick={() => setWeekSheet(true)} />
          </View>
          <FlatList
            data={rows}
            keyExtractor={(r) => r.entry.id}
            contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 20 }}
            renderItem={({ item, index }) => {
              const e = item.entry;
              const first = index === 0;
              const last = index === rows.length - 1;
              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      borderTopWidth: first ? 1 : 0,
                      borderBottomWidth: last ? 1 : 0,
                      borderTopLeftRadius: first ? radius.card : 0,
                      borderTopRightRadius: first ? radius.card : 0,
                      borderBottomLeftRadius: last ? radius.card : 0,
                      borderBottomRightRadius: last ? radius.card : 0,
                    },
                  ]}>
                  <View style={[styles.inner, !first && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.sb}>
                        <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, flexShrink: 1 }}>
                          {e.note || t('common.noNote')}
                        </Txt>
                        <Txt v="amount" size={16} c={e.type === 'income' ? 'incomeText' : 'expenseText'}>
                          {signedAmount(e.type, e.amountMinor, e.currency as Currency)}
                        </Txt>
                      </View>
                      <View style={styles.sb}>
                        <View style={{ flexShrink: 1 }}>
                          <Chip size="s" state={item.best ? 'best' : 'default'} label={item.best?.name ?? t('sort.pickCategory')} onPress={() => setPicking(e)} />
                        </View>
                        {e.scope === 'personal' ? (
                          <Tag kind="personal" label={t('common.personal')} />
                        ) : (
                          <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.regular }}>
                            {weekdayTime(e.occurredAt)}
                          </Txt>
                        )}
                      </View>
                    </View>
                    {item.best ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('sort.accept', { name: item.best.name })}
                        onPress={() => accept(e, item.best!.id, item.best!.name)}
                        hitSlop={4}
                        style={[styles.ok, { backgroundColor: colors.incomeSoft }]}>
                        <Check size={24} color={colors.incomeText} strokeWidth={2.4} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
          <View style={[styles.bottom, { backgroundColor: colors.background, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            <Button
              label={t('sort.acceptAll', { count: acceptable.length })}
              icon={ListChecks}
              full
              disabled={acceptable.length === 0}
              onPress={() => setConfirmAll(true)}
            />
          </View>
        </>
      )}

      <WeekPickerSheet
        visible={weekSheet}
        onClose={() => setWeekSheet(false)}
        weeks={s.weeks}
        current={week?.start ?? null}
        onPick={(start) => {
          setChosen(start);
          setWeekSheet(false);
        }}
      />
      <CategorySheet
        visible={!!picking}
        onClose={() => setPicking(null)}
        type={picking?.type}
        onPick={(id) => {
          const e = picking;
          setPicking(null);
          if (e && id) accept(e, id, s.cats.find((c) => c.id === id)?.name ?? '');
        }}
      />
      <Dialog
        visible={confirmAll}
        onClose={() => setConfirmAll(false)}
        title={t('sort.acceptAllConfirm', { count: acceptable.length })}
        body={t('sort.acceptAllBody')}
        actions={[
          { label: t('common.cancel'), onPress: () => setConfirmAll(false) },
          {
            label: t('common.apply'),
            variant: 'primary',
            onPress: () => {
              setConfirmAll(false);
              actions.sortMany(acceptable.map((r) => ({ id: r.entry.id, categoryId: r.best!.id })));
              finishIfDone(acceptable.length);
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 6 },
  row: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 14 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingVertical: 10 },
  sb: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  ok: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  bottom: { paddingHorizontal: GUTTER, paddingTop: 12, borderTopWidth: 1 },
});
