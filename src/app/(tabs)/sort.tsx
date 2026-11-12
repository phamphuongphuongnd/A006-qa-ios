import { router } from 'expo-router';
import { Briefcase, List, Pencil, SkipForward, Split, User } from '@/ui/icons';
import { useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EntryListItem } from '@/db/entriesRepo';
import { listReceipts } from '@/db/entriesRepo';
import { db } from '@/db/client';
import { formatMoney } from '@/domain/money';
import type { Currency, Scope } from '@/domain/types';
import { SunIcon } from '@/features/entries/art';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { dateDotTime, dayMonth } from '@/features/entries/format';
import { sortCardScope } from '@/features/entries/logic';
import { categoryIcon } from '@/features/entries/icons';
import { ReceiptViewer } from '@/features/entries/ReceiptViewer';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { useSortWeek, WeekPickerSheet, WeekProgress, type SortSuggestion } from '@/features/entries/useSortWeek';
import { receiptUri } from '@/files/receipts';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Card, Chip, Divider, Segmented, Tag, Txt } from '@/ui';

/** S-06 Sort — one card at a time; tapping a category chip sorts it (Undo in the snackbar). */
export default function SortScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<number | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [weekSheet, setWeekSheet] = useState(false);
  const actions = useEntryActions();
  const s = useSortWeek(chosen, skipped);
  const top = s.queue[0];

  const header = (
    <View style={[styles.top, { paddingTop: insets.top + 14, paddingHorizontal: GUTTER }]}>
      <Txt v="h1" accessibilityRole="header" style={{ flex: 1 }}>
        {t('sort.title')}
      </Txt>
      {top ? (
        <Button
          label={t('sort.listView')}
          icon={List}
          variant="text"
          size="sm"
          onPress={() => router.push(`/sort-list?week=${s.week?.start ?? ''}`)}
        />
      ) : null}
    </View>
  );

  if (!s.week || !top) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: GUTTER, paddingBottom: 80 }}>
          <View style={[styles.sunCircle, { backgroundColor: colors.sunSoft }]}>
            <SunIcon />
          </View>
          <Txt v="h2" center accessibilityRole="header">
            {t('sort.nothing')}
          </Txt>
          <Txt c="textSecondary" center style={{ maxWidth: 280 }}>
            {t('sort.nothingSub')}
          </Txt>
        </View>
      </View>
    );
  }

  const week = s.week;
  const isLast = s.queue.length === 1;
  const sortTop = (categoryId: string, name: string, scope: Scope) => {
    actions.sortOne(top.id, categoryId, name, scope);
    setSkipped((sk) => sk.filter((id) => id !== top.id));
    if (isLast) router.push(`/sort-done?week=${week.start}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <View style={{ flex: 1, paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 16, gap: 12 }}>
        <WeekProgress week={week} done={s.done} total={s.total} onPick={() => setWeekSheet(true)} />
        <View style={{ flex: 1, marginTop: 6 }}>
          {s.queue.length > 2 ? <Card style={[styles.ghost, { left: 24, right: 24, top: 0, opacity: 0.5 }]}>{null}</Card> : null}
          {s.queue.length > 1 ? <Card style={[styles.ghost, { left: 12, right: 12, top: 8, opacity: 0.8 }]}>{null}</Card> : null}
          <SortCard
            key={top.id}
            entry={top}
            suggestion={s.suggestFor(top)}
            stacked={s.queue.length > 1}
            nameOf={(id) => s.cats.find((c) => c.id === id)?.name ?? ''}
            onSort={sortTop}
            onSkip={() => setSkipped((sk) => [...sk.filter((id) => id !== top.id), top.id])}
          />
        </View>
      </View>
      <WeekPickerSheet
        visible={weekSheet}
        onClose={() => setWeekSheet(false)}
        weeks={s.weeks}
        current={week.start}
        onPick={(start) => {
          setChosen(start);
          setSkipped([]);
          setWeekSheet(false);
        }}
      />
    </View>
  );
}

function SortCard({
  entry,
  suggestion,
  stacked,
  nameOf,
  onSort,
  onSkip,
}: {
  entry: EntryListItem;
  suggestion: SortSuggestion;
  stacked: boolean;
  nameOf: (categoryId: string) => string;
  onSort: (categoryId: string, name: string, scope: Scope) => void;
  onSkip: () => void;
}) {
  const { colors } = useTheme();
  const [scope, setScope] = useState<Scope>(() => sortCardScope(entry.scope, suggestion.scope));
  const [more, setMore] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [x] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
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
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: stacked ? 16 : 0, bottom: 0 }, { transform: [{ translateX: x }] }]}>
      <Card style={[styles.card, { shadowColor: '#161D2B' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ alignSelf: 'flex-start', height: 24, borderRadius: 12, paddingHorizontal: 9, justifyContent: 'center', backgroundColor: income ? colors.incomeSoft : colors.expenseSoft }}>
              <Txt style={{ fontSize: 12, fontFamily: fonts.bold, color: income ? colors.incomeText : colors.expenseText }}>
                {income ? t('common.income') : t('common.expense')}
              </Txt>
            </View>
            <Txt v="amount" c={income ? 'incomeText' : 'expenseText'} style={{ fontSize: 44, lineHeight: 50 }} adjustsFontSizeToFit numberOfLines={1}>
              {formatMoney(entry.amountMinor, currency)}
            </Txt>
            <Txt v="h3" numberOfLines={2}>
              {entry.note || t('common.noNote')}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt v="small" c="textSecondary">
                {dateDotTime(entry.occurredAt)}
              </Txt>
              {entry.scope === 'personal' ? <Tag kind="personal" label={t('common.personal')} /> : null}
            </View>
          </View>
          {receipts[0] ? (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={t('sort.viewReceipt')} onPress={() => setViewer(true)}>
              <View style={{ width: 72, height: 88, borderRadius: 12, overflow: 'hidden' }}>
                <Image source={{ uri: receiptUri(receipts[0].filePath) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
              </View>
            </Pressable>
          ) : null}
        </View>
        <Divider />
        <Txt v="label" c="textTertiary">
          {t('sort.suggested')}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {best.map((c, i) => (
            <Chip
              key={c.id}
              label={c.name}
              icon={i === 0 ? categoryIcon(c.icon) : undefined}
              state={i === 0 ? 'best' : 'default'}
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
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button label={t('sort.edit')} icon={Pencil} variant="text" size="sm" onPress={() => router.push(`/entry/${entry.id}`)} />
          <Button label={t('sort.split')} icon={Split} variant="text" size="sm" onPress={() => router.push(`/split/${entry.id}`)} />
          <Button label={t('sort.skip')} icon={SkipForward} variant="text" size="sm" onPress={skip} />
        </View>
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

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  sunCircle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute', height: 60 },
  card: {
    flex: 1,
    gap: 14,
    padding: 20,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  more: { height: 44, borderRadius: 22, paddingHorizontal: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
