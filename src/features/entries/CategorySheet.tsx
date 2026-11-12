import { View } from 'react-native';

import { listCategories } from '@/db/categoriesRepo';
import { db } from '@/db/client';
import type { EntryType } from '@/domain/types';
import { t } from '@/i18n';
import { useLive } from '@/state/useLive';
import { Chip, ChipRow, Sheet, Txt } from '@/ui';

import { categoryIcon } from './icons';

/**
 * Bottom sheet with every visible category as chips, grouped Income / Expenses.
 * `type` limits it to one side; `allowUnsorted` adds an "Unsorted" chip (onPick(null)).
 */
export function CategorySheet({
  visible,
  onClose,
  onPick,
  type,
  selectedId,
  allowUnsorted,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (categoryId: string | null) => void;
  type?: EntryType | null;
  selectedId?: string | null;
  allowUnsorted?: boolean;
  title?: string;
}) {
  const cats = useLive(() => listCategories(db));
  const sections: { kind: EntryType; label: string }[] = [
    { kind: 'income', label: t('common.income') },
    { kind: 'expense', label: t('common.expenses') },
  ];
  const shown = sections.filter((s) => !type || s.kind === type);
  return (
    <Sheet visible={visible} onClose={onClose} title={title ?? t('sort.pickCategory')}>
      {allowUnsorted ? (
        <ChipRow>
          <Chip label={t('common.unsorted')} state={selectedId === null ? 'on' : 'default'} onPress={() => onPick(null)} />
        </ChipRow>
      ) : null}
      {shown.map((s) => {
        const list = cats.filter((c) => c.type === s.kind);
        return (
          <View key={s.kind} style={{ gap: 10 }}>
            {!type ? <Txt v="label" c="textTertiary">{s.label}</Txt> : null}
            {list.length === 0 ? (
              <Txt v="small" c="textSecondary">
                {t('common.categoryEmpty')}
              </Txt>
            ) : (
              <ChipRow>
                {list.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    icon={categoryIcon(c.icon)}
                    state={selectedId === c.id ? 'on' : 'default'}
                    onPress={() => onPick(c.id)}
                  />
                ))}
              </ChipRow>
            )}
          </View>
        );
      })}
    </Sheet>
  );
}
