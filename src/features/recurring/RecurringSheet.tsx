import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import { DateField } from '@/features/settings/DateField';
import { OptionSheet, type Option } from '@/features/settings/ui';
import { WEEKDAYS } from '@/features/settings/reminder';
import { currencySymbol, parseMinor, toDecimalString } from '@/domain/money';
import type { RecurringFreq } from '@/domain/types';
import { t } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme';
import { Badge, Button, Chip, ChipRow, Field, Segmented, Sheet, Toggle, Txt } from '@/ui';
import { ChevronDown } from '@/ui/icons';

import { recurringName, type RecurringInput } from './repo';
import { dayFieldFor, dayOf, longDay, ordinal, parseDay } from './schedule';

const FREQS: { value: RecurringFreq; key: 'weekly' | 'fourWeekly' | 'monthly' | 'yearly' }[] = [
  { value: 'weekly', key: 'weekly' },
  { value: 'four_weekly', key: 'fourWeekly' },
  { value: 'monthly', key: 'monthly' },
  { value: 'yearly', key: 'yearly' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1st" / "Friday" / "6 Apr" — the "On" field. */
export function onLabel(i: Pick<RecurringInput, 'freq' | 'day' | 'month'>): string {
  if (i.freq === 'weekly' || i.freq === 'four_weekly') return WEEKDAYS[i.day];
  if (i.freq === 'monthly') return ordinal(i.day);
  return `${i.day} ${MONTHS[(i.month ?? 1) - 1]}`;
}

type Picker = 'category' | 'day' | 'ends' | null;

/**
 * S-17 sheet: amount · Expense/Income · category · Work/Personal · note · Repeats · On · Starts · Ends · Pause ·
 * Save / Delete. `initial` is a template being edited or a new one (possibly from an entry).
 */
export function RecurringSheet({
  visible,
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  initial: RecurringInput;
  isNew: boolean;
  onSave: (i: RecurringInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  'use no memo';
  const [v, setV] = useState(initial);
  const [amount, setAmount] = useState(initial.amountMinor > 0 ? toDecimalString(initial.amountMinor) : '');
  const [picker, setPicker] = useState<Picker>(null);
  const [error, setError] = useState<string | null>(null);
  const [endsPicking, setEndsPicking] = useState(false);
  const set = (p: Partial<RecurringInput>) => setV((cur) => ({ ...cur, ...p }));

  const cats = listCategories(db, { type: v.type });
  const cat = cats.find((c) => c.id === v.categoryId) ?? listCategories(db, { type: v.type, includeHidden: true }).find((c) => c.id === v.categoryId) ?? null;

  const changeFreq = (freq: RecurringFreq) => {
    // Keep the day sensible for the new kind ("1st" → the start's weekday for Weekly).
    set({ freq, ...dayFieldFor(freq, v.startsOn) });
  };

  const save = () => {
    const minor = parseMinor(amount);
    if (minor === null || minor <= 0) {
      setError(t('recurring.errAmount'));
      return;
    }
    // B-41: entries from a template are made already sorted — no category, no save.
    if (!v.categoryId || !cat) {
      setError(t('recurring.errCategory'));
      return;
    }
    if (v.endsOn && v.endsOn < v.startsOn) {
      setError(t('recurring.errEnds'));
      return;
    }
    setError(null);
    onSave({ ...v, amountMinor: minor });
  };

  const dayOptions: Option<number>[] =
    v.freq === 'weekly' || v.freq === 'four_weekly'
      ? [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: d, label: WEEKDAYS[d] }))
      : Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: ordinal(i + 1), sub: i >= 28 ? 'Shorter months use their last day' : undefined }));

  const title = recurringName(v.note, isNew ? null : cat?.name, isNew ? t('recurring.newTitle') : t('recurring.title'));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <View style={{ gap: 8, paddingTop: 12 }}>
          {error ? (
            <Txt v="small" c="error" style={{ fontFamily: fonts.semibold }} accessibilityLiveRegion="polite">
              {error}
            </Txt>
          ) : null}
          <Button label={t('recurring.save')} full onPress={save} />
          {onDelete ? <Button label={t('recurring.delete')} variant="text" full onPress={onDelete} /> : null}
        </View>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt v="h2" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
          {title}
        </Txt>
        <Badge kind="recurring" label={t('recurring.label')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ width: 130 }}>
          <Field
            label={t('recurring.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            left={<Txt style={{ fontFamily: fonts.bold }}>{currencySymbol(v.currency)}</Txt>}
            accessibilityLabel={t('recurring.amount')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Segmented
            accessibilityLabel={t('common.expense')}
            options={[
              { value: 'expense', label: t('common.expense'), tone: 'expense' },
              { value: 'income', label: t('common.income'), tone: 'income' },
            ]}
            value={v.type}
            onChange={(type) => set({ type, categoryId: type === v.type ? v.categoryId : null })}
          />
        </View>
      </View>

      <SelectField label={t('recurring.category')} value={cat?.name ?? t('recurring.categoryPick')} onPress={() => setPicker('category')} />

      <Segmented
        accessibilityLabel={t('common.work')}
        options={[
          { value: 'work', label: t('common.work') },
          { value: 'personal', label: t('common.personal') },
        ]}
        value={v.scope}
        onChange={(scope) => set({ scope })}
      />

      <Field
        label={t('recurring.note')}
        value={v.note}
        onChangeText={(note) => set({ note })}
        placeholder={t('recurring.notePlaceholder')}
        maxLength={120}
      />

      <View style={{ gap: 8 }}>
        <Txt v="label" c="textSecondary">
          {t('recurring.repeats')}
        </Txt>
        <ChipRow>
          {FREQS.map((f) => (
            <Chip key={f.value} label={t(`recurring.${f.key}`)} state={v.freq === f.value ? 'on' : 'default'} onPress={() => changeFreq(f.value)} />
          ))}
        </ChipRow>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          {v.freq === 'yearly' ? (
            <DateField
              label={t('recurring.on')}
              value={new Date(2026, (v.month ?? 1) - 1, v.day)}
              display={onLabel(v)}
              onChange={(d) => set({ day: d.getDate(), month: d.getMonth() + 1 })}
            />
          ) : (
            <SelectField label={t('recurring.on')} value={onLabel(v)} onPress={() => setPicker('day')} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <DateField
            label={t('recurring.starts')}
            value={parseDay(v.startsOn)}
            display={longDay(v.startsOn)}
            onChange={(d) => set({ startsOn: dayOf(d.getTime()) })}
          />
        </View>
      </View>

      {endsPicking || v.endsOn ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <DateField
              label={t('recurring.ends')}
              value={parseDay(v.endsOn ?? v.startsOn)}
              display={v.endsOn ? longDay(v.endsOn) : '—'}
              minimumDate={parseDay(v.startsOn)}
              onChange={(d) => set({ endsOn: dayOf(d.getTime()) })}
            />
          </View>
          <Button
            label={t('recurring.never')}
            variant="outline"
            onPress={() => {
              setEndsPicking(false);
              set({ endsOn: null });
            }}
          />
        </View>
      ) : (
        <SelectField label={t('recurring.ends')} value={t('recurring.never')} onPress={() => setPicker('ends')} />
      )}

      {!isNew ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t('recurring.pause')}</Txt>
            <Txt v="small" c="textSecondary">
              {t('recurring.pauseSub')}
            </Txt>
          </View>
          <Toggle value={v.paused} onChange={(paused) => set({ paused })} label={t('recurring.pause')} />
        </View>
      ) : null}

      <OptionSheet<string>
        visible={picker === 'category'}
        title={t('recurring.category')}
        options={cats.map((c) => ({ value: c.id, label: c.name }))}
        value={v.categoryId}
        onPick={(categoryId) => set({ categoryId })}
        onClose={() => setPicker(null)}
      />
      <OptionSheet<number>
        visible={picker === 'day'}
        title={v.freq === 'monthly' ? t('recurring.pickDay') : t('recurring.pickWeekday')}
        options={dayOptions}
        value={v.day}
        onPick={(day) => set({ day })}
        onClose={() => setPicker(null)}
      />
      <OptionSheet<'never' | 'date'>
        visible={picker === 'ends'}
        title={t('recurring.ends')}
        options={[
          { value: 'never', label: t('recurring.never') },
          { value: 'date', label: t('recurring.endOn') },
        ]}
        value={v.endsOn ? 'date' : 'never'}
        onPick={(o) => {
          if (o === 'never') set({ endsOn: null });
          // iOS can't open the next control while the sheet is still sliding away.
          else setTimeout(() => setEndsPicking(true), Platform.OS === 'ios' ? 400 : 0);
        }}
        onClose={() => setPicker(null)}
      />
    </Sheet>
  );
}

function SelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {label}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 52,
          borderRadius: radius.input,
          borderWidth: 1.5,
          borderColor: colors.lineStrong,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        })}>
        <Txt style={{ flex: 1, fontFamily: fonts.bold }} numberOfLines={1}>
          {value}
        </Txt>
        <ChevronDown size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
