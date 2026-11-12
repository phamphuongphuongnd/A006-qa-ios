import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import { useTheme } from '@/theme';
import { Button, Sheet } from '@/ui';

type Mode = 'datetime' | 'time';

interface Req {
  value: Date;
  mode: Mode;
  title?: string;
  maximumDate?: Date;
  onPick: (d: Date) => void;
}

/**
 * Date/time picking. Android: the system date dialog then the time dialog. iOS: a sheet with the inline picker.
 * `const picker = useDateTimePicker(); picker.open({...}); return <>{...}{picker.element}</>`.
 */
export function useDateTimePicker() {
  const { dark } = useTheme();
  const [req, setReq] = useState<Req | null>(null);
  const [draft, setDraft] = useState<Date>(new Date());

  const open = useCallback((r: Req) => {
    if (Platform.OS === 'android') {
      const pickTime = (base: Date) =>
        DateTimePickerAndroid.open({
          value: base,
          mode: 'time',
          is24Hour: true,
          onValueChange: (_e, time) => r.onPick(time),
        });
      if (r.mode === 'time') pickTime(r.value);
      else
        DateTimePickerAndroid.open({
          value: r.value,
          mode: 'date',
          maximumDate: r.maximumDate,
          onValueChange: (_e, date) => {
            const merged = new Date(date);
            merged.setHours(r.value.getHours(), r.value.getMinutes(), 0, 0);
            pickTime(merged);
          },
        });
      return;
    }
    setDraft(r.value);
    setReq(r);
  }, []);

  const close = () => setReq(null);

  const element =
    Platform.OS === 'ios' && req ? (
      <Sheet
        visible
        onClose={close}
        title={req.title}
        footer={
          <Button
            label={t('common.done')}
            full
            onPress={() => {
              req.onPick(draft);
              close();
            }}
          />
        }>
        <DateTimePicker
          value={draft}
          mode={req.mode}
          display={req.mode === 'time' ? 'spinner' : 'inline'}
          maximumDate={req.maximumDate}
          themeVariant={dark ? 'dark' : 'light'}
          onValueChange={(_e, d) => setDraft(d)}
        />
      </Sheet>
    ) : null;

  return { open, element };
}
