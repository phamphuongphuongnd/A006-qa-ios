import { Check } from '@/ui/icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import type { EntryListItem } from '@/db/entriesRepo';
import { formatMoney } from '@/domain/money';
import type { Currency } from '@/domain/types';
import { offerKey } from '@/features/rules/match';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { fonts, radius, useTheme } from '@/theme';
import { Button, Sheet, Txt } from '@/ui';

import { dateDotTime, dayMonth } from './format';
import { mergeCandidates } from './sortRepo';

/**
 * S-06 Merge sheet: "Merge with…" lists entries of the same type within ±1 day (same place pre-ticked), shows
 * "Merge 3 entries into one £27.40 expense?" and merges. The merged entry stays in the queue (Undo in the snackbar).
 */
export function MergeSheet({ entry, onClose, onMerge }: { entry: EntryListItem | null; onClose: () => void; onMerge: (ids: string[]) => void }) {
  return (
    <Sheet visible={!!entry} onClose={onClose} title={t('sortV2.mergeWith')}>
      {entry ? <MergeBody key={entry.id} entry={entry} onMerge={onMerge} /> : <View />}
    </Sheet>
  );
}

function MergeBody({ entry, onMerge }: { entry: EntryListItem; onMerge: (ids: string[]) => void }) {
  const { colors } = useTheme();
  const currency = entry.currency as Currency;
  const list = useLive(() => mergeCandidates(db, entry.type, entry.occurredAt, entry.id), [entry.id], ['entries']);
  const [ticked, setTicked] = useState<Set<string> | null>(null);
  const key = offerKey(entry.note, entry.ocrMerchant);
  // Default ticks: same place as the card (computed once the list is there).
  const on = ticked ?? new Set(list.filter((c) => key && offerKey(c.note, null) === key).map((c) => c.id));
  const toggle = (id: string) => {
    const next = new Set(on);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicked(next);
  };
  const chosen = list.filter((c) => on.has(c.id));
  const total = entry.amountMinor + chosen.reduce((a, c) => a + c.amountMinor, 0);
  const income = entry.type === 'income';

  return (
    <View style={{ gap: 14 }}>
      <Txt c="textSecondary">
        {t('sortV2.mergeWithin', { types: income ? t('sortV2.mergeTypesIncome') : t('sortV2.mergeTypesExpense'), day: dayMonth(entry.occurredAt) })}
      </Txt>
      {list.length === 0 ? (
        <Txt c="textSecondary">{t('sortV2.mergeNone')}</Txt>
      ) : (
        <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, overflow: 'hidden' }}>
          {list.map((c, i) => {
            const sel = on.has(c.id);
            return (
              <Pressable
                key={c.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sel }}
                accessibilityLabel={`${c.note || t('common.noNote')}, ${formatMoney(c.amountMinor, currency)}, ${dateDotTime(c.occurredAt)}`}
                onPress={() => toggle(c.id)}
                style={({ pressed }) => ({
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.line,
                  opacity: pressed ? 0.75 : 1,
                })}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? colors.workFill : colors.surfaceAlt }}>
                  {sel ? <Check size={20} color={colors.onScope} strokeWidth={2.6} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                    {c.note || t('common.noNote')}
                  </Txt>
                  <Txt v="small" c="textSecondary">
                    {dateDotTime(c.occurredAt)}
                  </Txt>
                </View>
                <Txt v="amount" size={17}>
                  {formatMoney(c.amountMinor, currency)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}
      {chosen.length > 0 ? (
        <View style={{ backgroundColor: colors.sunSoft, borderRadius: 14, padding: 14 }} accessibilityLiveRegion="polite">
          <Txt>
            {t(income ? 'sortV2.mergePreviewIncome' : 'sortV2.mergePreviewExpense', { count: chosen.length + 1, amount: formatMoney(total, currency) })}
          </Txt>
        </View>
      ) : list.length > 0 ? (
        <Txt v="small" c="textSecondary">
          {t('sortV2.mergePick')}
        </Txt>
      ) : null}
      <Button label={t('sortV2.merge')} full disabled={chosen.length === 0} onPress={() => onMerge([entry.id, ...chosen.map((c) => c.id)])} />
    </View>
  );
}
