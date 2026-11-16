import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import type { SavedTripRow } from '@/db/schema';
import { deleteSavedTrip, listSavedTrips, renameSavedTrip, restoreSavedTrip } from '@/features/savedTrips/repo';
import { NavHeader } from '@/features/settings/ui';
import { formatDistance } from '@/features/trips/format';
import { t, tn } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useLive } from '@/state/useLive';
import { fonts, GUTTER, useTheme } from '@/theme';
import { Button, Field, Group, Sheet, Txt, useSnackbar } from '@/ui';
import { ChevronRight, Repeat, Trash2 } from '@/ui/icons';

/**
 * Settings → Trips → Regular trips (Q31): rename / remove. From Add trip "See all" (`?pick=1`) a tap goes back to
 * Add trip filled from that trip.
 */
export default function RegularTripsScreen() {
  'use no memo';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings } = useSettings();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const rows = useLive(() => listSavedTrips(db), [], ['saved_trips']);
  const [open, setOpen] = useState<SavedTripRow | null>(null);
  const [name, setName] = useState('');
  const unit = settings.distanceUnit;

  const used = (r: SavedTripRow) => (r.useCount === 0 ? t('s6.regularNever') : tn('s6.regularUsed', r.useCount));
  const sub = (r: SavedTripRow) =>
    [formatDistance(r.distanceM, unit), r.roundTrip ? t('autoTrip.route.roundTag') : '', r.scope === 'personal' ? t('common.personal') : t('common.work'), used(r)]
      .filter(Boolean)
      .join(' · ');

  const onRow = (r: SavedTripRow) => {
    if (pick) {
      router.replace(`/trip/new?saved=${r.id}`);
      return;
    }
    setName(r.label);
    setOpen(r);
  };

  const remove = (r: SavedTripRow) => {
    setOpen(null);
    const row = deleteSavedTrip(db, r.id);
    snack({ message: t('s6.regularDeleted'), actionLabel: t('common.undo'), onAction: () => row && restoreSavedTrip(db, row), above: 'none' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('s6.regularTrips')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {rows.length === 0 ? (
          <Txt c="textSecondary">{t('s6.regularEmpty')}</Txt>
        ) : (
          <Group>
            {rows.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.label}. ${sub(r)}`}
                onPress={() => onRow(r)}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}>
                <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: r.scope === 'personal' ? colors.personalSoft : colors.workSoft }}>
                  <Repeat size={20} color={r.scope === 'personal' ? colors.personal : colors.work} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                    {r.label}
                  </Txt>
                  <Txt v="small" c="textSecondary">
                    {sub(r)}
                  </Txt>
                </View>
                <ChevronRight size={18} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Group>
        )}
      </ScrollView>

      <Sheet visible={open !== null} onClose={() => setOpen(null)} title={open?.label}>
        {open ? (
          <View style={{ gap: 12 }}>
            <Field label={t('s6.regularName')} value={name} onChangeText={setName} maxLength={60} />
            <Button
              label={t('s6.rename')}
              full
              disabled={name.trim() === '' || name.trim() === open.label}
              onPress={() => {
                renameSavedTrip(db, open.id, name);
                setOpen(null);
              }}
            />
            <Button label={t('s6.remove')} icon={Trash2} variant="dangerOutline" full onPress={() => remove(open)} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
