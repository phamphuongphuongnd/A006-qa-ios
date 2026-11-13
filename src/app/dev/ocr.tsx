import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import { currencyOf } from '@/domain/types';
import { takePhotos } from '@/features/entries/photo';
import { planFill } from '@/features/ocr/fill';
import { parseReceipt } from '@/features/ocr/parseReceipt';
import { ocrAvailable, ocrDev } from '@/features/ocr/reader';
import { t } from '@/i18n';
import { usePro } from '@/state/pro';
import { useSettings } from '@/state/settings';
import { Button, Screen, Toggle, Txt } from '@/ui';

import { ReceiptOcr } from '../../../modules/receipt-ocr';

/**
 * S3 receipt OCR check on a real phone (dev builds only; release redirects home):
 * `adb shell am start -a android.intent.action.VIEW -d sundaysort://dev/ocr`.
 * "Read receipts without Pro" lets Quick capture / S-05 run OCR on a dev build without starting the one-time trial.
 */
export default function OcrProbe() {
  const { settings } = useSettings();
  const { status } = usePro();
  const [force, setForce] = useState(ocrDev.forceOn);
  const [log, setLog] = useState<string[]>([]);
  if (!__DEV__) return <Redirect href="/" />;
  const region = settings.region ?? 'UK';
  const say = (s: string) => {
    console.log(`[ocr] ${s}`);
    setLog((l) => [s, ...l].slice(0, 60));
  };

  const read = (source: 'camera' | 'library') => async () => {
    const res = await takePhotos(source, 1);
    if (!res.ok) return say(`pick: ${res.reason}`);
    if (!ReceiptOcr) return say('module missing');
    const t0 = Date.now();
    try {
      const raw = await ReceiptOcr.recognize(res.uris[0]);
      const ms = Date.now() - t0;
      const r = parseReceipt(raw, region);
      const plan = planFill({ amountMinor: 0, note: '', at: null }, r, Date.now());
      say(
        [
          `--- ${ms} ms · ${raw.lines.length} lines · ${raw.width}×${raw.height}`,
          `amount ${r.amountMinor === null ? '—' : formatMoney(r.amountMinor, currencyOf(region))} (${r.confidence.amount.toFixed(2)})`,
          `merchant ${r.merchant ?? '—'} (${r.confidence.merchant.toFixed(2)})`,
          `date ${r.date ? new Date(r.date).toDateString() : '—'} ${r.minutes ?? ''} (${r.confidence.date.toFixed(2)})`,
          `fill ${JSON.stringify(plan)}`,
          ...raw.lines.map((l) => `  ${l.box ? `${l.box.y.toFixed(2)},${l.box.x.toFixed(2)}` : '—'} ${l.text}`),
        ].join('\n'),
      );
    } catch (e) {
      say(`recognize FAIL after ${Date.now() - t0} ms: ${String(e)}`);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Txt v="h2">{t('ocr.devTitle')}</Txt>
        <Txt v="small">
          Module: {ocrAvailable() ? 'ready' : 'missing'} · Pro: {status.kind} · region {region}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Toggle
            label="Read receipts without Pro (dev)"
            value={force}
            onChange={(v) => {
              ocrDev.forceOn = v;
              setForce(v);
            }}
          />
          <Txt style={{ flex: 1 }}>Read receipts without Pro (dev)</Txt>
        </View>
        <Button label="Read from camera" onPress={read('camera')} />
        <Button label="Read from library" variant="outline" onPress={read('library')} />
        {log.map((l, i) => (
          <Txt key={i} v="small" selectable style={{ fontFamily: 'monospace' }}>
            {l}
          </Txt>
        ))}
      </ScrollView>
    </Screen>
  );
}
