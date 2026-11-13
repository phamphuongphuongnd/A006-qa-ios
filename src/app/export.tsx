import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { taxYearOf } from '@/domain/taxYear';
import { ExportPanel } from '@/features/reports/ExportPanel';
import { PERIOD_MODES, periodFor, type PeriodMode } from '@/features/reports/period';
import { goBack, NavHeader } from '@/features/settings/ui';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import { GUTTER, useTheme } from '@/theme';
import { useSnackbar } from '@/ui';

/**
 * S-10 Export as a screen (from Settings, or a deep link). Reports opens the same panel in a bottom sheet.
 * Optional params: mode, year (tax-year start), start/end (custom, epoch ms).
 */
export default function ExportScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snack = useSnackbar();
  const { settings } = useSettings();
  const region = settings.region ?? 'UK';
  const p = useLocalSearchParams<{ mode?: string; year?: string; start?: string; end?: string }>();
  const mode: PeriodMode = PERIOD_MODES.includes(p.mode as PeriodMode) ? (p.mode as PeriodMode) : 'year';
  const year = Number(p.year) || taxYearOf(Number(p.start) || new Date().getTime(), region).startYear;
  const custom = mode === 'custom' && Number(p.start) && Number(p.end) ? { start: Number(p.start), end: Number(p.end) } : undefined;
  const initial = periodFor(region, year, custom ? 'custom' : mode === 'custom' ? 'year' : mode, custom, { mtd: settings.mtdPeriod });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <NavHeader title={t('export.title')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: insets.bottom + 24 }}>
        <ExportPanel
          initial={initial}
          region={region}
          showHeader={false}
          onClose={(s) => {
            goBack();
            if (s) snack({ message: s.message, tone: s.error ? 'error' : 'default', above: 'none' });
          }}
        />
      </ScrollView>
    </View>
  );
}
