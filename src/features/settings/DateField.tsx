import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';
import { Txt } from '@/ui';

/**
 * Labelled date or time value. Android opens the system dialog; iOS shows the picker inline under the field.
 */
export function DateField({
  label,
  value,
  display,
  mode = 'date',
  onChange,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: Date;
  /** Text shown in the field. */
  display: string;
  mode?: 'date' | 'time';
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors, dark } = useTheme();
  const [open, setOpen] = useState(false);

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode, is24Hour: true, minimumDate, maximumDate, onValueChange: (_, d) => onChange(d) });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Txt v="caption" c="textSecondary" style={{ fontFamily: fonts.bold }}>
        {label}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        onPress={press}
        style={{
          minHeight: 52,
          borderRadius: radius.input,
          borderWidth: 1.5,
          borderColor: open ? colors.primary : colors.lineStrong,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          justifyContent: 'center',
        }}>
        <Txt style={{ fontFamily: fonts.bold }}>{display}</Txt>
      </Pressable>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display={mode === 'date' ? 'inline' : 'spinner'}
          themeVariant={dark ? 'dark' : 'light'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_, d) => onChange(d)}
        />
      ) : null}
    </View>
  );
}
