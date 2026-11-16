import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isSamsung } from '@/features/trips/auto/native';
import { syncAutoDetection } from '@/features/trips/auto/runner';
import { ModalHeader } from '@/features/trips/ModalHeader';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useTheme } from '@/theme';
import { Button, Card, Txt } from '@/ui';
import { ChevronLeft } from '@/ui/icons';

const PACKAGE = 'com.phiotron.sundaysort';

/** S-07f Battery tips (Samsung wording on Samsung phones). */
export default function BatteryTipsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const samsung = isSamsung();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/trip/auto'));
  const open = async () => {
    try {
      await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DETAILS_SETTINGS', { data: `package:${PACKAGE}` });
    } catch {
      await Linking.openSettings();
    }
  };
  const tips = samsung ? [t('autoTrip.tip1'), t('autoTrip.tip2')] : [t('autoTrip.tipGeneric')];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ModalHeader icon={ChevronLeft} iconLabel={t('common.back')} onIcon={close} title={t('autoTrip.tipsTitle')} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        <Txt v="body">{samsung ? t('autoTrip.tipsIntro') : t('autoTrip.tipsIntroGeneric')}</Txt>
        {tips.map((tip, i) => (
          <Card key={tip} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="label">{i + 1}</Txt>
            </View>
            <Txt v="body" style={{ flex: 1 }}>
              {tip}
            </Txt>
          </Card>
        ))}
        <Button label={t('autoTrip.openBattery')} full onPress={open} />
        <Button
          label={t('autoTrip.doneIt')}
          variant="outline"
          full
          onPress={async () => {
            await syncAutoDetection();
            close();
          }}
        />
      </ScrollView>
    </View>
  );
}
