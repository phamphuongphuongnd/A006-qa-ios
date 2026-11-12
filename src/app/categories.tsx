import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listCategories, reorderCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import type { CategoryRow } from '@/db/schema';
import type { EntryType } from '@/domain/types';
import { CategoryEditor } from '@/features/settings/CategoryEditor';
import { iconFor, shortTaxLine } from '@/features/settings/categoryIcons';
import { DragList } from '@/features/settings/DragList';
import { GroupLabel, NavHeader } from '@/features/settings/ui';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Avatar, Button, Group, IconButton, Txt } from '@/ui';

type Editing = { category: CategoryRow | null; type: EntryType; n: number } | null;

/** S-11 Categories: Income / Expenses groups, drag to reorder, edit sheet, add, hidden section. */
export default function CategoriesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const all = useLive(() => listCategories(db, { includeHidden: true }));
  const [editing, setEditing] = useState<Editing>(null);
  const [dragging, setDragging] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const income = all.filter((c) => c.type === 'income' && !c.hidden);
  const expense = all.filter((c) => c.type === 'expense' && !c.hidden);
  const hidden = all.filter((c) => c.hidden);

  const open = (category: CategoryRow | null, type: EntryType = 'expense') =>
    setEditing((e) => ({ category, type, n: (e?.n ?? 0) + 1 }));

  const reorder = (type: EntryType, next: CategoryRow[]) => {
    const inc = type === 'income' ? next : income;
    const exp = type === 'expense' ? next : expense;
    reorderCategories(db, [...inc, ...exp, ...hidden].map((c) => c.id));
  };

  const row = (c: CategoryRow) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => open(c)}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 14, height: 64, paddingLeft: 16 },
        pressed && { opacity: 0.7 },
      ]}>
      <Avatar kind="neutral" icon={iconFor(c.icon)} tint={c.color} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={{ fontFamily: fonts.bold }}>
          {c.name}
        </Txt>
        <Txt v="caption" c="textTertiary" numberOfLines={1} style={{ fontFamily: fonts.medium }}>
          {c.taxLine}
        </Txt>
      </View>
    </Pressable>
  );

  const section = (type: EntryType, items: CategoryRow[]) =>
    items.length ? (
      <DragList
        items={items}
        keyOf={(c) => c.id}
        labelOf={(c) => `${c.name}, ${shortTaxLine(c.taxLine)}`}
        renderRow={row}
        onReorder={(next) => reorder(type, next)}
        onDragging={setDragging}
        onActivate={(c) => open(c)}
      />
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader
        title={t('categories.title')}
        right={<IconButton icon={Plus} label={t('categories.add')} onPress={() => open(null, 'expense')} />}
      />
      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: insets.bottom + 24, gap: 8 }}>
        <GroupLabel first>{t('categories.income')}</GroupLabel>
        {section('income', income)}
        <GroupLabel>{t('categories.expenses')}</GroupLabel>
        {section('expense', expense)}
        <Button
          label={t('categories.add')}
          icon={Plus}
          variant="outline"
          size="sm"
          onPress={() => open(null, 'expense')}
          style={{ alignSelf: 'flex-start', marginTop: 6 }}
        />
        {hidden.length ? (
          <Group style={{ marginTop: 4 }}>
            {[
            <Pressable
              key="toggle"
              accessibilityRole="button"
              accessibilityState={{ expanded: showHidden }}
              onPress={() => setShowHidden((s) => !s)}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16 }}>
              <Txt c="textSecondary" style={{ flex: 1, fontFamily: fonts.bold }}>
                {t('categories.hidden', { count: hidden.length })}
              </Txt>
              {showHidden ? (
                <ChevronUp size={18} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={18} color={colors.textTertiary} />
              )}
            </Pressable>,
            ...(showHidden ? hidden.map((c) => <View key={c.id}>{row(c)}</View>) : []),
            ]}
          </Group>
        ) : null}
      </ScrollView>
      {editing && settings.region ? (
        <CategoryEditor
          key={editing.n}
          category={editing.category}
          type={editing.type}
          region={settings.region}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </View>
  );
}
