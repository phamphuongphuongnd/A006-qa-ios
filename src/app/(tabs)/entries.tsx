import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { ArrowDownUp, Briefcase, ChevronDown, Combine, Plus, Search, SearchX, Tags, Trash2, X } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { entryCount, listEntries, type EntryListItem } from '@/db/entriesRepo';
import type { CategoryRow } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { planMerge } from '@/domain/splitMerge';
import { taxYearOf } from '@/domain/taxYear';
import { currencyOf, type Currency } from '@/domain/types';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { EntryRow } from '@/features/entries/EntryRow';
import { dateLabel, dayHeader, dayTotalLabel, groupByDay } from '@/features/entries/format';
import { commonType, EMPTY_FILTER, hasActiveFilter, toggledScope, toRepoFilter, type DateRange, type EntriesFilterState } from '@/features/entries/logic';
import { SwipeRow } from '@/features/entries/SwipeRow';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { useNow } from '@/features/entries/useNow';
import { t, type TKey } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useDebounced } from '@/state/useDebounced';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Avatar, Button, Chip, Dialog, Dot, EmptyState, Fab, IconButton, Sheet, Txt, useSnackbar } from '@/ui';

/** Flat list: a day header followed by that day's entries (drawn as one card made of slices). */
type ListItem =
  | { kind: 'day'; key: string; title: string; total: string }
  | { kind: 'row'; key: string; item: EntryListItem; first: boolean; last: boolean };

/** One entry slice of a day card; memoised so scrolling / selecting re-renders only rows whose props changed. */
const EntryCardRow = memo(function EntryCardRow({
  item,
  first,
  last,
  category,
  selecting,
  selected,
  onOpen,
  onToggle,
  onDelete,
  onToggleScope,
}: {
  item: EntryListItem;
  first: boolean;
  last: boolean;
  category: CategoryRow | undefined;
  selecting: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleScope: (item: EntryListItem) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.cardSlice,
        { backgroundColor: colors.surface, borderColor: colors.line },
        first && styles.sliceFirst,
        last && styles.sliceLast,
      ]}>
      <SwipeRow resetKey={item.id} scope={item.scope} enabled={!selecting} onDelete={() => onDelete(item.id)} onToggleScope={() => onToggleScope(item)}>
        <View style={[styles.rowPad, { backgroundColor: colors.surface }]}>
          <EntryRow
            entry={item}
            category={category}
            currency={item.currency as Currency}
            divider={!first}
            selecting={selecting}
            selected={selected}
            onPress={() => (selecting ? onToggle(item.id) : onOpen(item.id))}
            onLongPress={() => onToggle(item.id)}
          />
        </View>
      </SwipeRow>
    </View>
  );
});

const DATE_OPTIONS: { value: DateRange; key: TKey }[] = [
  { value: 'any', key: 'entries.dateAny' },
  { value: 'thisWeek', key: 'entries.dateThisWeek' },
  { value: 'lastWeek', key: 'entries.dateLastWeek' },
  { value: 'thisMonth', key: 'entries.dateThisMonth' },
  { value: 'lastMonth', key: 'entries.dateLastMonth' },
  { value: 'taxYear', key: 'entries.dateTaxYear' },
];

/**
 * S-04 Entries. Deep-link params (e.g. from Reports): `unsorted=1`, `categoryId`, `from` + `to` (epoch ms), `type`.
 * Long-press → multi-select with its own action bar in place of the tab bar.
 */
