import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WorkHours } from '@/db/settingsRepo';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';
import { Card, Chip, ChipRow, Divider, Toggle, Txt } from '@/ui';
import { ChevronLeft } from '@/ui/icons';

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Work hours (P1-3, off by default): trips outside are still recorded, as Personal. */
export default function WorkHoursScreen() {
  const { settings, update } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wh = settings.workHours;
  const [pick, setPick] = useState<'startMin' | 'endMin' | null>(null);
  const save = (patch: Partial<WorkHours>) => update({ workHours: { ...wh, ...patch } });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ModalHeader icon={ChevronLeft} iconLabel={t('common.back')} onIcon={close} title={t('autoTrip.whTitle')} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{t('autoTrip.whOn')}</Txt>
            <Txt v="small" c="textSecondary">
              {t('autoTrip.workHoursSub')}
            </Txt>
          </View>
          <Toggle value={wh.on} onChange={(on) => save({ on })} label={t('autoTrip.whOn')} />
        </Card>
        {wh.on ? (
          <>
            <Txt v="label" c="textSecondary">
              {t('autoTrip.whDays').toUpperCase()}
            </Txt>
            <ChipRow>
              {DAYS.map((d) => (
                <Chip
                  key={d}
                  label={DAY_NAMES[d]}
                  state={wh.days.includes(d) ? 'on' : 'default'}
                  onPress={() => save({ days: wh.days.includes(d) ? wh.days.filter((x) => x !== d) : [...wh.days, d].sort() })}
                />
              ))}
            </ChipRow>
            <Card style={{ paddingVertical: 0 }}>
              {(['startMin', 'endMin'] as const).map((k, i) => (
                <View key={k}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${k === 'startMin' ? t('autoTrip.whFrom') : t('autoTrip.whTo')} ${hhmm(wh[k])}`}
                    onPress={() => setPick(k)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 }}>
                    <Txt v="body">{k === 'startMin' ? t('autoTrip.whFrom') : t('autoTrip.whTo')}</Txt>
                    <Txt v="h3">{hhmm(wh[k])}</Txt>
                  </Pressable>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
      {pick ? (
        <DateTimePicker
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          value={new Date(2000, 0, 1, Math.floor(wh[pick] / 60), wh[pick] % 60)}
          onChange={(e, d) => {
            const k = pick;
            setPick(null);
            if (e.type === 'set' && d) save({ [k]: d.getHours() * 60 + d.getMinutes() });
          }}
        />
      ) : null}
    </View>
  );
}
