import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { formatMoney } from '@/domain/money';
import { useNow } from '@/features/entries/useNow';
import { NavHeader } from '@/features/settings/ui';
import { daysLeft, listTrash, purgeTrash, restoreFromTrash, type TrashItem } from '@/features/trash/repo';
import { formatDay, formatDistance } from '@/features/trips/format';
import { deleteReceiptFiles } from '@/files/receipts';
import { t, tn } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Dialog, Group, Sheet, Txt, useSnackbar } from '@/ui';
import { Car, Receipt, RotateCcw, Trash2 } from '@/ui/icons';

/** S-21 Recently deleted (Q30, F-23): deleted entries and trips for 30 days — Restore / Delete now / Empty. */
export default function RecentlyDeletedScreen() {
  'use no memo';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings } = useSettings();
  const items = useLive(() => listTrash(db), [], ['trash']);
  const [open, setOpen] = useState<TrashItem | null>(null);
  const [askEmpty, setAskEmpty] = useState(false);
  const now = useNow(60_000);

  const left = (it: TrashItem) => {
    const d = daysLeft(it.deletedAt, now);
    return d <= 1 ? (d === 1 ? t('s6.trashDaysLeftOne') : t('s6.trashLastDay')) : tn('s6.trashDaysLeft', d);
  };
  const title = (it: TrashItem) =>
    it.kind === 'entry'
      ? `${it.label || t('s6.trashEntry')} · ${formatMoney(Math.abs(it.amountMinor ?? 0), it.currency ?? 'GBP')}`
      : `${it.label || t('s6.trashTrip')} · ${formatDistance(it.distanceM ?? 0, settings.distanceUnit)}`;
  const sub = (it: TrashItem) => `${formatDay(it.itemAt)} · ${t('s6.trashDeletedOn', { date: formatDay(it.deletedAt) })} · ${left(it)}`;

  const restore = (it: TrashItem) => {
    setOpen(null);
    snack({ message: restoreFromTrash(db, it.id) ? t('s6.restored') : t('s6.restoreGone'), above: 'none' });
  };
  const deleteNow = (it: TrashItem) => {
    setOpen(null);
    deleteReceiptFiles(purgeTrash(db, { ids: [it.id] }));
    snack({ message: t('s6.deletedForGood'), above: 'none' });
  };
  const emptyAll = () => {
    setAskEmpty(false);
    deleteReceiptFiles(purgeTrash(db));
    snack({ message: t('s6.deletedForGood'), above: 'none' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('s6.trashTitle')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <Txt c="textSecondary">{t('s6.trashIntro')}</Txt>
        {items.length === 0 ? (
          <Txt c="textSecondary">{t('s6.trashEmpty')}</Txt>
        ) : (
          <Group>
            {items.map((it) => {
              const Icon = it.kind === 'trip' ? Car : Receipt;
              const income = it.kind === 'entry' && (it.amountMinor ?? 0) > 0;
              return (
                <Pressable
                  key={it.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${title(it)}. ${sub(it)}`}
                  onPress={() => setOpen(it)}
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
                      backgroundColor: it.kind === 'trip' ? colors.surfaceAlt : income ? colors.incomeSoft : colors.expenseSoft,
                    }}>
                    <Icon size={20} color={it.kind === 'trip' ? colors.textSecondary : income ? colors.incomeText : colors.expenseText} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                      {title(it)}
                    </Txt>
                    <Txt v="small" c="textSecondary">
                      {sub(it)}
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </Group>
        )}
        {items.length > 0 ? (
          <Button label={t('s6.trashEmptyAll')} icon={Trash2} variant="outline" full onPress={() => setAskEmpty(true)} />
        ) : null}
      </ScrollView>

      <Sheet visible={open !== null} onClose={() => setOpen(null)} title={open ? title(open) : undefined}>
        {open ? (
          <View style={{ gap: 12 }}>
            <Txt c="textSecondary">{sub(open)}</Txt>
            <Button label={t('s6.restore')} icon={RotateCcw} full onPress={() => restore(open)} />
            <Button label={t('s6.deleteNow')} icon={Trash2} variant="outline" full onPress={() => deleteNow(open)} />
          </View>
        ) : null}
      </Sheet>
      <Dialog
        visible={askEmpty}
        title={t('s6.trashEmptyTitle')}
        body={tn('s6.trashEmptyBody', items.length)}
        onClose={() => setAskEmpty(false)}
        actions={[
          { label: t('common.cancel'), onPress: () => setAskEmpty(false) },
          { label: t('s6.trashEmptyAll'), variant: 'danger', onPress: emptyAll },
        ]}
      />
    </View>
  );
}
