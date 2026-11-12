import { Check, ChevronDown } from '@/ui/icons';
import { Pressable, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listEntries, sortHistory, unsortedWeeks, type EntryListItem } from '@/db/entriesRepo';
import type { CategoryRow } from '@/db/schema';
import { suggest, type SuggestCategory } from '@/domain/suggest';
import type { Period, Scope } from '@/domain/types';
import { weekLabel, weekOf } from '@/domain/week';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Progress, Sheet, Txt } from '@/ui';

import { pickSortWeek, sortQueue } from './logic';

export interface SortSuggestion {
  categories: CategoryRow[];
  scope: Scope | null;
}

/**
 * Data for the Sunday sort screens: the week being sorted (user's pick or the newest week with work), its entries,
 * progress, card queue and a `suggestFor(entry)` backed by `suggest()` + the user's sort history.
 */
export function useSortWeek(chosen: number | null, skipped: string[] = []) {
  const data = useLive(
    () => {
      const weeks = unsortedWeeks(db);
      const week = pickSortWeek(chosen, weeks);
      return {
        weeks,
        week,
        entries: week ? listEntries(db, { period: week }) : ([] as EntryListItem[]),
        history: sortHistory(db),
      };
    },
    [chosen],
    ['entries', 'receipts'],
  );
  const cats = useLive(() => listCategories(db), [], ['categories']);
  const sugCats: SuggestCategory[] = cats.map((c) => ({ id: c.id, type: c.type, key: c.key, hidden: c.hidden, order: c.sortOrder }));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const suggestFor = (e: EntryListItem): SortSuggestion => {
    const s = suggest({ type: e.type, note: e.note, amountMinor: e.amountMinor }, sugCats, data.history);
    return { categories: s.categoryIds.map((id) => byId.get(id)).filter((c): c is CategoryRow => !!c), scope: s.scope };
  };
  const total = data.entries.length;
  const done = data.entries.filter((e) => e.categoryId !== null).length;
  return { ...data, cats, queue: sortQueue(data.entries, skipped), total, done, suggestFor };
}

export const weekChipLabel = (week: Period, now = Date.now()) =>
  week.start === weekOf(now).start ? t('sort.thisWeek', { range: weekLabel(week) }) : weekLabel(week);

/** "This week · 9–15 Nov ▾" chip + "9 of 14 sorted" + yellow progress bar. */
export function WeekProgress({ week, done, total, onPick }: { week: Period; done: number; total: number; onPick: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${weekChipLabel(week)}. ${t('sort.pickWeek')}`}
          onPress={onPick}
          hitSlop={6}
          style={{
            minHeight: 36,
            borderRadius: 18,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1.5,
            borderColor: colors.lineStrong,
            backgroundColor: colors.surface,
            flexShrink: 1,
          }}>
          <Txt numberOfLines={2} maxFontSizeMultiplier={1.6} style={{ fontSize: 14, fontFamily: fonts.semibold, flexShrink: 1 }}>
            {weekChipLabel(week)}
          </Txt>
          <ChevronDown size={16} color={colors.text} />
        </Pressable>
        <Txt v="small" style={{ fontFamily: fonts.bold }}>
          {t('sort.progress', { done, total })}
        </Txt>
      </View>
      <Progress value={total ? done / total : 0} />
    </View>
  );
}

/** Weeks that still have unsorted entries, newest first ("2–8 Nov · 3 left"). */
export function WeekPickerSheet({
  visible,
  onClose,
  weeks,
  current,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  weeks: { week: Period; count: number }[];
  current: number | null;
  onPick: (start: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('sort.pickWeek')}>
      <View>
        {weeks.map((w, i) => {
          const on = w.week.start === current;
          return (
            <Pressable
              key={w.week.start}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onPick(w.week.start)}
              style={({ pressed }) => ({
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: colors.line,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Txt style={{ flex: 1, fontFamily: on ? fonts.bold : fonts.regular }}>
                {t('sort.weekLeft', { range: weekChipLabel(w.week), count: w.count })}
              </Txt>
              {on ? <Check size={22} color={colors.text} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
