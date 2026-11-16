import { useLocalSearchParams } from 'expo-router';
import { router } from '@/services/router';
import { Check, ChevronDown, ChevronLeft, ListChecks } from '@/ui/icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import type { EntryListItem } from '@/db/entriesRepo';
import type { CategoryRow } from '@/db/schema';
import type { Currency, Scope } from '@/domain/types';
import { CategorySheet } from '@/features/entries/CategorySheet';
import { signedAmount } from '@/features/entries/format';
import { sortTrip, undoSortTrip } from '@/features/entries/sortRepo';
import { useEntryActions } from '@/features/entries/useEntryActions';
import { useSortWeek, type SortItem } from '@/features/entries/useSortWeek';
import { distanceValue, formatClock } from '@/features/trips/format';
import { t, tn } from '@/i18n';
import { useSettings } from '@/state/settings';
import { fonts, GUTTER, radius, useTheme } from '@/theme';
import { Button, Dialog, EmptyState, IconButton, Txt, useSnackbar } from '@/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekday = (at: number) => DAYS[new Date(at).getDay()];

/**
 * S-06a Sort · List view. Pro: best suggestion per entry, ✓ to accept, "Accept all suggestions (N)".
 * Free: "Choose ▾" picks a category, ✓ confirms; no bulk accept. Trips: "W" / "P". Param: `week` (start ms).
 */