export default function EntriesScreen() {
  const params = useLocalSearchParams<{ unsorted?: string; categoryId?: string; from?: string; to?: string; type?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { settings } = useSettings();
  const snack = useSnackbar();
  const actions = useEntryActions();
  const now = useNow();
  const region = settings.region ?? 'UK';
  const currency = currencyOf(region);

  // Deep-link params seed the filters; a new set of params (another tap in Reports) resets them.
  const paramKey = `${params.unsorted ?? ''}|${params.categoryId ?? ''}|${params.from ?? ''}|${params.to ?? ''}|${params.type ?? ''}`;
  const [filter, setFilter] = useState<EntriesFilterState>(() => filterFromParams(params));
  const [seenKey, setSeenKey] = useState(paramKey);
  if (seenKey !== paramKey) {
    setSeenKey(paramKey);
    setFilter(filterFromParams(params));
  }
  const [oldestFirst, setOldestFirst] = useState(false);
  const [picked, setSelected] = useState<string[] | null>(null);
  const [sheet, setSheet] = useState<'date' | 'category' | 'setCategory' | null>(null);
  const [dialog, setDialog] = useState<'merge' | 'delete' | null>(null);

  const taxYear = taxYearOf(now, region);
  // Typing in search re-queries once the user pauses, not on every key.
  const search = useDebounced(filter.search, 150);
  const repoFilter = toRepoFilter({ ...filter, search }, now, taxYear);
  const repoKey = JSON.stringify(repoFilter);
  const total = useLive(() => entryCount(db), [], ['entries']);
  const cats = useLive(() => listCategories(db, { includeHidden: true }), [], ['categories']);
  // repoKey is repoFilter by value.
  const rowsLive = useLive(() => listEntries(db, repoFilter), [repoKey], ['entries', 'receipts']);
  const data = { total, rows: rowsLive };
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const items = useMemo(() => {
    const rows = oldestFirst ? [...rowsLive].reverse() : rowsLive;
    const out: ListItem[] = [];
    for (const g of groupByDay(rows)) {
      out.push({ kind: 'day', key: `d${g.key}`, title: dayHeader(g.at, now), total: dayTotalLabel(g, currency) });
      g.items.forEach((it, i) => out.push({ kind: 'row', key: it.id, item: it, first: i === 0, last: i === g.items.length - 1 }));
    }
    return out;
  }, [rowsLive, oldestFirst, now, currency]);

  // Ids that vanished (deleted / merged meanwhile) drop out of the selection.
  const rowIds = useMemo(() => new Set(rowsLive.map((r) => r.id)), [rowsLive]);
  const selected = picked ? picked.filter((id) => rowIds.has(id)) : null;
  const selecting = selected !== null;
  const selectedSet = new Set(selected ?? []);
  const selRows = selecting ? rowsLive.filter((r) => selectedSet.has(r.id)) : [];
  const selType = commonType(selRows.map((r) => r.type));

  // Multi-select replaces the tab bar with its action bar; Android back leaves selection first.
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: selecting ? { display: 'none' } : undefined });
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selecting, navigation]);

  const toggle = useCallback(
    (id: string) =>
      setSelected((cur0) => {
        const cur = cur0 ?? [];
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        return next.length ? next : null;
      }),
    [],
  );
  const openEntry = useCallback((id: string) => router.push(`/entry/${id}`), []);
  const removeOne = useCallback((id: string) => actions.remove([id]), [actions]);
  const toggleScopeOne = useCallback(
    (item: EntryListItem) => {
      const to = item.scope === 'work' ? 'personal' : 'work';
      actions.patchMany([item.id], { scope: to }, t('entries.movedTo', { scope: to === 'work' ? t('common.work') : t('common.personal') }));
    },
    [actions],
  );

  const set = (patch: Partial<EntriesFilterState>) => setFilter((f) => ({ ...f, ...patch }));
  const chipsActive = hasActiveFilter({ ...filter, search: '' });
  const category = filter.categoryId ? catById.get(filter.categoryId) : undefined;
  const dateLabelText =
    filter.period ? t('entries.dateCustom') : filter.date !== 'any' ? t(DATE_OPTIONS.find((d) => d.value === filter.date)!.key) : t('entries.date');

  const doMerge = () => {
    const ids = selected ?? [];
    setDialog(null);
    if (actions.merge(ids)) setSelected(null);
  };
  const mergePlan = dialog === 'merge' ? planMerge(selRows) : null;

  const renderItem = ({ item }: { item: ListItem }) =>
    item.kind === 'day' ? (
      <View style={styles.gh}>
        <Txt v="label" c="textTertiary">
          {item.title}
        </Txt>
        <Txt v="small" style={{ fontFamily: fonts.bold }} c={item.total.startsWith('+') ? 'incomeText' : 'expenseText'}>
          {item.total}
        </Txt>
      </View>
    ) : (
      <EntryCardRow
        item={item.item}
        first={item.first}
        last={item.last}
        category={item.item.categoryId ? catById.get(item.item.categoryId) : undefined}
        selecting={selecting}
        selected={selectedSet.has(item.item.id)}
        onOpen={openEntry}
        onToggle={toggle}
        onDelete={removeOne}
        onToggleScope={toggleScopeOne}
      />
    );

  const header = selecting ? (
    <View style={[styles.selTop, { backgroundColor: colors.primary, paddingTop: insets.top + 10, paddingHorizontal: GUTTER }]}>
      <IconButton icon={X} label={t('entries.cancelSelection')} color="onPrimary" onPress={() => setSelected(null)} />
      <Txt v="h2" style={{ flex: 1, color: colors.onPrimary }} accessibilityLiveRegion="polite">
        {t('entries.selected', { count: selected.length })}
      </Txt>
      {selType ? (
        <Txt v="small" style={{ color: colors.onPrimary, opacity: 0.8 }}>
          {formatMoney(
            selRows.reduce((a, r) => a + r.amountMinor, 0),
            currency,
          )}
        </Txt>
      ) : null}
    </View>
  ) : (
    <View style={[styles.top, { paddingTop: insets.top + 14, paddingHorizontal: GUTTER }]}>
      <Txt v="h1" accessibilityRole="header" style={{ flex: 1 }}>
        {t('entries.title')}
      </Txt>
      <IconButton
        icon={ArrowDownUp}
        filled
        label={`${t('entries.sortOrder')}: ${oldestFirst ? t('entries.oldestFirst') : t('entries.newestFirst')}`}
        onPress={() => setOldestFirst((v) => !v)}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      {!selecting ? (
        <View style={{ gap: 12, paddingTop: 6, paddingBottom: 6 }}>
          <View style={[styles.search, { backgroundColor: colors.surfaceAlt, marginHorizontal: GUTTER }]}>
            <Search size={22} color={colors.textSecondary} />
            <TextInput
              value={filter.search}
              onChangeText={(v) => set({ search: v })}
              placeholder={t('entries.search')}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              accessibilityLabel={t('entries.search')}
              maxFontSizeMultiplier={1.6}
              style={{ flex: 1, minHeight: 48, fontSize: 16, fontFamily: fonts.regular, color: colors.text }}
            />
            {filter.search ? <IconButton icon={X} size={40} label={t('common.close')} onPress={() => set({ search: '' })} /> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }} keyboardShouldPersistTaps="handled">
            <Chip label={t('entries.all')} size="s" state={chipsActive ? 'default' : 'on'} onPress={() => setFilter({ ...EMPTY_FILTER, search: filter.search })} />
            <FilterChip label={t('entries.unsorted')} on={filter.unsorted} dot onPress={() => set({ unsorted: !filter.unsorted })} />
            <Chip label={t('entries.income')} size="s" state={filter.type === 'income' ? 'on' : 'default'} onPress={() => set({ type: filter.type === 'income' ? null : 'income' })} />
            <Chip label={t('entries.expenses')} size="s" state={filter.type === 'expense' ? 'on' : 'default'} onPress={() => set({ type: filter.type === 'expense' ? null : 'expense' })} />
            <Chip label={t('entries.work')} size="s" state={filter.scope === 'work' ? 'on' : 'default'} onPress={() => set({ scope: filter.scope === 'work' ? null : 'work' })} />
            <Chip label={t('entries.personal')} size="s" state={filter.scope === 'personal' ? 'on' : 'default'} onPress={() => set({ scope: filter.scope === 'personal' ? null : 'personal' })} />
            <Chip label={t('entries.withReceipt')} size="s" state={filter.withReceipt ? 'on' : 'default'} onPress={() => set({ withReceipt: !filter.withReceipt })} />
            <FilterChip label={dateLabelText} on={filter.date !== 'any' || !!filter.period} drop onPress={() => setSheet('date')} />
            <FilterChip label={category?.name ?? t('entries.category')} on={!!category} drop onPress={() => setSheet('category')} />
          </ScrollView>
        </View>
      ) : null}

      {data.total === 0 ? (
        <EmptyState
          title={t('entries.empty')}
          action={<Button label={t('entries.addFirst')} icon={Plus} full onPress={() => router.push('/capture?type=expense')} />}
        />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 60, paddingHorizontal: GUTTER }}>
          <Avatar kind="neutral" icon={SearchX} size={80} />
          <Txt v="h2" center>
            {t('entries.noMatch')}
          </Txt>
          <Button label={t('entries.clearFilters')} variant="outline" size="sm" onPress={() => setFilter(EMPTY_FILTER)} />
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(it) => it.key}
          getItemType={(it) => it.kind}
          renderItem={renderItem}
          extraData={selectedSet}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: selecting ? 24 : 110, paddingTop: selecting ? 14 : 0 }}
        />
      )}

      {!selecting && data.total > 0 ? <Fab icon={Plus} label={t('entries.newEntry')} onPress={() => router.push('/capture?type=expense')} /> : null}

      {selecting ? (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <BarAction
            icon={Combine}
            label={t('entries.merge')}
            dim={selRows.length < 2 || !selType}
            onPress={() => {
              if (!selType) snack({ message: t('entries.mergeSameType'), above: 'none', bottomOffset: 76 });
              else if (selRows.length >= 2) setDialog('merge');
            }}
          />
          <BarAction
            icon={Tags}
            label={t('entries.setCategory')}
            dim={!selType}
            onPress={() => (selType ? setSheet('setCategory') : snack({ message: t('entries.categorySameType'), above: 'none', bottomOffset: 76 }))}
          />
          <BarAction
            icon={Briefcase}
            label={t('entries.workPersonal')}
            onPress={() => {
              const to = toggledScope(selRows.map((r) => r.scope));
              actions.patchMany(
                selRows.map((r) => r.id),
                { scope: to },
                t('entries.scopeSet', { count: selRows.length, scope: to === 'work' ? t('common.work') : t('common.personal') }),
              );
              setSelected(null);
            }}
          />
          <BarAction icon={Trash2} label={t('common.delete')} danger onPress={() => setDialog('delete')} />
        </View>
      ) : null}

      <Sheet visible={sheet === 'date'} onClose={() => setSheet(null)} title={t('entries.date')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DATE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={t(o.key)}
              state={!filter.period && filter.date === o.value ? 'on' : 'default'}
              onPress={() => {
                set({ date: o.value, period: null });
                setSheet(null);
              }}
            />
          ))}
        </View>
      </Sheet>
      <CategorySheet
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        title={t('entries.category')}
        selectedId={filter.categoryId ?? undefined}
        onPick={(id) => {
          set({ categoryId: filter.categoryId === id ? null : id });
          setSheet(null);
        }}
      />
      <CategorySheet
        visible={sheet === 'setCategory'}
        onClose={() => setSheet(null)}
        type={selType}
        title={t('entries.setCategory')}
        onPick={(id) => {
          setSheet(null);
          if (!id) return;
          actions.patchMany(
            selRows.map((r) => r.id),
            { categoryId: id },
            t('entries.categorySet', { count: selRows.length }),
          );
          setSelected(null);
        }}
      />
      <Dialog
        visible={dialog === 'merge' && !!mergePlan?.ok}
        onClose={() => setDialog(null)}
        title={
          mergePlan?.ok
            ? t('entries.mergeTitle', {
                count: selRows.length,
                amount: formatMoney(mergePlan.merged.amountMinor, currency),
                type: mergePlan.merged.type === 'income' ? t('capture.typeIncome') : t('capture.typeExpense'),
              })
            : ''
        }
        actions={[
          { label: t('common.cancel'), onPress: () => setDialog(null) },
          { label: t('entries.merge'), variant: 'primary', onPress: doMerge },
        ]}>
        {mergePlan?.ok ? (
          <View style={[styles.preview, { backgroundColor: colors.surfaceAlt }]}>
            <PreviewRow label={t('entries.mergeDate')} value={dateLabel(mergePlan.merged.occurredAt)} />
            <PreviewRow label={t('entries.mergeNote')} value={mergePlan.merged.note || t('common.noNote')} />
            <PreviewRow
              label={t('entries.mergeCategory')}
              value={(mergePlan.merged.categoryId && catById.get(mergePlan.merged.categoryId)?.name) || t('common.unsorted')}
            />
          </View>
        ) : null}
      </Dialog>
      <Dialog
        visible={dialog === 'delete'}
        onClose={() => setDialog(null)}
        title={selRows.length === 1 ? t('entries.deleteTitle') : t('entries.deleteManyTitle', { count: selRows.length })}
        body={selRows.length === 1 ? t('entries.deleteBody') : t('entries.deleteManyBody')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDialog(null) },
          {
            label: t('common.delete'),
            variant: 'danger',
            onPress: () => {
              setDialog(null);
              actions.remove(selRows.map((r) => r.id));
              setSelected(null);
            },
          },
        ]}
      />
    </View>
  );
}

