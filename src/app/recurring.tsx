import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { getEntry } from '@/db/entriesRepo';
import type { RecurringRow } from '@/db/schema';
import { formatMoney } from '@/domain/money';
import { currencyOf } from '@/domain/types';
import { useNow } from '@/features/entries/useNow';
import { openPro } from '@/features/pro/openPro';
import {
  createRecurring,
  deleteRecurring,
  generateDueRecurring,
  getRecurring,
  isEnded,
  listRecurring,
  recurringName,
  updateRecurring,
  type RecurringInput,
} from '@/features/recurring/repo';
import { RecurringSheet } from '@/features/recurring/RecurringSheet';
import { dayFieldFor, dayOf, repeatLabel, shortDay } from '@/features/recurring/schedule';
import { NavHeader } from '@/features/settings/ui';
import { PRO_PAUSED } from '@/domain/pro';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Badge, Button, Dialog, Group, Txt, useSnackbar } from '@/ui';
import { ChevronRight, Plus, Repeat } from '@/ui/icons';

type Editing = { id: string | null; input: RecurringInput; fromDay?: string; key: number };

const fromRow = ({ id: _i, nextOn: _n, createdAt: _c, updatedAt: _u, ...input }: RecurringRow): RecurringInput => input;

/**
 * S-17 Recurring entries [Pro] (F-10). From S-05: `?from=<entryId>` ("Make recurring") opens a new template filled from
 * the entry; `?id=<recurringId>` ("Edit recurring") opens that template's sheet.
 */
export default function RecurringScreen() {
  'use no memo';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings } = useSettings();
  const { pro } = usePro();
  const params = useLocalSearchParams<{ from?: string; id?: string }>();
  const rows = useLive(() => listRecurring(db), [], ['recurring']);
  const catNames = useLive(() => new Map(listCategories(db, { includeHidden: true }).map((c) => [c.id, c.name])), [], ['categories']);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const seq = useRef(0);
  const currency = currencyOf(settings.region ?? 'UK');
  const today = dayOf(useNow(60_000));

  const blank = (): RecurringInput => ({
    type: 'expense',
    amountMinor: 0,
    currency,
    note: '',
    categoryId: null,
    scope: settings.defaultScope,
    freq: 'monthly',
    ...dayFieldFor('monthly', today),
    startsOn: today,
    endsOn: null,
    paused: false,
  });

  // "Make recurring" from an entry (S-05 ⋯).
  const fromDone = useRef(false);
  useEffect(() => {
    if (!params.from || fromDone.current) return;
    fromDone.current = true;
    if (!pro) {
      openPro('recurring');
      return;
    }
    const e = getEntry(db, params.from);
    if (!e) return;
    const day = dayOf(e.occurredAt);
    setEditing({
      id: null,
      fromDay: day,
      key: ++seq.current,
      input: {
        type: e.type,
        amountMinor: e.amountMinor,
        currency: e.currency,
        note: e.note,
        categoryId: e.categoryId,
        scope: e.scope,
        freq: 'monthly',
        ...dayFieldFor('monthly', day),
        startsOn: day,
        endsOn: null,
        paused: false,
      },
    });
  }, [params.from, pro]);

  // "Edit recurring" from an entry made by a template.
  const idDone = useRef(false);
  useEffect(() => {
    if (!params.id || idDone.current) return;
    idDone.current = true;
    const r = getRecurring(db, params.id);
    if (r) setEditing({ id: r.id, input: fromRow(r), key: ++seq.current });
  }, [params.id]);

  const add = () => {
    if (!pro) {
      openPro('recurring');
      return;
    }
    setEditing({ id: null, input: blank(), key: ++seq.current });
  };

  // QA-100 MOD-7: one save per opened sheet (a double tap created the template twice).
  const savedKey = useRef<number | null>(null);
  const save = (input: RecurringInput) => {
    if (!editing || savedKey.current === editing.key) return;
    savedKey.current = editing.key;
    if (editing.id) updateRecurring(db, editing.id, input);
    else createRecurring(db, input, Date.now(), editing.fromDay);
    setEditing(null);
    const made = generateDueRecurring(db);
    snack({ message: made > 0 ? t('recurring.madeNow', { count: made }) : t('recurring.saved'), above: 'none' });
  };

  const remove = () => {
    if (!editing?.id) return;
    deleteRecurring(db, editing.id);
    setAskDelete(false);
    setEditing(null);
    snack({ message: t('recurring.deleted'), above: 'none' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('recurring.title')} right={PRO_PAUSED ? undefined : <Badge kind="pro" label={t('pro.badge')} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <Txt c="textSecondary">{t('recurring.intro')}</Txt>
        {!pro ? (
          <Pressable onPress={() => openPro('recurring')} accessibilityRole="button" style={{ borderRadius: 16, padding: 14, backgroundColor: colors.sunSoft }}>
            <Txt v="small" c="sunText" style={{ fontFamily: fonts.semibold }}>
              {t('recurring.proNote')}
            </Txt>
          </Pressable>
        ) : null}

        {rows.length === 0 ? (
          <Txt c="textSecondary">{t('recurring.empty')}</Txt>
        ) : (
          <Group>
            {rows.map((r) => {
              const status = r.paused ? t('recurring.paused') : isEnded(r) ? t('recurring.ended') : t('recurring.next', { date: shortDay(r.nextOn, today) });
              const name = recurringName(r.note, r.categoryId ? catNames.get(r.categoryId) : null, t('recurring.title'));
              const title = `${name} · ${formatMoney(r.amountMinor, r.currency)}`;
              const sub = `${repeatLabel(r)} · ${status}`;
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${title}. ${sub}`}
                  onPress={() => setEditing({ id: r.id, input: fromRow(r), key: ++seq.current })}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: r.type === 'income' ? colors.incomeSoft : colors.expenseSoft,
                      opacity: r.paused || isEnded(r) ? 0.5 : 1,
                    }}>
                    <Repeat size={20} color={r.type === 'income' ? colors.incomeText : colors.expenseText} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                      {title}
                    </Txt>
                    <Txt v="small" c="textSecondary">
                      {sub}
                    </Txt>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </Group>
        )}

        <Button label={t('recurring.add')} icon={Plus} variant="outline" full onPress={add} />
      </ScrollView>

      {editing ? (
        <RecurringSheet
          key={editing.key}
          // Hidden while the delete dialog is up (iOS shows one modal at a time).
          visible={!askDelete}
          isNew={!editing.id}
          initial={editing.input}
          onSave={save}
          onDelete={editing.id ? () => setAskDelete(true) : undefined}
          onClose={() => {
            setEditing(null);
            // Opened straight from an entry: Close goes back to it.
            if (params.from || params.id) router.back();
          }}
        />
      ) : null}
      <Dialog
        visible={askDelete}
        title={t('recurring.deleteTitle')}
        body={t('recurring.deleteBody')}
        onClose={() => setAskDelete(false)}
        actions={[
          { label: t('common.cancel'), onPress: () => setAskDelete(false) },
          { label: t('common.delete'), variant: 'danger', onPress: remove },
        ]}
      />
    </View>
  );
}
