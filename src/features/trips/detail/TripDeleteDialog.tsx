import { formatMoney } from '@/domain/money';
import type { Currency, Minor } from '@/domain/types';
import { t } from '@/i18n';
import { Dialog } from '@/ui';

/** "Delete trip?" — with Parking & tolls on the trip (Q28) it also asks what happens to that expense. */
export function TripDeleteDialog({
  visible,
  parkingMinor,
  currency,
  onClose,
  onDelete,
}: {
  visible: boolean;
  parkingMinor: Minor;
  currency: Currency;
  onClose: () => void;
  onDelete: (deleteParking: boolean) => void;
}) {
  if (parkingMinor > 0) {
    return (
      <Dialog
        visible={visible}
        title={t('s6.deleteBothTitle', { amount: formatMoney(parkingMinor, currency) })}
        body={t('s6.deleteBothBody')}
        onClose={onClose}
        actions={[
          { label: t('common.cancel'), onPress: onClose },
          { label: t('s6.keepExpense'), variant: 'outline', onPress: () => onDelete(false) },
          { label: t('s6.deleteBoth'), variant: 'danger', onPress: () => onDelete(true) },
        ]}
      />
    );
  }
  return (
    <Dialog
      visible={visible}
      title={t('trip.deleteConfirm')}
      body={t('trip.deleteBody')}
      onClose={onClose}
      actions={[
        { label: t('common.cancel'), onPress: onClose },
        { label: t('common.delete'), variant: 'danger', onPress: () => onDelete(false) },
      ]}
    />
  );
}