function filterFromParams(p: { unsorted?: string; categoryId?: string; from?: string; to?: string; type?: string }): EntriesFilterState {
  const from = Number(p.from);
  const to = Number(p.to);
  return {
    ...EMPTY_FILTER,
    unsorted: p.unsorted === '1',
    categoryId: p.categoryId || null,
    type: p.type === 'income' || p.type === 'expense' ? p.type : null,
    period: p.from && p.to && Number.isFinite(from) && Number.isFinite(to) && to > from ? { start: from, end: to } : null,
  };
}

/** Small filter chip with an optional leading yellow dot (Unsorted) or trailing ▾ (Date / Category). */
function FilterChip({ label, on, onPress, dot, drop }: { label: string; on: boolean; onPress: () => void; dot?: boolean; drop?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.drop,
        { backgroundColor: on ? colors.primary : colors.surface, borderColor: on ? 'transparent' : colors.lineStrong, borderWidth: on ? 0 : 1.5 },
      ]}>
      {dot && !on ? <Dot /> : null}
      <Txt maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ fontSize: 14, fontFamily: fonts.semibold, color: on ? colors.onPrimary : colors.text, maxWidth: 160 }}>
        {label}
      </Txt>
      {drop ? <ChevronDown size={16} color={on ? colors.onPrimary : colors.text} /> : null}
    </Pressable>
  );
}

function BarAction({ icon: Icon, label, onPress, danger, dim }: { icon: typeof Trash2; label: string; onPress: () => void; danger?: boolean; dim?: boolean }) {
  const { colors } = useTheme();
  const c = danger ? colors.error : colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!dim }} onPress={onPress} style={[styles.barBtn, { opacity: dim ? 0.4 : 1 }]}>
      <View style={styles.pill}>
        <Icon size={24} color={c} />
      </View>
      <Txt maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold, color: c }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.medium }}>
        {label}
      </Txt>
      <Txt v="caption" numberOfLines={1} style={{ fontFamily: fonts.bold, flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  selTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  search: { minHeight: 48, borderRadius: 24, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, paddingBottom: 8 },
  cardSlice: { overflow: 'hidden', borderLeftWidth: 1, borderRightWidth: 1 },
  sliceFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  sliceLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card, marginBottom: 4 },
  rowPad: { paddingHorizontal: 14 },
  drop: { height: 36, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBar: { flexDirection: 'row', paddingTop: 6, paddingHorizontal: 8, borderTopWidth: 1 },
  barBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56 },
  pill: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center' },
  preview: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
});