export default function SortListScreen() {
  const params = useLocalSearchParams<{ week?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [picking, setPicking] = useState<EntryListItem | null>(null);
  const [chosenCat, setChosenCat] = useState<Record<string, string>>({});
  const [confirmAll, setConfirmAll] = useState(false);
  const actions = useEntryActions({ above: 'none', bottomOffset: 80 });
  const snack = useSnackbar();
  const s = useSortWeek(params.week ? Number(params.week) : null);
  const week = s.week;
  const byId = new Map(s.cats.map((c) => [c.id, c]));

  const best = (e: EntryListItem): CategoryRow | undefined => {
    const own = chosenCat[e.id];
    if (own) return byId.get(own);
    return s.pro ? s.suggestFor(e).categories[0] : undefined;
  };
  const rows = s.queue;
  const acceptable = s.pro ? rows.filter((r): r is Extract<SortItem, { kind: 'entry' }> => r.kind === 'entry' && !!best(r.entry)) : [];

  const finishIfDone = (sortedNow: number) => {
    if (week && sortedNow >= s.queue.length) router.replace(`/sort-done?week=${week.start}`);
  };
  const accept = (e: EntryListItem, c: CategoryRow) => {
    actions.sortOne(e.id, c.id, c.name);
    finishIfDone(1);
  };
  const tripScope = (id: string, scope: Scope) => {
    const u = sortTrip(db, id, scope);
    if (u) {
      snack({
        above: 'none',
        bottomOffset: 80,
        message: scope === 'work' ? t('sortV2.tripSortedWork') : t('sortV2.tripSortedPersonal'),
        actionLabel: t('common.undo'),
        onAction: () => undoSortTrip(db, u),
      });
    }
    finishIfDone(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.top, { paddingHorizontal: GUTTER }]}>
        <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} />
        <Txt v="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {t('sortV2.listTitle')}
        </Txt>
        {week ? (
          <Txt c="textSecondary" style={{ fontFamily: fonts.semibold }}>
            {t('sortV2.ofTotal', { done: s.done, total: s.total })}
          </Txt>
        ) : null}
      </View>

      {!week || rows.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState title={t('sort.nothing')} body={t('sort.nothingSub')} />
        </View>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(r) => r.key}
            contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 20 }}
            ListFooterComponent={
              s.pro ? undefined : (
                <Txt v="small" c="textSecondary" center style={{ marginTop: 14 }}>
                  {t('sortV2.chooseHint')}
                </Txt>
              )
            }
            renderItem={({ item, index }) => {
              const first = index === 0;
              const last = index === rows.length - 1;
              const frame = [
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
              ];
              const inner = [styles.inner, !first && { borderTopWidth: 1, borderTopColor: colors.line }];
              if (item.kind === 'trip') {
                const tr = item.trip;
                const miles = `${distanceValue(tr.distanceM, settings.distanceUnit).toFixed(1)} ${settings.distanceUnit}`;
                return (
                  <View style={frame}>
                    <View style={inner}>
                      <View style={{ flex: 1 }}>
                        <Txt numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                          {t('sortV2.tripRow', { miles, day: weekday(tr.startedAt) })}
                        </Txt>
                        <Txt v="small" c="textSecondary">
                          {`${formatClock(tr.startedAt)}–${formatClock(tr.endedAt ?? tr.startedAt)}`}
                        </Txt>
                      </View>
                      <ScopeCircle label={t('sortV2.work1')} a11y={t('common.work')} color={colors.work} onPress={() => tripScope(tr.id, 'work')} />
                      <ScopeCircle label={t('sortV2.personal1')} a11y={t('common.personal')} color={colors.personal} onPress={() => tripScope(tr.id, 'personal')} />
                    </View>
                  </View>
                );
              }
              const e = item.entry;
              const b = best(e);
              return (
                <View style={frame}>
                  <View style={inner}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                        {e.note || t('common.noNote')}
                      </Txt>
                      <Txt v="small" c="textSecondary" numberOfLines={1}>
                        {`${signedAmount(e.type, e.amountMinor, e.currency as Currency)} · ${weekday(e.occurredAt)}`}
                      </Txt>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={b ? t('sortV2.changeCategory', { name: b.name }) : t('sortV2.choose')}
                      onPress={() => setPicking(e)}
                      style={[
                        styles.choose,
                        { borderColor: b && s.pro && !chosenCat[e.id] ? colors.sun : colors.lineStrong, backgroundColor: b && s.pro && !chosenCat[e.id] ? colors.sunSoft : colors.surface },
                      ]}>
                      <Txt numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontFamily: fonts.semibold, flexShrink: 1 }}>
                        {b?.name ?? t('sortV2.choose')}
                      </Txt>
                      <ChevronDown size={16} color={colors.text} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={b ? t('sort.accept', { name: b.name }) : t('sortV2.choose')}
                      accessibilityState={{ disabled: !b }}
                      disabled={!b}
                      onPress={() => b && accept(e, b)}
                      hitSlop={4}
                      style={[styles.ok, { backgroundColor: b ? colors.incomeSoft : colors.surfaceAlt }]}>
                      <Check size={22} color={b ? colors.incomeText : colors.textTertiary} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
          {s.pro ? (
            <View style={[styles.bottom, { backgroundColor: colors.background, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
              <Button
                label={t('sort.acceptAll', { count: acceptable.length })}
                icon={ListChecks}
                full
                disabled={acceptable.length === 0}
                onPress={() => setConfirmAll(true)}
              />
            </View>
          ) : null}
        </>
      )}

      <CategorySheet
        visible={!!picking}
        onClose={() => setPicking(null)}
        type={picking?.type}
        selectedId={picking ? (chosenCat[picking.id] ?? null) : null}
        onPick={(id) => {
          const e = picking;
          setPicking(null);
          if (e && id) setChosenCat((m) => ({ ...m, [e.id]: id }));
        }}
      />
      <Dialog
        visible={confirmAll}
        onClose={() => setConfirmAll(false)}
        title={tn('sort.acceptAllConfirm', acceptable.length)}
        body={t('sort.acceptAllBody')}
        actions={[
          { label: t('common.cancel'), onPress: () => setConfirmAll(false) },
          {
            label: t('common.apply'),
            variant: 'primary',
            onPress: () => {
              setConfirmAll(false);
              actions.sortMany(acceptable.map((r) => ({ id: r.entry.id, categoryId: best(r.entry)!.id })));
              finishIfDone(acceptable.length);
            },
          },
        ]}
      />
    </View>
  );
}

function ScopeCircle({ label, a11y, color, onPress }: { label: string; a11y: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} hitSlop={4} style={[styles.circle, { borderColor: color }]}>
      <Txt style={{ fontSize: 17, fontFamily: fonts.bold, color }}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 8 },
  row: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 14 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72, paddingVertical: 10 },
  choose: { minHeight: 44, maxWidth: 170, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ok: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: GUTTER, paddingTop: 12, borderTopWidth: 1 },
});
