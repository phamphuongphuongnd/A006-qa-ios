import { useLocalSearchParams } from 'expo-router';
import { ChevronDown, RotateCcw , Repeat, Zap } from '@/ui/icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import type { EntryType } from '@/domain/types';
import { weekOf } from '@/domain/week';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { dayMonth, signedAmount } from '@/features/entries/format';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { useNow } from '@/features/entries/useNow';
import { autoSortedIn, markAutoReviewed, restoreRuleEntries, rulesByIds, unsortRuleEntries, type AutoSortedItem } from '@/features/rules/repo';
import { NavHeader } from '@/features/settings/ui';
import { t, tn } from '@/i18n';
import { router } from '@/services/router';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Badge, Button, Card, EmptyState, Screen, Txt, useSnackbar } from '@/ui';

interface Group {
  key: string;
  kind: 'rule' | 'recurring';
  ruleId: string | null;
  title: string;
  items: AutoSortedItem[];
}

/**
 * S-06d Auto-sorted this week (Pro): entries rules and recurring templates sorted, grouped ("Shell → Fuel · 4
 * entries"). Change any chip; "Undo all from this rule" sends a group back to the queue; "Edit rule" opens S-18.
 * Opening it marks the week's rule-sorted entries reviewed (they leave "N auto-sorted"). Param: `week` (start ms).
 */
export default function AutoSortedScreen() {
  const params = useLocalSearchParams<{ week?: string }>();
  const { colors } = useTheme();
  const snack = useSnackbar();
  const actions = useEntryActions({ above: 'none' });
  const now = useNow();
  const week = weekOf(params.week ? Number(params.week) : now);
  const [picking, setPicking] = useState<AutoSortedItem | null>(null);

  useEffect(() => {
    markAutoReviewed(db, week);
  }, [week.start]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useLive(
    () => {
      const items = autoSortedIn(db, week);
      const rules = rulesByIds(db, [...new Set(items.map((i) => i.ruleId).filter((x): x is string => !!x))]);
      return { items, rules };
    },
    [week.start],
    ['entries', 'rules'],
  );
  const cats = useLive(() => listCategories(db, { includeHidden: true }), [], ['categories']);
  const catName = (id: string | null) => (id ? (cats.find((c) => c.id === id)?.name ?? '') : t('common.unsorted'));

  const groups: Group[] = [];
  const byKey = new Map<string, Group>();
  for (const it of data.items) {
    const key = it.ruleId ? `r:${it.ruleId}` : `c:${it.recurringId}`;
    let g = byKey.get(key);
    if (!g) {
      const rule = it.ruleId ? data.rules.find((r) => r.id === it.ruleId) : undefined;
      g = {
        key,
        kind: it.ruleId ? 'rule' : 'recurring',
        ruleId: it.ruleId,
        title: it.ruleId
          ? rule
            ? `${rule.matchText} → ${catName(rule.categoryId)}`
            : t('sortV2.deletedRule')
          : t('sortV2.recurringGroup', { name: it.note || t('common.noNote') }),
        items: [],
      };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(it);
  }

  const undoAll = (ruleId: string) => {
    const u = unsortRuleEntries(db, ruleId, week);
    snack({
      above: 'none',
      message: tn('sortV2.undoneAll', u.rows.length),
      actionLabel: t('common.undo'),
      onAction: () => restoreRuleEntries(db, u),
    });
  };

  return (
    <Screen header={<NavHeader title={t('sortV2.reviewTitle')} right={<Badge kind="pro" label="PRO" />} />}>
      {groups.length === 0 ? (
        <EmptyState title={t('sortV2.reviewEmpty')} body={t('sortV2.reviewEmptyBody')} />
      ) : (
        groups.map((g) => (
          <Card key={g.key} style={{ gap: 4, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {g.kind === 'rule' ? <Zap size={18} color={colors.sunText} /> : <Repeat size={18} color={colors.sunText} />}
              <Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>
                {g.title}
              </Txt>
              <Txt v="small" c="textSecondary">
                {g.items.length === 1 ? t('sortV2.entriesOne') : t('sortV2.entriesCount', { count: g.items.length })}
              </Txt>
            </View>
            {g.items.map((it, i) => (
              <View
                key={it.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.line }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                    {it.note || t('common.noNote')}
                  </Txt>
                  <Txt v="small" c="textSecondary">
                    {`${signedAmount(it.type, it.amountMinor, it.currency)} · ${dayMonth(it.occurredAt)}`}
                  </Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('sortV2.changeCategory', { name: catName(it.categoryId) })}
                  onPress={() => setPicking(it)}
                  style={{
                    minHeight: 44,
                    maxWidth: 180,
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: colors.lineStrong,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                  <Txt numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontFamily: fonts.semibold, flexShrink: 1 }}>
                    {catName(it.categoryId)}
                  </Txt>
                  <ChevronDown size={16} color={colors.text} />
                </Pressable>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              {g.kind === 'rule' && g.ruleId ? (
                <>
                  <Button label={t('sortV2.undoAll')} icon={RotateCcw} variant="text" size="sm" onPress={() => undoAll(g.ruleId!)} />
                  {data.rules.some((r) => r.id === g.ruleId) ? (
                    <Button label={t('sortV2.editRule')} variant="text" size="sm" onPress={() => router.push(`/rules?id=${g.ruleId}`)} />
                  ) : null}
                </>
              ) : (
                <Button label={t('sortV2.editRecurring')} variant="text" size="sm" onPress={() => router.push('/recurring')} />
              )}
            </View>
          </Card>
        ))
      )}
      <View style={{ height: GUTTER }} />
      <CategorySheet
        visible={!!picking}
        onClose={() => setPicking(null)}
        type={picking?.type as EntryType | undefined}
        selectedId={picking?.categoryId ?? null}
        onPick={(id) => {
          const it = picking;
          setPicking(null);
          if (it && id && id !== it.categoryId) actions.sortOne(it.id, id, catName(id));
        }}
      />
    </Screen>
  );
}
