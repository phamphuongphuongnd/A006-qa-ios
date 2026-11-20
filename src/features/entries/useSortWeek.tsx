import { Check, ChevronDown } from '@/ui/icons';
import { Pressable, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { listEntries, type EntryListItem } from '@/db/entriesRepo';
import type { CategoryRow, TripRow } from '@/db/schema';
import { mostUsed, sortChoice, type SuggestCategory } from '@/domain/suggest';
import type { Period, Scope } from '@/domain/types';
import { weekLabel, weekOf } from '@/domain/week';
import { unreviewedAutoCount } from '@/features/rules/repo';
import { t } from '@/i18n';
import { usePro } from '@/state/pro';
import { useLive } from '@/state/useLive';
import { fonts, useTheme } from '@/theme';
import { Progress, Sheet, Txt } from '@/ui';

import { mixedQueue, pickSortWeek, type QueueItem } from './logic';
import { categoryUsage90, openTrips, sortedQueueTrips, sortHistoryV2, sortWeeks } from './sortRepo';

export interface SortSuggestion {
  categories: CategoryRow[];
  scope: Scope | null;
  /**
   * Pro "Suggested" (history, merchant, amount, OCR, keywords) or "Most used" (90-day usage) — free, and Pro entries
   * with no real signal (L1). Only 'suggested' gets the gold first chip and counts for "Accept all".
   */
  kind: 'suggested' | 'mostUsed';
}

export type SortItem = QueueItem<EntryListItem, TripRow>;

/**
 * Data for the Sunday sort screens: the week being sorted (user's pick or the newest week with work), its entries and
 * Unsorted trips, progress, the card queue and `suggestFor(entry)` — Pro: `suggest()` over the user's sort history with
 * the receipt signals; free: the 3 most used categories (F-07).
 */
export function useSortWeek(chosen: number | null, skipped: string[] = []) {
  'use no memo';
  const { pro } = usePro();
  const data = useLive(
    () => {
      const weeks = sortWeeks(db);
      const week = pickSortWeek(chosen, weeks);
      return {
        weeks,
        week,
        entries: week ? listEntries(db, { period: week }) : ([] as EntryListItem[]),
        trips: week ? openTrips(db, week) : ([] as TripRow[]),
        tripsDone: week ? sortedQueueTrips(db, week) : 0,
        autoCount: week ? unreviewedAutoCount(db, week) : 0,
      };
    },
    [chosen],
    ['entries', 'receipts', 'trips'],
  );
  // Usage feeds "Most used" for everyone: free users, and Pro entries with no real signal (L1).
  const learn = useLive(
    () => ({
      history: pro ? sortHistoryV2(db) : [],
      usage: { income: categoryUsage90(db, 'income'), expense: categoryUsage90(db, 'expense') },
    }),
    [pro],
    ['entries'],
  );
  const cats = useLive(() => listCategories(db), [], ['categories']);
  const sugCats: SuggestCategory[] = cats.map((c) => ({ id: c.id, type: c.type, key: c.key, hidden: c.hidden, order: c.sortOrder }));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const toRows = (ids: string[]) => ids.map((id) => byId.get(id)).filter((c): c is CategoryRow => !!c);
  const suggestFor = (e: EntryListItem): SortSuggestion => {
    if (!pro) return { categories: toRows(mostUsed(e.type, sugCats, learn.usage[e.type])), scope: null, kind: 'mostUsed' };
    const s = sortChoice(
      { type: e.type, note: e.note, amountMinor: e.amountMinor, merchant: e.ocrMerchant, ocrAmountMinor: e.ocrAmountMinor },
      sugCats,
      learn.history,
      learn.usage[e.type],
    );
    return { categories: toRows(s.categoryIds), scope: s.scope, kind: s.kind };
  };
  const queue: SortItem[] = mixedQueue(data.entries, data.trips, skipped);
  const total = data.entries.length + data.trips.length + data.tripsDone;
  const done = data.entries.filter((e) => e.categoryId !== null).length + data.tripsDone;
  return { ...data, pro, cats, queue, total, done, suggestFor, autoCount: pro ? data.autoCount : 0 };
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
