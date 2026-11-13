import { Paperclip } from '@/ui/icons';
import { View } from 'react-native';

import type { EntryListItem } from '@/db/entriesRepo';
import type { CategoryRow } from '@/db/schema';
import type { Currency } from '@/domain/types';
import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { Avatar, Badge, Dot, ListRow, SelectCircle, Tag, Txt } from '@/ui';

import { signedAmount, timeLabel, weekdayTime } from './format';
import { categoryIcon } from './icons';

/** Leading avatar: category icon in its colour, or the yellow "?" when unsorted. */
export function EntryAvatar({ category, size }: { category: CategoryRow | undefined; size?: number }) {
  if (!category) return <Avatar kind="unsorted" size={size} />;
  return <Avatar kind="neutral" icon={categoryIcon(category.icon)} tint={category.color} size={size} />;
}

/**
 * One entry line.
 * - `home`: "Sat 09:15 · Work", yellow dot when unsorted, paperclip when it has a receipt (S-02 Recent).
 * - `list`: "Fuel · Work · 07:42" / "Unsorted · 11:30 [Personal]" (S-04).
 */
export function EntryRow({
  entry,
  category,
  currency,
  variant = 'list',
  divider,
  selecting,
  selected,
  onPress,
  onLongPress,
}: {
  entry: EntryListItem;
  category: CategoryRow | undefined;
  currency: Currency;
  variant?: 'home' | 'list';
  divider?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  const note = entry.note || t('common.noNote');
  const scopeLabel = entry.scope === 'work' ? t('common.work') : t('common.personal');
  const amount = signedAmount(entry.type, entry.amountMinor, currency);
  const amountColor = entry.type === 'income' ? 'incomeText' : 'expenseText';
  const catName = category?.name ?? t('common.unsorted');

  if (variant === 'home') {
    return (
      <ListRow
        divider={divider}
        onPress={onPress}
        accessibilityLabel={`${note}, ${amount}${category ? '' : `, ${t('common.unsorted')}`}`}
        left={<EntryAvatar category={category} />}
        title={note}
        subtitle={`${weekdayTime(entry.occurredAt)} · ${scopeLabel}`}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SourceBadge entry={entry} />
            {entry.receiptCount > 0 ? <Paperclip size={18} color={colors.textSecondary} /> : null}
            {!category ? <Dot /> : null}
            <Txt v="amount" c={amountColor} size={17}>
              {amount}
            </Txt>
          </View>
        }
      />
    );
  }

  const personal = entry.scope === 'personal';
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, divider && { borderTopWidth: 1, borderTopColor: colors.line }]}>
      {selecting ? <SelectCircle on={!!selected} /> : null}
      <View style={{ flex: 1 }}>
        <ListRow
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityLabel={`${note}, ${amount}, ${catName}, ${scopeLabel}${selecting ? (selected ? ', selected' : ', not selected') : ''}`}
          left={<EntryAvatar category={category} />}
          title={note}
          subtitle={personal ? `${catName} · ${timeLabel(entry.occurredAt)}` : `${catName} · ${scopeLabel} · ${timeLabel(entry.occurredAt)}`}
          right={
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt v="amount" c={amountColor} size={17}>
                {amount}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {personal ? <Tag kind="personal" label={t('common.personal')} /> : null}
                <SourceBadge entry={entry} />
                {entry.receiptCount > 0 ? <Paperclip size={16} color={colors.textSecondary} /> : null}
                {entry.receiptCount > 1 ? (
                  <Txt v="caption" c="textSecondary">
                    {t('homeV2.photoCount', { count: entry.receiptCount })}
                  </Txt>
                ) : null}
              </View>
            </View>
          }
        />
      </View>
    </View>
  );
}

/** "Recurring" (made by a template) / "Auto" (sorted by a rule) label, F-04. */
function SourceBadge({ entry }: { entry: { recurringId?: string | null; ruleId?: string | null } }) {
  if (entry.recurringId) return <Badge kind="recurring" label={t('homeV2.labelRecurring')} />;
  if (entry.ruleId) return <Badge kind="auto" label={t('homeV2.labelAuto')} />;
  return null;
}
