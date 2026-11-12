import { Check, ChevronDown, ChevronUp, Ellipsis, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { categoryUsage, createCategory, deleteCategory, updateCategory, type CategoryError } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import type { CategoryRow } from '@/db/schema';
import { TAX_LINES } from '@/domain/categories';
import type { EntryType, Region } from '@/domain/types';
import { t } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme';
import { Button, Field, IconButton, Segmented, Sheet, Toggle, Txt, useSnackbar } from '@/ui';

import { CATEGORY_COLORS, ICON_NAMES, ICONS_COLLAPSED, iconFor, shortTaxLine } from './categoryIcons';

const ERR: Record<CategoryError, () => string> = {
  empty_name: () => t('categories.emptyName'),
  duplicate_name: () => t('categories.duplicate'),
};

/**
 * S-11 edit / add sheet. Mount with a `key` per opening so the form resets.
 * `category` null = new category of `type`.
 */
export function CategoryEditor({
  category,
  type: initialType,
  region,
  onClose,
}: {
  category: CategoryRow | null;
  type: EntryType;
  region: Region;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const snack = useSnackbar();
  const lines = TAX_LINES[region];
  const [type, setType] = useState<EntryType>(category?.type ?? initialType);
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? (initialType === 'income' ? 'banknote' : 'receipt'));
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[initialType === 'income' ? 3 : 0]);
  const [taxLine, setTaxLine] = useState(category?.taxLine ?? defaultLine(lines, initialType));
  const [hidden, setHidden] = useState(category?.hidden ?? false);
  const [error, setError] = useState<string | null>(null);
  const [allIcons, setAllIcons] = useState(category ? ICON_NAMES.indexOf(category.icon) >= ICONS_COLLAPSED : false);
  const [linesOpen, setLinesOpen] = useState(false);
  const usage = category ? categoryUsage(db, category.id) : 0;

  const save = () => {
    const res = category
      ? updateCategory(db, category.id, { name, icon, color, taxLine, hidden })
      : createCategory(db, { type, name, icon, color, taxLine });
    if (!res.ok) {
      setError(ERR[res.error]());
      return;
    }
    onClose();
  };

  const remove = () => {
    if (!category) return;
    const res = deleteCategory(db, category.id);
    if (res.ok) {
      snack({ message: t('categories.deleted'), above: 'none' });
      onClose();
    }
  };

  const icons = allIcons ? ICON_NAMES : ICON_NAMES.slice(0, ICONS_COLLAPSED);
  const lineChoices = lines.includes(taxLine) ? lines : [taxLine, ...lines];

  return (
    <Sheet
      visible
      onClose={onClose}
      footer={<Button label={t('categories.save')} onPress={save} full />}>
      <View style={styles.head}>
        <Txt v="h2" accessibilityRole="header">
          {category ? t('categories.edit') : t('categories.new')}
        </Txt>
        <IconButton icon={X} label={t('categories.close')} onPress={onClose} />
      </View>

      {!category ? (
        <Segmented<EntryType>
          options={[
            { value: 'expense', label: t('common.expense'), tone: 'expense' },
            { value: 'income', label: t('common.income'), tone: 'income' },
          ]}
          value={type}
          onChange={(v) => {
            setType(v);
            setTaxLine(defaultLine(lines, v));
            setError(null);
          }}
        />
      ) : null}

      <Field
        label={t('categories.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        placeholder={t('categories.namePlaceholder')}
        error={error}
        maxLength={40}
        autoFocus={!category}
        returnKeyType="done"
      />

      <View style={{ gap: 8 }}>
        <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {t('categories.iconColour')}
        </Txt>
        <View style={styles.grid}>
          {icons.map((n) => {
            const Icon = iconFor(n);
            const on = n === icon;
            return (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityLabel={`${n.replace('-', ' ')} icon`}
                accessibilityState={{ selected: on }}
                onPress={() => setIcon(n)}
                style={[
                  styles.iconCell,
                  { backgroundColor: on ? `${color}22` : colors.surfaceAlt },
                  on && { borderWidth: 2, borderColor: color },
                ]}>
                <Icon size={22} color={on ? color : colors.text} strokeWidth={2} />
              </Pressable>
            );
          })}
          {!allIcons ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('categories.moreIcons')}
              onPress={() => setAllIcons(true)}
              style={[styles.iconCell, { backgroundColor: colors.surfaceAlt }]}>
              <Ellipsis size={22} color={colors.text} strokeWidth={3} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.colors}>
          {CATEGORY_COLORS.map((c) => {
            const on = c.toLowerCase() === color.toLowerCase();
            return (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityLabel={`Colour ${c}`}
                accessibilityState={{ selected: on }}
                hitSlop={6}
                onPress={() => setColor(c)}
                style={[styles.swatchRing, on && { borderColor: c }]}>
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
          {t('categories.taxLine')}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('categories.taxLine')}, ${taxLine}`}
          accessibilityState={{ expanded: linesOpen }}
          onPress={() => setLinesOpen((o) => !o)}
          style={[styles.select, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
          <Txt v="small" style={{ flex: 1, fontFamily: fonts.bold }} numberOfLines={2}>
            {shortTaxLine(taxLine)}
          </Txt>
          {linesOpen ? <ChevronUp size={18} color={colors.textTertiary} /> : <ChevronDown size={18} color={colors.textTertiary} />}
        </Pressable>
        {linesOpen ? (
          <View style={[styles.lines, { borderColor: colors.line }]}>
            {lineChoices.map((l, i) => {
              const on = l === taxLine;
              return (
                <Pressable
                  key={l}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setTaxLine(l);
                    setLinesOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.line,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}>
                  <Txt v="small" style={{ flex: 1, fontFamily: on ? fonts.bold : fonts.regular }}>
                    {shortTaxLine(l)}
                  </Txt>
                  {on ? <Check size={18} color={colors.primaryText} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {category ? (
        <View style={styles.hideRow}>
          <View style={{ flex: 1 }}>
            <Txt>{t('categories.hide')}</Txt>
            <Txt v="caption" c="textTertiary" style={{ fontFamily: fonts.medium }}>
              {t('categories.hideHint')}
            </Txt>
          </View>
          <Toggle value={hidden} onChange={setHidden} label={t('categories.hide')} />
        </View>
      ) : null}

      {category ? (
        usage === 0 ? (
          <Button label={t('categories.delete')} variant="text" onPress={remove} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <Txt v="small" c="textSecondary">
            {usage === 1 ? t('categories.inUseOne') : t('categories.inUse', { count: usage })}
          </Txt>
        )
      ) : null}
    </Sheet>
  );
}

function defaultLine(lines: string[], type: EntryType): string {
  // Income lines come first in TAX_LINES; "Other …" lines are the safe defaults.
  if (type === 'income') return lines.find((l) => /Other (business )?income/i.test(l)) ?? lines[0];
  return lines.find((l) => /Other (allowable business )?expenses/i.test(l)) ?? lines[lines.length - 1];
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: { width: '14.6%', aspectRatio: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colors: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  swatchRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  select: { minHeight: 52, borderRadius: radius.input, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lines: { borderWidth: 1, borderRadius: radius.input, overflow: 'hidden' },
  line: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hideRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
});
