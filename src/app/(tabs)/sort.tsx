import { router } from '@/services/router';
import { List } from '@/ui/icons';
import { Zap } from '@/features/rules/icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import type { Scope } from '@/domain/types';
import { SunIcon } from '@/features/entries/art';
import { CaptureFab } from '@/features/entries/CaptureFab';
import { MergeSheet } from '@/features/entries/MergeSheet';
import { SortEntryCard } from '@/features/entries/SortEntryCard';
import { SortTripCard } from '@/features/entries/SortTripCard';
import { sortTrip, undoSortTrip } from '@/features/entries/sortRepo';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { useSortWeek, WeekPickerSheet, WeekProgress, type SortItem } from '@/features/entries/useSortWeek';
import { acceptOffer, declineOffer, deleteRule, ruleOfferAfterSort, type RuleOffer } from '@/features/rules/repo';
import { RuleOfferCard } from '@/features/rules/RuleOfferCard';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Card, Txt, useSnackbar } from '@/ui';

/**
 * S-06 Sort — one card at a time (entries and Unsorted trips). Tapping a category chip / Work / Personal sorts it
 * (Undo in the snackbar); Edit / Split / Merge happen on the card (Q5). Pro: "N auto-sorted · Review" and the
 * one-tap rule offer after the 3rd same-place sort (P1-10).
 */
export default function SortScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [chosen, setChosen] = useState<number | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [weekSheet, setWeekSheet] = useState(false);
  const [mergeFor, setMergeFor] = useState<string | null>(null);
  // Offer waiting for an answer; `thenDone` = the week was finished by the sort that triggered it.
  const [offer, setOffer] = useState<{ offer: RuleOffer; thenDone: number | null } | null>(null);
  const actions = useEntryActions();
  const snack = useSnackbar();
  const s = useSortWeek(chosen, skipped);
  const top = s.queue[0];

  const header = (
    <View style={[styles.top, { paddingTop: insets.top + 14, paddingHorizontal: GUTTER }]}>
      <Txt v="h1" accessibilityRole="header" style={{ flex: 1 }}>
        {t('sort.title')}
      </Txt>
      {top ? (
        <Button label={t('sort.listView')} icon={List} variant="outline" size="sm" onPress={() => router.push(`/sort-list?week=${s.week?.start ?? ''}`)} />
      ) : null}
    </View>
  );

  const autoLine =
    s.week && s.autoCount > 0 ? (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${t('sortV2.autoSortedLine', { count: s.autoCount })}. ${t('sortV2.review')}`}
        onPress={() => router.push(`/auto-sorted?week=${s.week!.start}`)}
        hitSlop={6}
        style={styles.autoLine}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Zap size={18} color={colors.sunText} />
          <Txt style={{ fontFamily: fonts.bold, color: colors.sunText }}>{t('sortV2.autoSortedLine', { count: s.autoCount })}</Txt>
        </View>
        <Txt style={{ fontFamily: fonts.bold, color: colors.primaryText }}>{t('sortV2.review')}</Txt>
      </Pressable>
    ) : null;

  const answerOffer = (always: boolean) => {
    if (!offer) return;
    const o = offer.offer;
    if (always) {
      const rule = acceptOffer(db, o);
      snack({
        message: t('sortV2.ruleSaved', { name: o.matchText, category: o.categoryName }),
        actionLabel: t('common.undo'),
        // Undo = the rule never existed (offers only cover future entries, so nothing was sorted by it yet).
        onAction: () => deleteRule(db, rule.id),
      });
    } else {
      declineOffer(db, o.key);
    }
    const thenDone = offer.thenDone;
    setOffer(null);
    if (thenDone !== null) router.push(`/sort-done?week=${thenDone}`);
  };

  if (offer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <View style={{ flex: 1, paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 96, gap: 12 }}>
          {s.week ? <WeekProgress week={s.week} done={s.done} total={s.total} onPick={() => setWeekSheet(true)} /> : null}
          {autoLine}
          <RuleOfferCard offer={offer.offer} onAlways={() => answerOffer(true)} onNotNow={() => answerOffer(false)} />
          {top ? <Card style={{ height: 60, opacity: 0.5 }}>{null}</Card> : null}
        </View>
        <CaptureFab />
      </View>
    );
  }

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
        <CaptureFab />
      </View>
    );
  }

  const week = s.week;
  const isLast = s.queue.length === 1;
  const unskip = (item: SortItem) => setSkipped((sk) => sk.filter((k) => k !== item.key));
  const finish = () => router.push(`/sort-done?week=${week.start}`);

  const sortEntry = (id: string, categoryId: string, name: string, scope: Scope) => {
    actions.sortOne(id, categoryId, name, scope);
    unskip(top);
    const o = ruleOfferAfterSort(db, id);
    if (o) setOffer({ offer: o, thenDone: isLast ? week.start : null });
    else if (isLast) finish();
  };

  const sortTripCard = (tripId: string, scope: Scope) => {
    const u = sortTrip(db, tripId, scope);
    unskip(top);
    if (u) {
      snack({
        message: scope === 'work' ? t('sortV2.tripSortedWork') : t('sortV2.tripSortedPersonal'),
        actionLabel: t('common.undo'),
        onAction: () => undoSortTrip(db, u),
      });
    }
    if (isLast) finish();
  };

  const mergeEntry = mergeFor ? s.entries.find((e) => e.id === mergeFor) ?? null : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      {/* Bottom padding keeps the card clear of the FAB. */}
      <View style={{ flex: 1, paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 96, gap: 12 }}>
        <WeekProgress week={week} done={s.done} total={s.total} onPick={() => setWeekSheet(true)} />
        {autoLine}
        <View style={{ flex: 1, marginTop: 6 }}>
          {s.queue.length > 2 ? <Card style={[styles.ghost, { left: 24, right: 24, top: 0, opacity: 0.5 }]}>{null}</Card> : null}
          {s.queue.length > 1 ? <Card style={[styles.ghost, { left: 12, right: 12, top: 8, opacity: 0.8 }]}>{null}</Card> : null}
          {top.kind === 'entry' ? (
            <SortEntryCard
              key={top.key}
              entry={top.entry}
              suggestion={s.suggestFor(top.entry)}
              stacked={s.queue.length > 1}
              nameOf={(id) => s.cats.find((c) => c.id === id)?.name ?? ''}
              onSort={(categoryId, name, scope) => sortEntry(top.entry.id, categoryId, name, scope)}
              onSkip={() => setSkipped((sk) => [...sk.filter((k) => k !== top.key), top.key])}
              onMerge={() => setMergeFor(top.entry.id)}
              onSplit={(parts) => {
                const ok = actions.split(top.entry.id, parts.map((p) => ({ ...p, note: top.entry.note })));
                // Every part sorted and nothing else waiting → the week is done.
                if (ok && isLast && parts.every((p) => p.categoryId)) finish();
                return ok;
              }}
            />
          ) : (
            <SortTripCard
              key={top.key}
              trip={top.trip}
              unit={settings.distanceUnit}
              stacked={s.queue.length > 1}
              onSort={(scope) => sortTripCard(top.trip.id, scope)}
              onSkip={() => setSkipped((sk) => [...sk.filter((k) => k !== top.key), top.key])}
            />
          )}
        </View>
      </View>
      <CaptureFab />
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
      <MergeSheet
        entry={mergeEntry}
        onClose={() => setMergeFor(null)}
        onMerge={(ids) => {
          setMergeFor(null);
          actions.merge(ids);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  sunCircle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute', height: 60 },
  autoLine: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
