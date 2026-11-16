import { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

import { ModalHeader } from '@/features/trips/ModalHeader';
import { t } from '@/i18n';
import { router } from '@/services/router';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';
import { Button, Card, Txt } from '@/ui';
import { Check, ChevronLeft, Nfc } from '@/ui/icons';

export const NFC_TOGGLE_URL = 'sundaysort://trip/toggle';

type Phase = 'idle' | 'writing' | 'done' | 'failed' | 'unsupported' | 'off';

/** S-07g NFC tag (free, Q18): write a sticker that starts / ends a trip; iPhone uses a Shortcuts automation. */
export default function NfcTagScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const ios = Platform.OS === 'ios';
  const [phase, setPhase] = useState<Phase>(settings.nfcTagWritten ? 'done' : 'idle');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/miles'));

  useEffect(() => {
    if (ios) return;
    (async () => {
      const supported = await NfcManager.isSupported().catch(() => false);
      if (!supported) return setPhase('unsupported');
      await NfcManager.start().catch(() => {});
      if (!(await NfcManager.isEnabled().catch(() => true))) setPhase('off');
    })();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, [ios]);

  const write = async () => {
    setPhase('writing');
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(NFC_TOGGLE_URL)]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      update({ nfcTagWritten: true });
      setPhase('done');
    } catch {
      setPhase((p) => (p === 'writing' ? 'failed' : p));
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const cancel = () => {
    NfcManager.cancelTechnologyRequest().catch(() => {});
    setPhase('idle');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ModalHeader icon={ChevronLeft} iconLabel={t('common.back')} onIcon={close} title={t('autoTrip.nfcTitle')} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: phase === 'done' ? colors.incomeSoft : colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'done' ? <Check size={56} color={colors.incomeText} strokeWidth={2} /> : <Nfc size={56} color={colors.text} strokeWidth={1.6} />}
          </View>
        </View>
        <Txt v="body" center>
          {t('autoTrip.nfcIntro')}
        </Txt>

        {ios ? (
          <Card style={{ gap: 10 }}>
            <Txt v="body">{t('autoTrip.nfcIosIntro')}</Txt>
            {[t('autoTrip.nfcIos1'), t('autoTrip.nfcIos2'), t('autoTrip.nfcIos3'), t('autoTrip.nfcIos4')].map((s, i) => (
              <Txt key={s} v="body">
                {i + 1}. {s}
              </Txt>
            ))}
            <Txt v="h3" selectable>
              {NFC_TOGGLE_URL}
            </Txt>
            <Button
              label={t('autoTrip.nfcCopy')}
              variant="outline"
              // No clipboard module in this build: the share sheet has "Copy".
              onPress={() => Share.share({ message: NFC_TOGGLE_URL }).catch(() => undefined)}
            />
          </Card>
        ) : phase === 'unsupported' ? (
          <Card variant="warn">
            <Txt v="body">{t('autoTrip.nfcNoNfc')}</Txt>
          </Card>
        ) : phase === 'off' ? (
          <Card variant="warn" style={{ gap: 10 }}>
            <Txt v="body">{t('autoTrip.nfcOff')}</Txt>
            <Button
              label={t('autoTrip.nfcOpenSettings')}
              variant="outline"
              onPress={async () => {
                await NfcManager.goToNfcSetting().catch(() => false);
                setPhase('idle');
              }}
            />
          </Card>
        ) : phase === 'writing' ? (
          <Card style={{ gap: 12, alignItems: 'center' }}>
            <Txt v="h3" center>
              {t('autoTrip.nfcHold')}
            </Txt>
            <Button label={t('autoTrip.nfcCancel')} variant="text" onPress={cancel} />
          </Card>
        ) : phase === 'done' ? (
          <Card style={{ gap: 6 }}>
            <Txt v="h3">{t('autoTrip.nfcReady')}</Txt>
            <Txt v="small" c="textSecondary">
              {t('autoTrip.nfcReadySub')}
            </Txt>
            <Button label={t('autoTrip.nfcWriteAnother')} variant="outline" onPress={write} />
          </Card>
        ) : (
          <>
            {phase === 'failed' ? (
              <Card variant="warn">
                <Txt v="body">{t('autoTrip.nfcFailed')}</Txt>
              </Card>
            ) : null}
            <Button label={t('autoTrip.nfcWrite')} full onPress={write} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
